import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Character, type Mood, moodForVerdict } from '../components/Character';
import { CrystalBurst } from '../components/CrystalSwarm';
import { Header, ProfileButton, Scrims, type Sheet } from '../components/Chrome';
import { Glass } from '../components/Glass';
import { GlossaryCard, type Pick } from '../components/GlossaryCard';
import { SmallMascot, useSmallMascotClearance } from '../components/SmallMascot';
import { ResultSheet, VerdictContent } from '../components/VerdictPanel';
import { colors, crystal, fonts } from '../theme';
import { CrystalSlab, useCrystalReducedMotion } from '../components/CrystalVerdict';
import type { ScanResult } from '../types';

const CUBE = 130;
const PERCH = 22; // how far the cube's feet sink below the sheet's top edge

export type ScanState =
  | { status: 'reading' }
  | { status: 'done'; result: ScanResult; listsPending?: boolean; retryLists?: () => void }
  | { status: 'error'; message: string };

type Props = {
  photoUri: string;
  state: ScanState;
  onScanAnother: () => void;
  onOpenSheet: (sheet: Sheet) => void;
  /** Gentle mode: for BAD, the character shows its calm reaction instead of crying. */
  gentle?: boolean;
  tagline?: string;
};

/** The captured photo frozen full screen. While reading, a light band sweeps it; then the result sheet rises. */
export function ResultScreen({ photoUri, state, onScanAnother, onOpenSheet, gentle, tagline }: Props) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [headerBottom, setHeaderBottom] = useState(insets.top + 60);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [pick, setPick] = useState<Pick>(null);
  const mascotClearance = useSmallMascotClearance();
  const sheetBottom = Math.max(insets.bottom, 8);
  // Leave room above the sheet for the header and the perched cube.
  const sheetMax = window.height - sheetBottom - headerBottom - CUBE + PERCH - 8;
  const doneMood = (verdict: keyof typeof moodForVerdict): Mood => (gentle && verdict === 'BAD' ? 'okay' : moodForVerdict[verdict]);

  // Where the sheet rests, for the verdict burst (web): the crystals leave its edge and stay outside it.
  const sheetWidth = Math.min(window.width * .96, 700);
  const sheetRect = sheetHeight > 0 ? { x: (window.width - sheetWidth) / 2, y: window.height - sheetBottom - sheetHeight, width: sheetWidth, height: sheetHeight } : null;

  const action = { label: state.status === 'done' ? 'Scan another' : 'Try again', onPress: onScanAnother };

  return (
    <View style={styles.fill}>
      <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient pointerEvents="none" colors={['#F4F2EB00', '#F4F2EB70', '#F4F2EBE8']} locations={[0, .3, 1]} style={StyleSheet.absoluteFill} />
      <Scrims topHeight="22%" />
      {state.status === 'reading' && <Shimmer height={window.height} />}
      {/* Only once a verdict is on screen: nothing is drawn while the label is being read, or for "No verdict". */}
      {state.status === 'done' && <CrystalBurst verdict={state.result.verdict} sheet={sheetRect} skip={state.listsPending} />}

      <SafeAreaView style={styles.fill} edges={['top']} pointerEvents="box-none">
        <View onLayout={(e) => setHeaderBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <Header
            tagline={tagline}
            brand={false}
            start={mascotClearance}
            right={<ProfileButton onOpen={onOpenSheet} />}
          />
        </View>
      </SafeAreaView>

      {state.status === 'reading' && (
        <>
          <View style={styles.pillSlot} pointerEvents="none">
            <Glass style={styles.pill}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.pillText}>Reading the label</Text>
            </Glass>
          </View>
          <Character mood="scanning" bottom={insets.bottom + 40} />
        </>
      )}

      {state.status !== 'reading' && (
        <>
          <ResultSheet key={state.status} action={action} footer={<Text style={styles.footer}>Not medical advice · Doesn't check allergens</Text>} maxHeight={sheetMax} bottom={sheetBottom} onHeight={setSheetHeight}>
            {state.status === 'done' ? (
              <VerdictContent result={state.result} listsPending={state.listsPending} onRetryLists={state.retryLists} onPick={setPick} />
            ) : (
              <>
                <View style={styles.errorHero}>
                  <Text style={styles.errorTitle}>No verdict</Text>
                  <CrystalSlab verdict={null} />
                </View>
                <View style={styles.errorRule} />
                <Text style={styles.errorText}>{state.message}</Text>
              </>
            )}
          </ResultSheet>
          {sheetHeight > 0 && (
            <Character
              mood={state.status === 'done' ? doneMood(state.result.verdict) : 'okay'}
              bottom={sheetBottom + sheetHeight - PERCH}
              size={CUBE}
              right={(window.width - Math.min(window.width * .96, 700)) / 2 + 10}
            />
          )}
        </>
      )}

      <SmallMascot still />
      <GlossaryCard pick={pick} onClose={() => setPick(null)} />
    </View>
  );
}

/** A soft band of light sweeping down the frozen photo, like the label is being read. */
function Shimmer({ height }: { height: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const reduced = useCrystalReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(y, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [y, reduced]);
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [-160, height] });
  return (
    <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateY }] }]}>
      <LinearGradient
        colors={['rgba(243,241,236,0)', 'rgba(243,241,236,0.22)', 'rgba(255,255,255,0.55)', 'rgba(243,241,236,0.22)', 'rgba(243,241,236,0)']}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  shimmer: { position: 'absolute', left: 0, right: 0, top: 0, height: 160 },
  pillSlot: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, height: 54, borderRadius: 27 },
  pillText: { fontFamily: fonts.serifMedium, fontSize: 19, color: colors.text },
  errorTitle: { fontFamily: fonts.black, fontSize: 42, lineHeight: 48, color: crystal.ink, letterSpacing: -1.5, textShadowColor: '#14161322', textShadowRadius: 6, textShadowOffset: { width: 0, height: 3 } },
  errorHero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  errorRule: { height: 1, backgroundColor: crystal.ink, marginTop: 16, marginBottom: 10 },
  errorText: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 28, color: crystal.ink },
  footer: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, color: crystal.muted, textAlign: 'center', paddingVertical: 14, paddingHorizontal: 12 },
});
