import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { notify } from '../lib/confirm';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Footer, Header, ProfileButton, Scrims, type Sheet } from '../components/Chrome';
import { Glass } from '../components/Glass';
import { FlashIcon } from '../components/Icons';
import { brand, colors, fonts } from '../theme';

type Props = { onCapture: (photoUri: string) => void; onOpenSheet: (sheet: Sheet) => void; tagline?: string };

export function CameraScreen({ onCapture, onOpenSheet, tagline }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [torch, setTorch] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!permission) return <View style={styles.fill} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.fill, styles.permission]}>
        <Text style={styles.permissionTitle}>Camera needed</Text>
        <Text style={styles.permissionText}>{brand.name} reads food and drink labels with your camera.</Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow camera</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const shoot = async () => {
    if (!camera.current || !ready || busy) return;
    setBusy(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.7 });
      setTorch(false);
      onCapture(photo.uri);
    } catch {
      notify('Could not take photo', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.fill}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        onCameraReady={() => setReady(true)}
      />
      <Scrims />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <Header
          tagline={tagline}
          right={
            <ProfileButton
              onOpen={onOpenSheet}
              leading={
                <Pressable
                  hitSlop={8}
                  onPress={() => setTorch((t) => !t)}
                  accessibilityRole="button"
                  accessibilityLabel={torch ? 'Turn flash off' : 'Turn flash on'}
                  style={[styles.flash, torch && styles.flashOn]}
                >
                  <FlashIcon on={torch} size={20} color={torch ? '#FFD24A' : '#FFFFFF'} />
                </Pressable>
              }
            />
          }
        />

        <View style={styles.middle} pointerEvents="none">
          {/* The scan frame borrows the Nutrition Facts panel: heavy top bar, hairline sides, a medium base rule. */}
          <View style={styles.frame}>
            <View style={styles.frameTop} />
            <Text style={styles.frameLabel}>Ingredients</Text>
            <View style={styles.frameBase} />
          </View>
          <Glass style={styles.hint}>
            <Text style={styles.hintText}>Fit the ingredient list in the panel</Text>
          </Glass>
        </View>

        <View style={styles.bottom}>
          <Shutter onPress={shoot} disabled={!ready || busy} busy={busy} />
          <Footer />
        </View>
      </SafeAreaView>
    </View>
  );
}

/** iOS-style shutter: a glass ring around a white disc that springs down when pressed. */
function Shutter({ onPress, disabled, busy }: { onPress: () => void; disabled: boolean; busy: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) => Animated.spring(scale, { toValue, friction: 5, tension: 260, useNativeDriver: true }).start();
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
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
  frame: { width: '80%', aspectRatio: 1.3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.92)' },
  frameTop: { position: 'absolute', left: -1, right: -1, top: -1, height: 10, backgroundColor: '#FFFFFF' },
  frameBase: { position: 'absolute', left: -1, right: -1, bottom: -1, height: 5, backgroundColor: '#FFFFFF' },
  frameLabel: {
    position: 'absolute',
    left: 10,
    top: 16,
    fontFamily: fonts.black,
    fontSize: 20,
    letterSpacing: -0.4,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hint: { marginTop: 18, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  hintText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  flash: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  flashOn: { backgroundColor: 'rgba(251,191,36,0.22)' },
  bottom: { alignItems: 'center', paddingTop: 8 },
  shutterSlot: { marginBottom: 10 },
  shutter: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#FFFFFF' },
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
});
