// Shared screen chrome: the top header, the profile button, the photo fades and the disclaimer footer.
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, User } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { type DimensionValue, Pressable, StyleSheet, Text, View } from 'react-native';
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

/** The wordmark: heavy grotesque over a Nutrition Facts rule. `ink` sets it on paper instead of photos. */
export function Wordmark({ ink, size = 26 }: { ink?: boolean; size?: number }) {
  const color = ink ? colors.ink : colors.text;
  return (
    <View style={styles.wordmark} accessibilityRole="header" accessibilityLabel={brand.name}>
      <Text style={[styles.brand, { color, fontSize: size, lineHeight: size * 1.05, letterSpacing: -size * 0.04 }]}>{brand.name}</Text>
      <View style={[styles.brandRule, { backgroundColor: color, height: Math.max(3, Math.round(size / 7)) }]} />
    </View>
  );
}

export function Header({ right, tagline = brand.tagline, ink }: { right?: ReactNode; tagline?: string; ink?: boolean }) {
  return (
    <View style={styles.header}>
      <View>
        <Wordmark ink={ink} />
        <Text style={[styles.tagline, ink && styles.taglineInk]}>{tagline}</Text>
      </View>
      <View style={styles.actions}>{right}</View>
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
  brand: { fontFamily: fonts.black },
  wordmark: { alignSelf: 'flex-start' },
  brandRule: { marginTop: 3 },
  taglineInk: { color: colors.inkMuted, textShadowColor: 'transparent', textShadowRadius: 0 },
  tagline: {
    fontFamily: fonts.serifMedium,
    fontSize: 15,
    color: colors.text,
    marginTop: 4,
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
