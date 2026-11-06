// "Catch Me If You Can": tap an ingredient chip to see what it really is.
import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Kind, lookup } from '../lib/glossary';
import { colors, fonts } from '../theme';

export const kindColor: Record<Kind, string> = { added: '#FBBF24', sweetener: '#60A5FA', natural: '#34D399' };
const kindLabel: Record<Kind, string> = { added: 'Added sugar', sweetener: 'Sweetener', natural: 'Natural sugar' };

export type Pick = { name: string; kind: Kind } | null;

export function GlossaryCard({ pick, onClose }: { pick: Pick; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pick) return;
    rise.setValue(0);
    Animated.spring(rise, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }).start();
  }, [pick, rise]);

  if (!pick) return null;
  const entry = lookup(pick.name, pick.kind);
  const color = kindColor[pick.kind];
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [320, 0] });

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View style={[styles.card, { marginBottom: insets.bottom + 8, transform: [{ translateY }] }]} accessibilityViewIsModal>
        <View style={styles.grabber} />
        <View style={[styles.tag, { backgroundColor: `${color}26` }]}>
          <Text style={[styles.tagText, { color }]}>{kindLabel[pick.kind]}</Text>
        </View>
        <Text style={styles.name}>{pick.name}</Text>
        <Text style={[styles.reveal, { color }]} accessibilityRole="header">
          {entry.reveal}
        </Text>
        <Text style={styles.blurb}>{entry.blurb}</Text>
        <View style={styles.effect}>
          <Text style={styles.effectText}>{entry.effect}</Text>
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>Got it</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    borderRadius: 34,
    backgroundColor: 'rgba(28,28,32,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 18,
    boxShadow: '0px -6px 30px rgba(0,0,0,0.45)',
  },
  grabber: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 18 },
  tag: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  name: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textMuted, marginTop: 14 },
  reveal: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, marginTop: 4, letterSpacing: -0.4 },
  blurb: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.cardText, marginTop: 10 },
  effect: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  effectText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.cardText },
  button: { marginTop: 20, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  pressed: { opacity: 0.75 },
});
