import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CharacterView } from '../components/Character';
import { Ambient, Footer, Header } from '../components/Chrome';
import { signInWithGoogle, takeAuthRedirectError } from '../lib/api';
import { colors, fonts, frost } from '../theme';

/** Google sign-in only (free through Supabase Auth). Supabase creates the account on first sign-in. */
export function SignInScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coming back from Google with an error (for example, the person pressed Cancel).
  useEffect(() => setError(takeAuthRedirectError()), []);

  const start = async () => {
    setBusy(true);
    setError(null);
    const err = await signInWithGoogle();
    // On the web the page is leaving for Google; on phones the auth listener in App.tsx takes over.
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <View style={styles.root}>
      <Ambient />
      <SafeAreaView style={styles.fill}>
        <Header ink />
        <View style={styles.body}>
          <View style={styles.character}>
            <CharacterView mood="idle" size={170} />
          </View>
          <Text style={styles.title}>Sign in to start scanning</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle}>Use your Google account. No password, no texts.</Text>
          <GoogleButton onPress={start} busy={busy} />
          <Text style={styles.fineprint}>We only get your name and email from Google.</Text>
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
        <Footer ink />
      </SafeAreaView>
    </View>
  );
}

function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

function GoogleButton({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      style={({ pressed }) => [styles.button, busy && styles.buttonDisabled, pressed && styles.buttonPressed]}
    >
      {busy ? (
        <ActivityIndicator color={colors.onInk} />
      ) : (
        <View style={styles.buttonRow}>
          <GoogleMark />
          <Text style={styles.buttonText}>Continue with Google</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  fill: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  character: { alignSelf: 'center', marginBottom: 4 },
  title: { fontFamily: fonts.black, fontSize: 30, lineHeight: 33, letterSpacing: -1.1, color: colors.ink },
  titleRule: { height: 2, borderRadius: 1, backgroundColor: colors.rule, marginTop: -4 },
  subtitle: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 24, color: colors.inkMuted, marginBottom: 6 },
  input: {
    height: 58,
    borderRadius: 16,
    ...frost(20),
    backgroundColor: colors.paperRaised,
    paddingHorizontal: 18,
    fontFamily: fonts.semibold,
    fontSize: 19,
    color: colors.ink,
  },
  codeInput: { textAlign: 'center', letterSpacing: 10, fontSize: 24 },
  button: {
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(244,246,251,0.92)',
    ...frost(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.35 },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fineprint: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkMuted, textAlign: 'center', marginTop: 2 },
  buttonText: { fontFamily: fonts.bold, fontSize: 18, color: colors.onInk },
  links: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginTop: 4 },
  link: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
  linkDisabled: { color: colors.inkFaint, textDecorationLine: 'none' },
  error: { fontFamily: fonts.semibold, fontSize: 14, color: colors.bad },
});
