// The result sheet: an inset bottom card that springs up over the frozen photo. Solid, not glass,
// because it is content (Apple: glass is for controls). The cube perches on its top edge.
import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ingredientNames } from '../lib/display';
import { gramsLine, type Kind } from '../lib/glossary';
import { getPrefs } from '../lib/prefs';
import { colors, fonts } from '../theme';
import type { ScanResult, Verdict } from '../types';
import { kindColor, type Pick } from './GlossaryCard';
import { CameraIcon } from './Icons';

export const verdictColor: Record<Verdict, string> = { CLEAN: colors.clean, BAD: colors.bad, UGLY: colors.ugly };

const SECTIONS: { kind: Kind; title: string; key: 'addedSugars' | 'sweeteners' | 'naturalSugars' }[] = [
  { kind: 'added', title: 'Added sugars', key: 'addedSugars' },
  { kind: 'sweetener', title: 'Sweeteners', key: 'sweeteners' },
  { kind: 'natural', title: 'Natural sugars', key: 'naturalSugars' },
];

type SheetProps = {
  children: ReactNode;
  /** Button label and color. */
  action: { label: string; color: string; ink: string; onPress: () => void };
  footer: ReactNode;
  maxHeight: number;
  bottom: number;
  onHeight?: (h: number) => void;
};

/** The inset sheet shell: content, then a full-width action button and the footer. */
export function ResultSheet({ children, action, footer, maxHeight, bottom, onHeight }: SheetProps) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(rise, { toValue: 1, friction: 9, tension: 60, useNativeDriver: true }).start();
  }, [rise]);
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [420, 0] });

  return (
    <Animated.View
      style={[styles.sheet, { maxHeight, bottom, transform: [{ translateY }] }]}
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
    >
      <View style={styles.grabber} />
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false} bounces={false}>
        {children}
      </ScrollView>
      <Pressable
        onPress={action.onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, { backgroundColor: action.color }, pressed && styles.buttonPressed]}
      >
        <CameraIcon color={action.ink} size={24} />
        <Text style={[styles.buttonText, { color: action.ink }]}>{action.label}</Text>
      </Pressable>
      {footer}
    </Animated.View>
  );
}

/** Verdict, why, grams in teaspoons, then tappable ingredient chips grouped by kind. */
export function VerdictContent({ result, listsPending, onPick }: { result: ScanResult; listsPending?: boolean; onPick: (p: Pick) => void }) {
  const color = verdictColor[result.verdict];
  const grams = gramsLine(result.addedSugars);
  const sections = SECTIONS.map((s) => ({ ...s, items: ingredientNames(result[s.key]) })).filter((s) => s.items.length > 0);

  const pick = (name: string, kind: Kind) => {
    if (getPrefs().haptics) Haptics.selectionAsync().catch(() => {});
    onPick({ name, kind });
  };

  return (
    <>
      <Text style={[styles.verdict, { color }]} accessibilityRole="header" accessibilityLabel={`${result.verdict}. ${result.headline}`}>
        {result.verdict}
      </Text>
      <Text style={styles.headline}>{result.headline}</Text>
      {grams && <Text style={styles.grams}>{grams}</Text>}
      {result.note && <Text style={styles.note}>{result.note}</Text>}

      {sections.map((s) => (
        <View key={s.kind} style={styles.section}>
          <Text style={[styles.label, { color: kindColor[s.kind] }]}>{s.title}</Text>
          <View style={styles.chips}>
            {s.items.map((item) => (
              <Pressable
                key={item}
                onPress={() => pick(item, s.kind)}
                accessibilityRole="button"
                accessibilityLabel={`${item}, what is it?`}
                style={({ pressed }) => [styles.chip, { borderColor: `${kindColor[s.kind]}55`, backgroundColor: `${kindColor[s.kind]}1A` }, pressed && styles.chipPressed]}
              >
                <View style={[styles.dot, { backgroundColor: kindColor[s.kind] }]} />
                <Text style={styles.chipText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      {sections.length > 0 && <Text style={styles.hint}>Tap an ingredient to see what it really is</Text>}

      {/* Jev's verdict is in; Claude is still listing the ingredients. */}
      {listsPending && (
        <View style={styles.pending}>
          <ActivityIndicator size="small" color={colors.cardTextMuted} />
          <Text style={styles.pendingText}>Listing the sugars...</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: 34,
    backgroundColor: 'rgba(22,22,26,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingTop: 8,
    boxShadow: '0px -8px 32px rgba(0,0,0,0.4)',
    overflow: 'hidden',
  },
  grabber: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)' },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 16 },
  verdict: { fontFamily: fonts.extrabold, fontSize: 38, lineHeight: 44, letterSpacing: -0.5 },
  headline: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, color: colors.cardText, marginTop: 2 },
  grams: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.cardTextMuted, marginTop: 6 },
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.cardTextMuted, marginTop: 6 },
  section: { marginTop: 16 },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  chipPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  dot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.cardText },
  hint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textFaint, marginTop: 12 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  pendingText: { fontFamily: fonts.medium, fontSize: 14, color: colors.cardTextMuted },
  button: {
    height: 56,
    marginHorizontal: 14,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonText: { fontFamily: fonts.semibold, fontSize: 18 },
});
