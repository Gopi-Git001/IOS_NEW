import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { notify } from '../lib/confirm';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Footer, Header, ProfileButton, Scrims, type Sheet } from '../components/Chrome';
import { Glass } from '../components/Glass';
import { FlashIcon } from '../components/Icons';
import { colors, fonts } from '../theme';

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
        <Text style={styles.permissionText}>Sugar Hunter reads food and drink labels with your camera.</Text>
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
                  <FlashIcon on={torch} size={20} color={torch ? colors.bad : "#FFFFFF"} />
                </Pressable>
              }
            />
          }
        />

        <View style={styles.middle} pointerEvents="none">
          <View style={styles.frame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <Glass variant="clear" style={styles.hint}>
            <Text style={styles.hintText}>Fit the ingredient list here</Text>
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

const BRACKET = 34;
const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  // Sits on top of the live camera, so it must stay see-through.
  overlay: { flex: 1 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  frame: { width: '74%', aspectRatio: 1.45 },
  // Rounded corner brackets, like the iOS document scanner.
  corner: { position: 'absolute', width: BRACKET, height: BRACKET, borderColor: '#FFFFFF' },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 20 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 20 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 20 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 20 },
  hint: { marginTop: 18, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  hintText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  flash: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  flashOn: { backgroundColor: 'rgba(251,191,36,0.22)' },
  bottom: { alignItems: 'center', paddingTop: 8 },
  shutterSlot: { marginBottom: 10 },
  shutter: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#FFFFFF' },
  shutterBusy: { opacity: 0.55 },
  permission: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  permissionTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  permissionText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  permissionButton: {
    marginTop: 12,
    backgroundColor: colors.clean,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  permissionButtonText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.background },
});
