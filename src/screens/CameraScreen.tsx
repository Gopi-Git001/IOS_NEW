import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { notify } from '../lib/confirm';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Footer, Header, ProfileButton, Scrims, type Sheet } from '../components/Chrome';
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
            <>
              <Pressable hitSlop={12} onPress={() => setTorch((t) => !t)} accessibilityLabel="Toggle flash">
                <FlashIcon on={torch} />
              </Pressable>
              <ProfileButton onOpen={onOpenSheet} />
            </>
          }
        />

        <View style={styles.middle} pointerEvents="none">
          <View style={styles.frame}>
            <Text style={styles.frameLabel}>Fit the ingredient list here</Text>
          </View>
        </View>

        <View style={styles.bottom}>
          <Pressable
            onPress={shoot}
            disabled={!ready || busy}
            accessibilityLabel="Scan label"
            style={({ pressed }) => [styles.shutter, (pressed || busy) && styles.shutterPressed]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <Footer />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  // Sits on top of the live camera, so it must stay see-through.
  overlay: { flex: 1 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  frame: {
    width: '68%',
    aspectRatio: 1.7,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 14,
  },
  frameLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
  bottom: { alignItems: 'center', paddingTop: 8 },
  shutter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  shutterPressed: { opacity: 0.6, transform: [{ scale: 0.95 }] },
  shutterInner: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFFFFF' },
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
