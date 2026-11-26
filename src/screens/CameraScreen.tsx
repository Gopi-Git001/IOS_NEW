import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { warmScan } from '../lib/scanTransport';
import { usePrefs } from '../lib/prefs';
import { notify } from '../lib/confirm';
import { BlurryPhotoError, type LabelCameraHandle, type Photo, type ViewBox } from '../lib/photo';
import { markScan, noteScan, startScanTiming } from '../lib/scanTiming';
import { testPhoto, testPhotoEnabled } from '../lib/testPhoto';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Footer, Header, ProfileButton, Scrims, type Sheet } from '../components/Chrome';
import { Glass } from '../components/Glass';
import { FlashIcon } from '../components/Icons';
import { LabelCamera } from '../components/LabelCamera';
import { SmallMascot, useSmallMascotClearance } from '../components/SmallMascot';
import { brand, colors, fonts, mint } from '../theme';
import { freeScansLabel } from '../lib/guestTrial';
import { autoCaptureOn } from '../lib/autoCaptureGate';

const HINT = 'Fit the ingredient list in the panel';
const NO_FLASH = 'Flash not available on this camera';
const NO_FLASH_MS = 3000;

/** `active` is false while a result covers this screen: it stays mounted so the camera can keep running. */
type Props = { active: boolean; onCapture: (photo: Photo) => void; onOpenSheet: (sheet: Sheet) => void; tagline?: string; freeScans?: number; onSignIn?: () => void };

export function CameraScreen({ active, onCapture, onOpenSheet, tagline, freeScans, onSignIn }: Props) {
  const prefs = usePrefs();
  const shooting = useRef(false);
  useEffect(() => { if (active) warmScan(); }, [active]);
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<LabelCameraHandle>(null);
  const root = useRef<ComponentRef<typeof View>>(null);
  const frame = useRef<ComponentRef<typeof View>>(null);
  const [box, setBox] = useState<ViewBox | null>(null);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const mascotClearance = useSmallMascotClearance();
  const [noFlash, setNoFlash] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!noFlash) return;
    const timer = setTimeout(() => setNoFlash(false), NO_FLASH_MS);
    return () => clearTimeout(timer);
  }, [noFlash]);

  const onTorchSupport = (supported: boolean) => {
    setTorchSupported(supported);
    if (!supported) setTorch(false);
  };
  const onTorchFailed = () => {
    setTorch(false);
    setNoFlash(true);
  };

  const measureBox = () =>
    root.current?.measureInWindow((rootX, rootY, viewWidth, viewHeight) =>
      frame.current?.measureInWindow((x, y, width, height) => setBox({ x: x - rootX, y: y - rootY, width, height, viewWidth, viewHeight })),
    );

  if (!permission) return <View style={styles.fill} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.fill, styles.permission]}>
        <Text style={styles.permissionTitle}>Camera needed</Text>
        <Text style={styles.permissionText}>{brand.name} reads food and drink labels with your camera.</Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow camera</Text>
        </Pressable>
        {onSignIn && <Pressable onPress={onSignIn} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.permissionSignIn}>Sign in with Google first</Text>
        </Pressable>}
      </SafeAreaView>
    );
  }

  const shoot = async () => {
    const standIn = testPhoto();
    if (shooting.current || busy || !active || (!standIn && (!camera.current || !ready))) return;
    shooting.current = true;
    setBusy(true);
    startScanTiming();
    try {
      const photo = standIn ?? (await camera.current!.capture());
      markScan('captured');
      noteScan({ photo_px: `${photo.width}x${photo.height}` });
      if (Platform.OS !== 'web') noteScan({ capture_path: 'native' });
      // After the shot, so the buzz can't shake the phone while the photo is taken.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setTorch(false);
      onCapture(photo);
    } catch (e) {
      if (e instanceof BlurryPhotoError) notify('Photo is blurry', 'Hold the phone steady and tap again.');
      else notify('Could not take photo', 'Please try again.');
    } finally {
      shooting.current = false;
      setBusy(false);
    }
  };

  return (
    <View ref={root} style={styles.fill} pointerEvents={active ? 'auto' : 'none'} aria-hidden={!active}>
      <LabelCamera
        ref={camera}
        torch={torch}
        box={box}
        active={active}
        onReadyChange={setReady}
        onTorchSupport={onTorchSupport}
        onTorchFailed={onTorchFailed}
        autoCapture={autoCaptureOn({ pref: prefs.autoCapture, scansLeft: !onSignIn || (freeScans ?? 0) > 0, active, busy, ready })}
        onAutoCapture={shoot}
      />
      <Scrims bottom="mint" />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <Header
          tagline={tagline}
          brand={false}
          start={mascotClearance}
          right={
            <ProfileButton
              tone="mint"
              onOpen={onOpenSheet}
              leading={
                torchSupported ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() => setTorch((t) => !t)}
                    accessibilityRole="button"
                    accessibilityLabel={torch ? 'Turn flash off' : 'Turn flash on'}
                    style={[styles.flash, torch && styles.flashOn]}
                  >
                    <FlashIcon on={torch} size={20} color={torch ? mint.OKAY.deep : mint.ink} />
                  </Pressable>
                ) : undefined
              }
            />
          }
        />

        <View style={styles.middle} pointerEvents="none">
          {/* Website Mint scan frame: four white corner brackets, with a mint section pill naming it above. */}
          <View ref={frame} onLayout={measureBox} style={styles.frame}>
            <View style={styles.frameLabel}>
              <View style={styles.frameDot} />
              <Text style={styles.frameLabelText}>Ingredients</Text>
            </View>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.hint}>
            <Text style={styles.hintText}>{noFlash ? NO_FLASH : prefs.autoCapture && Platform.OS === 'web' ? 'Fit the ingredients · Hold steady' : HINT}</Text>
          </View>
        </View>

        <View style={styles.bottom}>
          {freeScans !== undefined && <View style={styles.trial}>
            <Text style={styles.hintText}>{freeScansLabel(freeScans)}</Text>
            <Pressable onPress={onSignIn} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.trialLink}>Sign in</Text>
            </Pressable>
          </View>}
          <Shutter onPress={shoot} disabled={!(ready || testPhotoEnabled) || busy} busy={busy} />
          <Footer ink />
        </View>
      </SafeAreaView>
      {/* A still frame, so nothing animates over the live camera. */}
      <SmallMascot still />
    </View>
  );
}

/** iOS-style shutter: a glass ring with a white rim around a white disc that springs down when pressed. */
function Shutter({ onPress, disabled, busy }: { onPress: () => void; disabled: boolean; busy: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) => Animated.spring(scale, { toValue, friction: 5, tension: 260, useNativeDriver: true }).start();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => spring(0.88)}
      onPressOut={() => spring(1)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Scan label"
      style={styles.shutterSlot}
    >
      <Glass interactive style={styles.shutter}>
        <Animated.View style={[styles.shutterInner, busy && styles.shutterBusy, { transform: [{ scale }] }]} />
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  // Sits on top of the live camera, so it must stay see-through.
  overlay: { flex: 1 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  frame: { width: '80%', maxWidth: 520, aspectRatio: 1.3 },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: mint.surface },
  cornerTL: { left: -2, top: -2, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 14 },
  cornerTR: { right: -2, top: -2, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 14 },
  cornerBL: { left: -2, bottom: -2, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 14 },
  cornerBR: { right: -2, bottom: -2, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 14 },
  frameLabel: {
    position: 'absolute',
    left: 0,
    top: -40,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: mint.pill,
  },
  frameDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: mint.pillDot },
  frameLabelText: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1.3, textTransform: 'uppercase', color: mint.pillInk },
  hint: {
    marginTop: 28,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: mint.surface,
    borderWidth: 1,
    borderColor: mint.border,
  },
  hintText: { fontFamily: fonts.semibold, fontSize: 15, color: mint.ink },
  flash: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  flashOn: { backgroundColor: mint.highlight },
  bottom: { alignItems: 'center', paddingTop: 8 },
  trial: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, marginBottom: 12, backgroundColor: mint.surface, borderWidth: 1, borderColor: mint.border },
  trialLink: { fontFamily: fonts.bold, fontSize: 14, color: mint.ink, textDecorationLine: 'underline' },
  shutterSlot: { marginBottom: 10 },
  shutter: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center', backgroundColor: mint.shutterRing, borderWidth: 3, borderColor: mint.surface },
  shutterInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: mint.surface },
  shutterBusy: { opacity: 0.55 },
  permission: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: colors.paper },
  permissionTitle: { fontFamily: fonts.black, fontSize: 30, letterSpacing: -1, color: colors.ink },
  permissionText: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 25, color: colors.inkMuted, textAlign: 'center' },
  permissionButton: {
    marginTop: 12,
    backgroundColor: 'rgba(244,246,251,0.92)',
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  permissionButtonText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onInk },
  permissionSignIn: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, marginTop: 12, textDecorationLine: 'underline' },
});
