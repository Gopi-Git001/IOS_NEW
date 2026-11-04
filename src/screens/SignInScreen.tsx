import LottieView from 'lottie-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Footer, Header } from '../components/Chrome';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../theme';

const RESEND_SECONDS = 60;

/** "+44 7700 900-123" → "+447700900123", or null if it isn't a full international number. */
export function toE164(input: string): string | null {
  const cleaned = input.replace(/[\s\-().]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
}

/** Mobile number + SMS code sign-in. Supabase creates the account on first sign-in. */
export function SignInScreen() {
  const [phone, setPhone] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async (number: string) => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone: number });
    setBusy(false);
    if (error) return setError(error.message);
    setSentTo(number);
    setCode('');
    setCooldown(RESEND_SECONDS);
  };

  const submitPhone = () => {
    const number = toE164(phone);
    if (!number) return setError('Enter your full number with country code, e.g. +44 7700 900123');
    sendCode(number);
  };

  const verify = async (token: string) => {
    if (!sentTo || token.length !== 6) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ phone: sentTo, token, type: 'sms' });
    setBusy(false);
    // On success the auth listener in App.tsx switches to the camera.
    if (error) setError(error.message);
  };

  return (
    <SafeAreaView style={styles.fill}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header />
        <View style={styles.body}>
          <LottieView source={require('../../assets/lottie/idle.json')} autoPlay loop style={styles.character} />

          {sentTo ? (
            <>
              <Text style={styles.title}>Enter your code</Text>
              <Text style={styles.subtitle}>We sent a 6-digit code to {sentTo}</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={(t) => {
                  const digits = t.replace(/\D/g, '').slice(0, 6);
                  setCode(digits);
                  if (digits.length === 6) verify(digits);
                }}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                placeholder="••••••"
                placeholderTextColor={colors.textFaint}
                autoFocus
              />
              <PrimaryButton label="Verify" onPress={() => verify(code)} busy={busy} disabled={code.length !== 6} />
              <View style={styles.links}>
                <Pressable disabled={cooldown > 0 || busy} onPress={() => sendCode(sentTo)}>
                  <Text style={[styles.link, cooldown > 0 && styles.linkDisabled]}>
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => { setSentTo(null); setError(null); }}>
                  <Text style={styles.link}>Change number</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Sign in with your phone</Text>
              <Text style={styles.subtitle}>We'll text you a code. No password needed.</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                onSubmitEditing={submitPhone}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                placeholder="+1 555 123 4567"
                placeholderTextColor={colors.textFaint}
                autoFocus
              />
              <PrimaryButton label="Send code" onPress={submitPhone} busy={busy} disabled={phone.trim().length < 8} />
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}
        </View>
        <Footer />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PrimaryButton({ label, onPress, busy, disabled }: { label: string; onPress: () => void; busy: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      style={({ pressed }) => [styles.button, (disabled || busy) && styles.buttonDisabled, pressed && styles.buttonPressed]}
    >
      {busy ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  character: { width: 170, height: 170, alignSelf: 'center', marginBottom: 4 },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.text, textAlign: 'center' },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 8 },
  input: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 18,
    fontFamily: fonts.medium,
    fontSize: 19,
    color: colors.text,
  },
  codeInput: { textAlign: 'center', letterSpacing: 10, fontSize: 24 },
  button: {
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.clean,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonText: { fontFamily: fonts.semibold, fontSize: 18, color: colors.background },
  links: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginTop: 4 },
  link: { fontFamily: fonts.medium, fontSize: 15, color: colors.clean },
  linkDisabled: { color: colors.textFaint },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.bad, textAlign: 'center' },
});
