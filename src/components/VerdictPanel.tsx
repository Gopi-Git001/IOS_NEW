// The result sheet: an inset bone-paper card that springs up over the frozen photo, set like a
// Nutrition Facts panel ("Verdict Facts"). Solid, not glass, because it is content (Apple: glass is
// for controls). The cube perches on its top edge.
import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ingredientNames } from '../lib/display';
import { addedAmount, type Kind } from '../lib/glossary';
import { getPrefs } from '../lib/prefs';
import { colors, fonts } from '../theme';
import type { ScanResult, Verdict } from '../types';
import { kindColor, kindTag, type Pick } from './GlossaryCard';
import { CameraIcon } from './Icons';

export const verdictColor: Record<Verdict, string> = { CLEAN: colors.clean, BAD: colors.bad, UGLY: colors.ugly };
export const verdictWord: Record<Verdict, string> = { CLEAN: 'Clean', BAD: 'Bad', UGLY: 'Ugly' };

const SECTIONS: { kind: Kind; title: string; key: 'addedSugars' | 'sweeteners' | 'naturalSugars' }[] = [
  { kind: 'added', title: 'Added sugars', key: 'addedSugars' },
  { kind: 'sweetener', title: 'Sweeteners', key: 'sweeteners' },
  { kind: 'natural', title: 'Natural sugars', key: 'naturalSugars' },
];

type SheetProps = {
  children: ReactNode;
  action: { label: string; onPress: () => void };
  footer: ReactNode;
  maxHeight: number;
  bottom: number;
  onHeight?: (h: number) => void;
};

/** The inset sheet shell: content, then a full-width ink button and the footer. */
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
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false} bounces={false}>
        {children}
      </ScrollView>
      <Pressable onPress={action.onPress} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        <CameraIcon color={colors.paper} size={22} />
        <Text style={styles.buttonText}>{action.label}</Text>
      </Pressable>
      {footer}
    </Animated.View>
  );
}

/** Rules of the panel: 10 pt under the title, 5 pt between blocks, hairlines between rows. */
const Rule = ({ h }: { h: 10 | 5 }) => <View style={[styles.rule, { height: h }, h === 10 ? styles.rule10 : styles.rule5]} />;

/**
 * "Verdict Facts": the verdict word and added grams where Calories sit on a real panel,
 * the reason in italics, then every sugar and sweetener as an indented, tappable row.
 */
export function VerdictContent({ result, listsPending, onPick }: { result: ScanResult; listsPending?: boolean; onPick: (p: Pick) => void }) {
  const color = verdictColor[result.verdict];
  const sections = SECTIONS.map((s) => ({ ...s, items: ingredientNames(result[s.key]) })).filter((s) => s.items.length > 0);
  const added = addedAmount(result.addedSugars);
  const noAdded = !listsPending && ingredientNames(result.addedSugars).length === 0;
  const amount = added ?? (noAdded ? { grams: '0 g', amount: '' } : null);

  const pick = (name: string, kind: Kind) => {
    if (getPrefs().haptics) Haptics.selectionAsync().catch(() => {});
    onPick({ name, kind });
  };

  return (
    <>
      <Text style={styles.title}>Verdict Facts</Text>
      <Rule h={10} />
      <View style={styles.amtRow}>
        <Text style={styles.amt}>Your label</Text>
        <Text style={styles.amt}>per serving</Text>
      </View>
      <Rule h={5} />

      <View style={styles.verdictRow} accessible accessibilityRole="header" accessibilityLabel={`${verdictWord[result.verdict]}. ${result.headline}${added ? `. ${added.grams} added sugar, ${added.amount}` : ''}`}>
        <Text style={[styles.verdict, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {verdictWord[result.verdict]}
        </Text>
        {amount && (
          <View style={styles.grams}>
            <Text style={styles.gramsBig}>{amount.grams}</Text>
            <Text style={styles.gramsSmall}>added sugar</Text>
            {amount.amount !== '' && <Text style={styles.gramsSmall}>{amount.amount}</Text>}
          </View>
        )}
      </View>
      <Text style={styles.why}>{result.headline}</Text>
      {result.note && <Text style={styles.note}>{result.note}</Text>}

      {sections.length > 0 && <Rule h={5} />}
      {sections.map((s, i) => (
        <View key={s.kind} style={i === sections.length - 1 && styles.lastSection}>
          <View style={styles.row}>
            <Text style={styles.rowHead}>{s.title}</Text>
            <Text style={styles.rowCount}>{s.items.length} found</Text>
          </View>
          {s.items.map((item) => (
            <Pressable
              key={item}
              onPress={() => pick(item, s.kind)}
              accessibilityRole="button"
              accessibilityLabel={`${item}, what is it?`}
              style={({ pressed }) => [styles.row, styles.rowIn, pressed && styles.rowPressed]}
            >
              <Text style={[styles.alias, { color: kindColor[s.kind] }]} numberOfLines={2}>
                {item}
              </Text>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{kindTag[s.kind]}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ))}

      {sections.length > 0 && <Text style={styles.hint}>Tap a name to see what it really is.</Text>}

      {/* Jev's verdict is in; Claude is still listing the ingredients. */}
      {listsPending && (
        <View style={styles.pending}>
          <ActivityIndicator size="small" color={colors.inkMuted} />
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
    borderRadius: 30,
    backgroundColor: colors.paper,
    paddingTop: 20,
    boxShadow: '0px -10px 40px rgba(0,0,0,0.32)',
    overflow: 'hidden',
  },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { paddingHorizontal: 22, paddingBottom: 14 },
  title: { fontFamily: fonts.black, fontSize: 30, lineHeight: 32, letterSpacing: -1, color: colors.ink },
  rule: { backgroundColor: colors.rule },
  rule10: { marginTop: 8, marginBottom: 6 },
  rule5: { marginVertical: 6 },
  amtRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amt: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  verdictRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 4 },
  verdict: { flexShrink: 1, fontFamily: fonts.black, fontSize: 72, lineHeight: 72, letterSpacing: -3.2, includeFontPadding: false },
  grams: { alignItems: 'flex-end', paddingBottom: 6 },
  gramsBig: { fontFamily: fonts.black, fontSize: 32, lineHeight: 34, letterSpacing: -1, color: colors.ink },
  gramsSmall: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 15, color: colors.inkMuted, textAlign: 'right' },
  why: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 24, color: '#33312D', marginTop: 8, marginBottom: 2 },
  note: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, color: colors.inkMuted, marginTop: 4 },
  row: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  rowIn: { minHeight: 44, paddingLeft: 16 },
  rowPressed: { backgroundColor: 'rgba(14,14,12,0.05)' },
  lastSection: { borderBottomWidth: 4, borderBottomColor: colors.rule },
  rowHead: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.ink },
  rowCount: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  alias: { flex: 1, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  tag: { borderWidth: 1, borderColor: colors.ink, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  tagText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.ink },
  hint: { fontFamily: fonts.serif, fontSize: 15, color: colors.inkMuted, marginTop: 10 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  pendingText: { fontFamily: fonts.serif, fontSize: 16, color: colors.inkMuted },
  button: {
    height: 56,
    marginHorizontal: 14,
    borderRadius: 28,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonText: { fontFamily: fonts.bold, fontSize: 17, color: colors.paper },
});
