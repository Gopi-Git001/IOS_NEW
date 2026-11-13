import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { links } from '../config';
import { notify } from '../lib/confirm';
import { brand, colors, fonts } from '../theme';
import { Glass } from './Glass';

const openPrivacy = () => Linking.openURL(links.privacy).catch(() => notify("Couldn't open link", links.privacy));

/** Shown before the first scan until the user accepts (App Store guideline 5.1.2(i)). */
export function ScanConsentNotice({ visible, onAccept, onNotNow }: { visible: boolean; onAccept: () => void; onNotNow: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onNotNow}>
      <View style={styles.scrim}>
        <Glass style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>Before your first scan</Text>
          <Text style={styles.body}>
            To check a label, the app sends your label photo for analysis to two AI services: Anthropic (Claude), which
            reads the ingredient list, and TypeSafe (Jev), which gives the sugar verdict.
          </Text>
          <Text style={styles.fine}>Only the label photo is sent. {brand.name} does not store the photos.</Text>
          <Pressable onPress={openPrivacy} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.link}>Privacy policy</Text>
          </Pressable>
          <Pressable onPress={onAccept} accessibilityRole="button" style={styles.accept}>
            <Text style={styles.acceptText}>Accept</Text>
          </Pressable>
          <Pressable onPress={onNotNow} accessibilityRole="button" style={styles.close}>
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
  link: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, textDecorationLine: 'underline' },
  accept: { backgroundColor: 'rgba(244,246,251,0.92)', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  acceptText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onInk },
  close: { padding: 8, alignItems: 'center' },
  closeText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
});
