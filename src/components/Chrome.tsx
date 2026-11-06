// Shared screen chrome: the top header, the profile button, the photo fades and the disclaimer footer.
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, User } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { type DimensionValue, Pressable, StyleSheet, Text, View } from 'react-native';
import { useProfile } from '../lib/account';
import { initials } from '../lib/display';
import { colors, fonts } from '../theme';

export type Sheet = 'profile' | 'menu';

/** Top-right pill: the avatar opens Profile, ☰ opens the Menu. Shows the user's initials when they have a name. */
export function ProfileButton({ onOpen }: { onOpen: (sheet: Sheet) => void }) {
  const letters = initials(useProfile().displayName);
  return (
    <View style={styles.profile}>
      <Pressable
        onPress={() => onOpen('profile')}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 2 }}
        accessibilityRole="button"
        accessibilityLabel="Profile"
        style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
      >
        {letters ? <Text style={styles.avatarText}>{letters}</Text> : <User size={16} color={colors.cardText} strokeWidth={2.25} />}
      </Pressable>
      <Pressable
        onPress={() => onOpen('menu')}
        hitSlop={{ top: 6, bottom: 6, left: 2, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        style={({ pressed }) => [styles.menu, pressed && styles.pressed]}
      >
        <Menu size={20} color={colors.cardText} strokeWidth={2.25} />
      </Pressable>
    </View>
  );
}

export function Header({ right, tagline = 'Scan. Know. Choose better.' }: { right?: ReactNode; tagline?: string }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>Sugar Hunter</Text>
        <Text style={styles.tagline}>{tagline}</Text>
      </View>
      <View style={styles.actions}>{right}</View>
    </View>
  );
}

export function Footer() {
  return <Text style={styles.footer}>Not medical advice · Doesn't check allergens</Text>;
}

/** Dark gradients at the top and bottom so white text stays readable over any photo. */
export function Scrims({ topHeight = 170 }: { topHeight?: DimensionValue }) {
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
        style={[StyleSheet.absoluteFill, { bottom: undefined, height: topHeight }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(11,11,15,0)', 'rgba(11,11,15,0.92)']}
        style={[StyleSheet.absoluteFill, { top: undefined, height: 260 }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingRight: 12,
    paddingTop: 8,
  },
  brand: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, letterSpacing: -0.3 },
  tagline: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  profile: {
    height: 40,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 4,
  },
  menu: { height: 38, paddingLeft: 8, paddingRight: 8, justifyContent: 'center' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 12, color: colors.cardText },
  pressed: { opacity: 0.7 },
  footer: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textFaint,
    textAlign: 'center',
    paddingVertical: 14,
  },
});
