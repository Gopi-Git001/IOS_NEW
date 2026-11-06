// Shared screen chrome: the top header, the profile button, the photo fades and the disclaimer footer.
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, User } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { type DimensionValue, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useProfile } from '../lib/account';
import { initials } from '../lib/display';
import { brand, colors, fonts } from '../theme';
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

/** The brand mark: the glass lens cube with a sugar crystal inside. Replaces the spelled-out name in headers. */
export function Wordmark({ size = 44 }: { ink?: boolean; size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.27 }]} accessible accessibilityRole="header" accessibilityLabel={brand.name}>
      <Image source={ICON} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

export function Header({ right, tagline, ink }: { right?: ReactNode; tagline?: string; ink?: boolean }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Wordmark ink={ink} />
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
      <LinearGradient colors={['#0B1220', '#06080D', '#0A0B12']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
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
  glow: { position: 'absolute', borderRadius: 999, ...(Platform.OS === 'web' ? ({ filter: 'blur(70px)' } as object) : {}) },
  glowTeal: { width: 360, height: 360, top: -90, left: -120, backgroundColor: 'rgba(31,181,168,0.30)' },
  glowIndigo: { width: 420, height: 420, top: '38%', right: -200, backgroundColor: 'rgba(76,99,230,0.26)' },
  glowAmber: { width: 300, height: 300, bottom: -110, left: -60, backgroundColor: 'rgba(245,158,11,0.18)' },
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
