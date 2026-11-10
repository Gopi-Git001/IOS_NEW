import { Share2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { buildVerdictCardData } from '../lib/verdictCard';
import { createVerdictCardFile, shareVerdictCard } from '../lib/verdictCardExport';
import { crystal, fonts } from '../theme';
import type { ScanResult } from '../types';

/** Web-first image sharing. Native never touches File, canvas, document or navigator. */
export function ShareVerdictButton({ result, scannedAt }: { result: ScanResult; scannedAt: Date }) {
  const data = useMemo(() => buildVerdictCardData(result, scannedAt), [result, scannedAt]);
  const [prepared, setPrepared] = useState<{ data: typeof data; file: File } | null>(null);
  const [preparing, setPreparing] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || !data) return;
    let active = true;
    setPrepared(null); setPreparing(true); setMessage('');
    createVerdictCardFile(data).then(file => { if (active) setPrepared({ data, file }); }).catch(() => {
      if (active) setMessage("Couldn't create the image. Tap to retry.");
    }).finally(() => { if (active) setPreparing(false); });
    return () => { active = false; };
  }, [data, attempt]);
  if (Platform.OS !== 'web' || !data) return null;
  // A settings/result update must never briefly offer the previous verdict's image.
  const file = prepared?.data === data ? prepared.file : null;
  const busy = preparing || sharing || (!!prepared && prepared.data !== data);
  const share = async () => {
    if (inFlight.current || busy) return;
    if (!file) { setAttempt(n => n + 1); return; }
    inFlight.current = true; setSharing(true); setMessage('');
    try {
      const outcome = await shareVerdictCard(file);
      setMessage(outcome === 'downloaded' ? 'PNG download started. No label photo included.' : outcome === 'shared' ? 'Image shared. No label photo included.' : '');
    } catch { setMessage("Couldn't save the image. Please try again."); }
    finally { inFlight.current = false; setSharing(false); }
  };
  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityLabel="Share verdict" accessibilityHint="Share or download an image without your label photo" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={share} style={({ pressed }) => [styles.button, pressed && styles.pressed, busy && styles.disabled]}>
        <Share2 size={17} color={crystal.ink} />
        <Text style={styles.label}>{busy && !sharing ? 'Preparing image' : sharing ? 'Sharing' : 'Share verdict'}</Text>
      </Pressable>
      {!!message && <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, marginHorizontal: 20 },
  button: { minHeight: 44, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: crystal.rule, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10 },
  label: { fontFamily: fonts.bold, fontSize: 14, color: crystal.ink },
  message: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: crystal.muted, marginTop: 8, textAlign: 'center' },
  pressed: { backgroundColor: '#1416130B' },
  disabled: { opacity: .6 },
});
