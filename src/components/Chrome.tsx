// Shared screen chrome: the top header, the bottom fade and the disclaimer footer.
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { deleteAccount } from '../lib/api';
import { isConfigured, supabase } from '../lib/supabase';
import { colors, fonts } from '../theme';
import { MoreIcon } from './Icons';

function showAccountMenu() {
  if (!isConfigured) {
    Alert.alert('Demo mode', 'The backend is not connected yet, so results are fake and there is no account.');
    return;
  }
  Alert.alert('Account', undefined, [
    { text: 'Sign out', onPress: () => supabase.auth.signOut() },
    { text: 'Delete account', style: 'destructive', onPress: confirmDelete },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

function confirmDelete() {
  Alert.alert('Delete account?', 'This permanently deletes your Sugar Hunter account. It cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => deleteAccount().catch((e: Error) => Alert.alert('Delete failed', e.message)),
    },
  ]);
}

/** The ⋮ button: sign out and delete account. */
export function MenuButton() {
  return (
    <Pressable hitSlop={12} onPress={showAccountMenu} accessibilityLabel="Account menu">
      <MoreIcon />
    </Pressable>
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
export function Scrims() {
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
        style={[StyleSheet.absoluteFill, { bottom: undefined, height: 170 }]}
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
    paddingTop: 8,
  },
  brand: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, letterSpacing: -0.3 },
  tagline: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  footer: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textFaint,
    textAlign: 'center',
    paddingVertical: 14,
  },
});
