// "Catch Me If You Can": tap an ingredient row to see what it really is. Set as a bone-paper label card.
import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Kind, lookup } from '../lib/glossary';
import { colors, fonts } from '../theme';

export const kindColor: Record<Kind, string> = { added: colors.ugly, sweetener: colors.bad, natural: colors.clean };
export const kindTag: Record<Kind, string> = { added: 'Sugar', sweetener: 'Sweetener', natural: 'Natural' };
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
        <View style={styles.top}>
          <Text style={styles.kind}>{kindLabel[pick.kind]}</Text>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{kindTag[pick.kind]}</Text>
          </View>
        </View>
        <View style={styles.rule10} />
        <Text style={styles.name}>{pick.name}</Text>
        <Text style={[styles.reveal, { color }]} accessibilityRole="header">
          {entry.reveal}
        </Text>
        <Text style={styles.blurb}>{entry.blurb}</Text>
        <View style={styles.rule5} />
        <Text style={styles.effectText}>{entry.effect}</Text>
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
    borderRadius: 30,
    backgroundColor: colors.paper,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    boxShadow: '0px -6px 30px rgba(0,0,0,0.4)',
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kind: { fontFamily: fonts.black, fontSize: 22, letterSpacing: -0.6, color: colors.ink },
  tag: { borderWidth: 1, borderColor: colors.ink, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontFamily: fonts.bold, fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.ink },
  rule10: { height: 10, backgroundColor: colors.rule, marginTop: 8, marginBottom: 12 },
  rule5: { height: 5, backgroundColor: colors.rule, marginTop: 14, marginBottom: 10 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.inkMuted },
  reveal: { fontFamily: fonts.black, fontSize: 36, lineHeight: 40, marginTop: 2, letterSpacing: -1.2 },
  blurb: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 25, color: '#33312D', marginTop: 6 },
  effectText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  button: { marginTop: 18, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: fonts.bold, fontSize: 17, color: colors.paper },
  pressed: { opacity: 0.8 },
});
