import { BlurTargetView, BlurView } from 'expo-blur';
import { type ComponentRef, type RefObject, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Character, characterSize, type Mood, moodForVerdict } from '../components/Character';
import { Footer, Header, ProfileButton, Scrims, type Sheet } from '../components/Chrome';
import { CameraIcon } from '../components/Icons';
import { VerdictPanel, verdictColor } from '../components/VerdictPanel';
import { colors, fonts } from '../theme';
import type { ScanResult } from '../types';

const BUTTON_HEIGHT = 66;
const FOOTER_HEIGHT = 46;
const PANEL_GAP = 8; // between the panel and the header above / the character below

export type ScanState =
  | { status: 'reading' }
  | { status: 'done'; result: ScanResult; listsPending?: boolean }
  | { status: 'error'; message: string };

type Props = {
  photoUri: string;
  state: ScanState;
  onScanAnother: () => void;
  onOpenSheet: (sheet: Sheet) => void;
  /** Gentle mode: for UGLY, the character shows its calm reaction instead of crying. */
  gentle?: boolean;
  tagline?: string;
};

/** The captured photo frozen full screen, with the verdict panel and character on top. */
export function ResultScreen({ photoUri, state, onScanAnother, onOpenSheet, gentle, tagline }: Props) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [headerBottom, setHeaderBottom] = useState(insets.top + 56);
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const bottomBar = insets.bottom + FOOTER_HEIGHT + BUTTON_HEIGHT;
  const buttonColor = state.status === 'done' ? verdictColor[state.result.verdict] : '#FFFFFF';
  const buttonInk = state.status === 'done' && state.result.verdict === 'UGLY' ? '#FFFFFF' : colors.background;
  const panelTop = headerBottom + PANEL_GAP;
  const characterTop = window.height - bottomBar - characterSize(window.width);
  const doneMood = (verdict: keyof typeof moodForVerdict): Mood => (gentle && verdict === 'UGLY' ? 'bad' : moodForVerdict[verdict]);

  return (
    <View style={styles.fill}>
      <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill}>
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </BlurTargetView>
      <Scrims topHeight="22%" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View onLayout={(e) => setHeaderBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <Header tagline={tagline} right={<ProfileButton onOpen={onOpenSheet} />} />
        </View>
        <View style={styles.fill} />
        {state.status !== 'reading' && (
          <View>
            <Pressable
              onPress={onScanAnother}
              style={({ pressed }) => [styles.button, { backgroundColor: buttonColor }, pressed && styles.buttonPressed]}
            >
              <CameraIcon color={buttonInk} size={26} />
              <Text style={[styles.buttonText, { color: buttonInk }]}>
                {state.status === 'error' ? 'Try again' : 'Scan another'}
              </Text>
            </Pressable>
            <Footer />
          </View>
        )}
      </SafeAreaView>

      {state.status === 'done' && (
        <>
          <View style={[styles.panelSlot, { top: panelTop }]} pointerEvents="box-none">
            <VerdictPanel result={state.result} listsPending={state.listsPending} maxHeight={characterTop - PANEL_GAP - panelTop} />
          </View>
          <Character mood={doneMood(state.result.verdict)} bottom={bottomBar} />
        </>
      )}
      {state.status === 'reading' && (
        <>
          <GlassPill blurTarget={blurTarget}>
            <ActivityIndicator size="large" color="#60A5FA" />
            <View style={styles.pillDivider} />
            <Text style={styles.pillText}>Reading the label...</Text>
          </GlassPill>
          <Character mood="scanning" bottom={insets.bottom + 40} />
        </>
      )}
      {state.status === 'error' && (
        <>
          <GlassPill blurTarget={blurTarget} wide>
            <Text style={[styles.pillText, styles.errorText]}>{state.message}</Text>
          </GlassPill>
          <Character mood="bad" bottom={bottomBar} />
        </>
      )}
    </View>
  );
}

function GlassPill({ children, blurTarget, wide }: { children: React.ReactNode; blurTarget: RefObject<ComponentRef<typeof View> | null>; wide?: boolean }) {
  return (
    <View style={styles.pillSlot} pointerEvents="none">
      <View style={[styles.pill, wide && styles.pillWide]}>
        <BlurView intensity={40} tint="dark" blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" style={StyleSheet.absoluteFill} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  panelSlot: { position: 'absolute', right: 12, width: '58%' },
  button: {
    height: BUTTON_HEIGHT,
    marginHorizontal: 20,
    borderRadius: BUTTON_HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonText: { fontFamily: fonts.semibold, fontSize: 19 },
  pillSlot: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 26,
    height: 84,
    borderRadius: 42,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(60,60,66,0.6)',
  },
  pillWide: { height: undefined, paddingVertical: 20, borderRadius: 28, marginHorizontal: 24 },
  pillDivider: { width: 1.5, height: 46, backgroundColor: 'rgba(255,255,255,0.4)' },
  pillText: { fontFamily: fonts.semibold, fontSize: 19, color: colors.text },
  errorText: { flexShrink: 1, textAlign: 'center', fontSize: 17, lineHeight: 24 },
});
