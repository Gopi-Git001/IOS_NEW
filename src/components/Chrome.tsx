// Shared screen chrome: the top header, the profile button, the photo fades and the disclaimer footer.
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, User } from 'lucide-react-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, type DimensionValue, Easing, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useProfile } from '../lib/account';
import { initials } from '../lib/display';
import type { Verdict } from '../types';
import { ambient, brand, colors, fonts } from '../theme';
import { Glass } from './Glass';

export type Sheet = 'profile' | 'menu';

/**
 * Top-right glass capsule: optional extra controls (the flash), the avatar (opens Profile) and ☰ (opens the Menu).
 * Shows the user's initials when they have a name.
 */
export function ProfileButton({ onOpen, leading }: { onOpen: (sheet: Sheet) => void; leading?: ReactNode }) {
  const letters = initials(useProfile().displayName);
  return (
    <Glass style={styles.profile}>
      {leading}
      <Pressable
        onPress={() => onOpen('profile')}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 2 }}
        accessibilityRole="button"
        accessibilityLabel="Profile"
        style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
      >
        {letters ? <Text style={styles.avatarText}>{letters}</Text> : <User size={16} color={colors.text} strokeWidth={2.25} />}
      </Pressable>
      <Pressable
        onPress={() => onOpen('menu')}
        hitSlop={{ top: 6, bottom: 6, left: 2, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        style={({ pressed }) => [styles.menu, pressed && styles.pressed]}
      >
        <Menu size={20} color={colors.text} strokeWidth={2.25} />
      </Pressable>
    </Glass>
  );
}

const ICON = require('../../assets/brand-icon.png');

export type MarkState = 'idle' | 'scanning' | Verdict;

const MARK_GLOW: Record<Verdict, string> = { CLEAN: colors.clean, OKAY: colors.okay, BAD: colors.bad };

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

/**
 * The brand mark: the clear glass cube with refracted label lines. Replaces the spelled-out name in headers.
 * Idle: a slow float and a light sweep across the glass. Scanning: a quick pulse and a faster sweep.
 * Verdict: a small pop and a glow in the verdict color. Static when the system asks for reduced motion.
 */
export function Wordmark({ size = 44, state = 'idle' }: { ink?: boolean; size?: number; state?: MarkState }) {
  const reduced = useReducedMotion();
  const float = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const scanning = state === 'scanning';
  const verdict = state !== 'idle' && state !== 'scanning' ? state : null;

  useEffect(() => {
    if (reduced) return;
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(sweep, { toValue: 1, duration: scanning ? 900 : 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.delay(scanning ? 150 : 3200),
          Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    ];
    if (scanning) {
      loops.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        ),
      );
    } else pulse.setValue(0);
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [reduced, scanning, float, sweep, pulse]);

  useEffect(() => {
    if (!verdict || reduced) return;
    pop.setValue(0.82);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  }, [verdict, reduced, pop]);

  const radius = size * 0.27;
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] });
  const scale = Animated.multiply(pop, pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }));
  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-size * 1.2, size * 1.2] });
  const glow = verdict ? MARK_GLOW[verdict] : scanning ? 'rgba(120,230,220,0.9)' : null;

  return (
    <Animated.View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: radius, transform: [{ translateY }, { scale }] },
        glow ? ({ borderColor: glow, boxShadow: `0px 0px 16px ${glow}, inset 0px 1px 0px rgba(255,255,255,0.4)` } as object) : null,
      ]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={brand.name}
    >
      <Image source={ICON} style={{ width: size, height: size }} resizeMode="cover" />
      {!reduced && (
        <Animated.View pointerEvents="none" style={[styles.sweep, { width: size * 0.5, height: size * 2, top: -size / 2, transform: [{ translateX }, { rotate: '20deg' }] }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

/**
 * `brand={false}` hides the cube mark (camera and result screens); the tagline and right controls stay.
 * `start` moves the left-hand side right, to clear the small mascot drawn in that corner.
 */
export function Header({ right, tagline, ink, mark, brand = true, start = 0 }: { right?: ReactNode; tagline?: string; ink?: boolean; mark?: MarkState; brand?: boolean; start?: number }) {
  return (
    <View style={styles.header}>
      <View style={[styles.brandRow, start > 0 && { marginLeft: start }]}>
        {brand ? <Wordmark ink={ink} state={mark} /> : null}
        {tagline ? <Text style={[styles.tagline, ink && styles.taglineInk]}>{tagline}</Text> : null}
      </View>
      <View style={styles.actions}>{right}</View>
    </View>
  );
}

/**
 * The ambient backdrop behind every non-camera screen: a deep base with three soft pools of light
 * (teal, indigo, amber, taken from the icon) for the glass sheets to refract.
 */
export function Ambient() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={ambient.base as [string, string, string]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.glow, styles.glowTeal]} />
      <View style={[styles.glow, styles.glowIndigo]} />
      <View style={[styles.glow, styles.glowAmber]} />
    </View>
  );
}

export function Footer({ ink }: { ink?: boolean }) {
  return <Text style={[styles.footer, ink && { color: colors.inkFaint }]}>Not medical advice · Doesn't check allergens</Text>;
}

/** Dark gradients at the top and bottom so white text stays readable over any photo. */
export function Scrims({ topHeight = 170 }: { topHeight?: DimensionValue }) {
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
        style={[styles.scrim, { top: 0, height: topHeight }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(11,11,15,0)', 'rgba(11,11,15,0.92)']}
        style={[styles.scrim, { bottom: 0, height: 260 }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Pinned with explicit edges: on web, `top: undefined` doesn't clear absoluteFill's `top: 0`.
  scrim: { position: 'absolute', left: 0, right: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingRight: 12,
    paddingTop: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  mark: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    boxShadow: 'inset 0px 1px 0px rgba(255,255,255,0.4), 0px 6px 18px rgba(0,0,0,0.4)',
  },
  sweep: { position: 'absolute', left: '25%' },
  glow: { position: 'absolute', borderRadius: 999, ...(Platform.OS === 'web' ? ({ filter: 'blur(70px)' } as object) : {}) },
  glowTeal: { width: 360, height: 360, top: -90, left: -120, backgroundColor: ambient.glowTeal },
  glowIndigo: { width: 420, height: 420, top: '38%', right: -200, backgroundColor: ambient.glowIndigo },
  glowAmber: { width: 300, height: 300, bottom: -110, left: -60, backgroundColor: ambient.glowAmber },
  taglineInk: { color: colors.inkMuted, textShadowColor: 'transparent', textShadowRadius: 0, marginTop: 0 },
  tagline: {
    fontFamily: fonts.serifMedium,
    fontSize: 15,
    color: colors.text,
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  profile: {
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 4,
    gap: 2,
  },
  menu: { height: 38, paddingLeft: 8, paddingRight: 8, justifyContent: 'center' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 12, color: colors.text },
  pressed: { opacity: 0.7 },
  footer: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
    paddingVertical: 14,
  },
});
