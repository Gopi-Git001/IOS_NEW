import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { signInWithGoogle } from '../lib/api';
import { colors, fonts } from '../theme';
import { GoogleButton } from '../screens/SignInScreen';
import { Glass } from './Glass';

/** Leaves the paid result and device-only history intact under the sign-in invitation. */
export function GuestScanPrompt({ visible, unavailable, onClose }: { visible: boolean; unavailable: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = async () => {
    setBusy(true);
    setError(await signInWithGoogle());
    setBusy(false);
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Glass style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>{unavailable ? 'Sign in to scan' : 'Keep scanning with Google'}</Text>
          <Text style={styles.body}>
            {unavailable ? 'Free scans are unavailable right now. ' : 'Your free scans are used. '}
            Sign in with Google to keep scanning and keep your history on this device.
          </Text>
          <GoogleButton onPress={start} busy={busy} />
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Text style={styles.fine}>Your history stays on this device. It does not sync between devices.</Text>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.close}>
            <Text style={styles.closeText}>Not now</Text>
          </Pressable>
        </Glass>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(6,8,13,0.78)' },
  card: { width: '100%', maxWidth: 440, borderRadius: 28, padding: 24, gap: 16, backgroundColor: colors.sheet },
  title: { fontFamily: fonts.black, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.inkMuted },
  fine: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.inkMuted },
  error: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.bad },
  close: { padding: 8, alignItems: 'center' },
  closeText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
});
