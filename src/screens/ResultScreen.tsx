import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Character, CharacterView, type Mood, moodForVerdict } from '../components/Character';
import { CrystalBurst } from '../components/CrystalSwarm';
import { Header, ProfileButton, Scrims, type Sheet } from '../components/Chrome';
import { Glass } from '../components/Glass';
import { GlossaryCard, type Pick } from '../components/GlossaryCard';
import { SmallMascot, useSmallMascotClearance } from '../components/SmallMascot';
import { ResultSheet, VerdictContent } from '../components/VerdictPanel';
import { colors, fonts, mint } from '../theme';
import { MintSlab, useCrystalReducedMotion, useReducedMotionSetting } from '../components/CrystalVerdict';
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
  // The sheet runs to the bottom edge; this keeps the button and footer clear of the home indicator.
  const sheetInset = Math.max(insets.bottom, 8);
  // Leave room above the sheet for the header and the perched cube.
  const sheetMax = window.height - headerBottom - CUBE + PERCH - 8;
  const doneMood = (verdict: keyof typeof moodForVerdict): Mood => (gentle && verdict === 'BAD' ? 'okay' : moodForVerdict[verdict]);

  // Where the sheet rests, for the verdict burst (web): the crystals leave its edge and stay outside it.
  const sheetRect = sheetHeight > 0 ? { x: 0, y: window.height - sheetHeight, width: window.width, height: sheetHeight } : null;

  const action = { label: state.status === 'done' ? 'Scan another' : 'Try again', onPress: onScanAnother };

  return (
    <View style={styles.fill}>
      <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient pointerEvents="none" colors={[mint.paperClear, mint.photoFadeMid, mint.photoFadeEnd]} locations={[0, .3, 1]} style={StyleSheet.absoluteFill} />
      <Scrims topHeight="22%" bottom="none" />
      {state.status === 'reading' && <Shimmer height={window.height} />}
      {/* Only once a verdict is on screen: nothing is drawn while the label is being read, or for "No verdict". */}
      {state.status === 'done' && <CrystalBurst verdict={state.result.verdict} sheet={sheetRect} skip={state.listsPending} />}

      <SafeAreaView style={styles.fill} edges={['top']} pointerEvents="box-none">
        <View onLayout={(e) => setHeaderBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <Header
            tagline={tagline}
            brand={false}
            start={mascotClearance}
            right={<ProfileButton tone="mint" onOpen={onOpenSheet} />}
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
          {/* Siblings in one fragment: their keys must differ, or React warns about duplicate keys. Keyed by status so
              the sheet slides up and the cube hops in again when the result changes between a verdict and No verdict. */}
          <ResultSheet key={`sheet-${state.status}`} action={action} footer={<Text style={styles.footer}>Not medical advice · Doesn't check allergens</Text>} maxHeight={sheetMax} bottomInset={sheetInset} onHeight={setSheetHeight}>
            {state.status === 'done' ? (
              <VerdictContent result={state.result} listsPending={state.listsPending} onRetryLists={state.retryLists} onPick={setPick} />
            ) : (
              <>
                <View style={styles.errorHero}>
                  <Text style={styles.errorTitle}>No verdict</Text>
                  <MintSlab verdict={null} />
                </View>
                <View style={styles.errorRule} />
                <Text style={styles.errorText}>{state.message}</Text>
              </>
            )}
          </ResultSheet>
          {sheetHeight > 0 && (
            <HopCube
              key={`cube-${state.status}`}
              mood={state.status === 'done' ? doneMood(state.result.verdict) : 'okay'}
              bottom={sheetHeight - PERCH}
              right={10}
            />
          )}
        </>
      )}

      <SmallMascot still />
      <GlossaryCard pick={pick} onClose={() => setPick(null)} />
    </View>
  );
}

// Result 6: 350 ms after the sheet starts to rise, the cube hops in from the left in two arcs (80 pt, then
// 60 pt high) and lands on the sheet's top edge with a small settle; a ground shadow slides along the edge,
// shrinking while the cube is in the air. One value drives it all, on the native driver.
const HOP = { delay: 350, duration: 900, from: -240 };
// One arc as 9 heights (take-off to landing); the second arc drops its take-off, which is the first's landing.
const arc = (height: number) => Array.from({ length: 9 }, (_, i) => -height * Math.sin((Math.PI * i) / 8));
const HOP_IN = [0, ...[...Array(8).keys()].map((i) => (0.44 * (i + 1)) / 8), ...[...Array(8).keys()].map((i) => 0.44 + (0.4 * (i + 1)) / 8), 0.92, 1];
const HOP_Y = [...arc(80), ...arc(60).slice(1), -6, 0];
const HOP_X = HOP_IN.map((p) => (p >= 0.84 ? 0 : HOP.from + (-HOP.from * p) / 0.84));

/** The reaction cube on the sheet edge. Hops in once (Reduce Motion: it's simply there), then plays its mood. */
function HopCube({ mood, bottom, right }: { mood: Mood; bottom: number; right: number }) {
  const reduced = useReducedMotionSetting();
  const hop = useRef(new Animated.Value(0)).current;
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) { hop.setValue(1); setLanded(true); return; }
    const anim = Animated.sequence([
      Animated.delay(HOP.delay),
      Animated.timing(hop, { toValue: 1, duration: HOP.duration, easing: Easing.linear, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && setLanded(true));
    return () => anim.stop();
  }, [hop, reduced]);
  const translateX = hop.interpolate({ inputRange: HOP_IN, outputRange: HOP_X });
  const translateY = hop.interpolate({ inputRange: HOP_IN, outputRange: HOP_Y });
  const opacity = hop.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 1] });
  // Shadow: smallest at the top of each arc, full on each landing.
  const lift = hop.interpolate({ inputRange: HOP_IN, outputRange: HOP_Y.map((y) => 1 + y / 160) });
  return (
    <View style={[styles.cube, { bottom, right }]} pointerEvents="none">
      {!landed && (
        <Animated.View style={[styles.groundShadow, { opacity: Animated.multiply(opacity, lift), transform: [{ translateX }, { scaleX: lift }] }]} />
      )}
      <Animated.View style={{ opacity, transform: [{ translateX }, { translateY }] }}>
        <CharacterView mood={mood} size={CUBE} motion={landed && !reduced ? 'full' : 'still'} shadow={landed} skipEnter />
      </Animated.View>
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
  errorTitle: { flexShrink: 1, fontFamily: fonts.black, fontSize: 42, lineHeight: 48, color: mint.ink, letterSpacing: -1.5 },
  errorHero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  errorRule: { height: 1, backgroundColor: mint.ink, marginTop: 16, marginBottom: 10 },
  errorText: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 28, color: mint.ink },
  cube: { position: 'absolute', width: CUBE, height: CUBE },
  groundShadow: { position: 'absolute', width: CUBE * 0.5, left: CUBE * 0.25, bottom: CUBE * 0.02, height: 10, borderRadius: 5, backgroundColor: mint.cubeShadow },
  footer: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, color: mint.muted, textAlign: 'center', paddingVertical: 14, paddingHorizontal: 12 },
});
