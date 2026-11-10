import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useId, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';
import { crystal, fonts } from '../theme';
import type { Verdict } from '../types';

/** A shared accessibility preference, with cleanup on native and web. */
export function useCrystalReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return reduced;
}

/** A thick rectangular glass sheet, never a faceted gem. Works without web CSS. */
export function CrystalSlab({ verdict, compact = false }: { verdict: Verdict | null; compact?: boolean }) {
  const material = verdict ? crystal[verdict] : { tint: '#B7BDB1', deep: crystal.muted };
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.object, compact && styles.compactObject]}>
      <View style={[styles.caustic, { backgroundColor: material.tint }]} />
      <View style={[styles.edge, { backgroundColor: material.deep }, compact && styles.compactEdge]}>
        <LinearGradient colors={[compact ? material.deep : material.tint, material.deep]} start={{ x: 0, y: 0 }} end={{ x: .65, y: 1 }} style={[styles.slab, compact && styles.compactSlab]}>
          <View style={styles.innerRim} />
          <LinearGradient pointerEvents="none" colors={[compact ? '#FFFFFF33' : '#FFFFFF55', '#FFFFFF00', compact ? '#FFFFFF11' : '#FFFFFF28', '#FFFFFF00']} locations={[0, .32, .5, 1]} style={StyleSheet.absoluteFill} />
          <View style={[styles.band, compact && styles.compactLight]} />
          <View style={[styles.streak, compact && styles.compactLight]} />
          {!compact && <Text style={styles.label}>{verdict ? 'VERDICT' : 'LABEL'}</Text>}
          <Text style={[styles.slabWord, compact && styles.compactWord]} numberOfLines={1} adjustsFontSizeToFit>{verdict ?? '—'}</Text>
          <View style={styles.glint} />
        </LinearGradient>
      </View>
    </View>
  );
}

/** Glossy ink, a fading mirror and a small full-stop bead beside the coloured slab. */
export function CrystalVerdict({ verdict }: { verdict: Verdict }) {
  const id = useId().replace(/:/g, '');
  const reduced = useCrystalReducedMotion();
  const shine = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(2200),
      Animated.timing(shine, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduced, shine]);
  return (
    <View style={styles.hero} accessible accessibilityRole="header" accessibilityLabel={verdict}>
      <View style={styles.type}>
        <Svg width="100%" height={130} viewBox="0 0 340 160" preserveAspectRatio="xMinYMid meet" accessible={false} aria-hidden>
          <Defs>
            <SvgGradient id={`${id}ink`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#777A71" /><Stop offset=".4" stopColor="#272923" /><Stop offset=".45" stopColor="#020302" /><Stop offset="1" stopColor="#24271F" />
            </SvgGradient>
            <SvgGradient id={`${id}mirror`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={crystal.paper} stopOpacity="0" /><Stop offset="1" stopColor="#30362A" stopOpacity=".18" />
            </SvgGradient>
          </Defs>
          <SvgText x="0" y="94" fontFamily={fonts.black} fontWeight="900" fontSize="87" letterSpacing="-5" fill={`url(#${id}ink)`}>{verdict}</SvgText>
          <SvgText x="0" y="94" transform="translate(0 198) scale(1 -1)" fontFamily={fonts.black} fontWeight="900" fontSize="87" letterSpacing="-5" fill={`url(#${id}mirror)`}>{verdict}</SvgText>
        </Svg>
        {!reduced && <Animated.View pointerEvents="none" style={[styles.sweep, { opacity: .32, transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-100, 340] }) }, { rotate: '18deg' }] }]}>
          <LinearGradient colors={['#FFFFFF00', '#FFFFFF99', '#FFFFFF00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>}
        <LinearGradient colors={['#FFFFFF', crystal[verdict].tint, crystal[verdict].deep]} start={{ x: .1, y: 0 }} end={{ x: .8, y: 1 }} style={styles.bead} />
      </View>
      <CrystalSlab verdict={verdict} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 8, minHeight: 146 },
  type: { flex: 1, height: 138, overflow: 'hidden', justifyContent: 'center', paddingRight: 16 },
  sweep: { position: 'absolute', width: 30, top: 18, height: 78 },
  bead: { position: 'absolute', right: 3, top: 74, width: 15, height: 15, borderRadius: 8, boxShadow: '0px 4px 5px #24271F30' },
  object: { width: 96, height: 144, paddingRight: 6, paddingBottom: 14 },
  caustic: { position: 'absolute', left: 3, right: 0, bottom: 1, height: 11, opacity: .2, borderRadius: 50, boxShadow: '0px 0px 16px #717C5A33' },
  edge: { flex: 1, borderRadius: 9, paddingRight: 4, paddingBottom: 4, transform: [{ perspective: 600 }, { rotateY: '-14deg' }, { rotateZ: '3deg' }], boxShadow: '4px 9px 12px #24271F2B' },
  slab: { flex: 1, overflow: 'hidden', borderRadius: 7, borderWidth: 1, borderColor: '#FFFFFF88', padding: 9, justifyContent: 'space-between' },
  innerRim: { position: 'absolute', top: 3, bottom: 3, left: 3, right: 3, borderWidth: 1, borderColor: '#FFFFFF44', borderRadius: 5 },
  label: { fontFamily: fonts.bold, color: '#FFFFFF', fontSize: 8, letterSpacing: 1, textShadowColor: '#00000099', textShadowRadius: 3 },
  slabWord: { fontFamily: fonts.black, color: '#FFFFFF', fontSize: 18, letterSpacing: -1, textShadowColor: '#00000066', textShadowRadius: 4 },
  band: { position: 'absolute', width: 34, height: 240, top: -40, left: 37, transform: [{ rotate: '28deg' }], backgroundColor: '#FFFFFF20' },
  streak: { position: 'absolute', width: 5, height: 240, top: -35, left: 74, transform: [{ rotate: '28deg' }], backgroundColor: '#FFFFFF35' },
  glint: { position: 'absolute', top: 4, right: 5, width: 2, height: 12, backgroundColor: '#FFFFFFBB', transform: [{ rotate: '35deg' }] },
  compactObject: { width: 58, height: 36, paddingBottom: 3, paddingRight: 3 },
  compactEdge: { borderRadius: 5, paddingRight: 2, paddingBottom: 2 },
  compactSlab: { padding: 5, justifyContent: 'center' },
  compactLight: { opacity: .25 },
  compactWord: { fontSize: 10, letterSpacing: 0 },
});
