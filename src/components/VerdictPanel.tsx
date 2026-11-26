// Verdict Facts on a Website Mint paper sheet over the frozen photo: heavy ink verdict word and a coloured slab,
// followed by the unchanged ingredient rows. The cube hops onto the sheet's top edge.
import * as Haptics from 'expo-haptics';
import { Info } from 'lucide-react-native';
import { type ReactNode, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ingredientNames, sugarStackingLine } from '../lib/display';
import type { Kind } from '../lib/glossary';
import { getPrefs } from '../lib/prefs';
import { colors, fonts, mint } from '../theme';
import type { ScanResult, Verdict } from '../types';
import { kindTag, type Pick } from './GlossaryCard';
import { CameraIcon } from './Icons';
import { PaperGrid } from './Chrome';
import { MintVerdict, useReducedMotionSetting } from './CrystalVerdict';

const kindInk = { added: mint.BAD.deep, sweetener: mint.OKAY.deep, natural: mint.CLEAN.deep };

export const verdictColor: Record<Verdict, string> = { CLEAN: colors.clean, OKAY: colors.okay, BAD: colors.bad };
export const verdictWord: Record<Verdict, string> = { CLEAN: 'Clean', OKAY: 'Okay', BAD: 'Bad' };

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
  /** Space under the button and footer for the home indicator (the sheet runs to the bottom edge). */
  bottomInset: number;
  onHeight?: (h: number) => void;
};

/** Result 6 entrance: the sheet slides up 560 pt in 400 ms on the mockup's ease-out curve. */
export const SHEET_RISE = { from: 560, duration: 400, easing: Easing.bezier(0.2, 0.8, 0.2, 1) };

/** The edge-to-edge mint paper sheet: content, then a full-width ink button and the footer. Reduce Motion: no slide. */
export function ResultSheet({ children, action, footer, maxHeight, bottomInset, onHeight }: SheetProps) {
  const rise = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotionSetting();
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) { rise.setValue(1); return; }
    const anim = Animated.timing(rise, { toValue: 1, duration: SHEET_RISE.duration, easing: SHEET_RISE.easing, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [rise, reduced]);
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [SHEET_RISE.from, 0] });

  return (
    <Animated.View
      style={[styles.sheet, { maxHeight, paddingBottom: bottomInset, transform: [{ translateY }] }]}
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
    >
      <View style={styles.paper} pointerEvents="none">
        <PaperGrid />
      </View>
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false} bounces={false}>
        {children}
      </ScrollView>
      <Pressable onPress={action.onPress} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        <CameraIcon color={mint.onInk} size={22} />
        <Text style={styles.buttonText}>{action.label}</Text>
      </Pressable>
      {footer}
    </Animated.View>
  );
}

/** Rules of the panel: 10 pt under the title, 5 pt between blocks, hairlines between rows. */
const Rule = ({ h }: { h: 10 | 5 }) => <View style={[styles.rule, h === 10 ? styles.rule10 : styles.rule5]} />;

/**
 * "Verdict Facts": the verdict word where Calories sit on a real panel, the reason in italics,
 * then every sugar and sweetener as an indented row with an (i) that opens why it counts.
 * No gram amounts: an ingredient list doesn't say how much sugar was added.
 */
type ContentProps = { result: ScanResult; listsPending?: boolean; onRetryLists?: () => void; onPick: (p: Pick) => void };

export function VerdictContent({ result, listsPending, onRetryLists, onPick }: ContentProps) {
  const sections = SECTIONS.map((s) => ({ ...s, items: ingredientNames(result[s.key]) })).filter((s) => s.items.length > 0);
  const stacking = sugarStackingLine(result);

  const pick = (name: string, kind: Kind) => {
    if (getPrefs().haptics) Haptics.selectionAsync().catch(() => {});
    onPick({ name, kind });
  };

  return (
    <>
      <Text style={styles.title}>Verdict Facts</Text>
      <Rule h={10} />
      <MintVerdict verdict={result.verdict} />
      <Text style={styles.why}>{result.headline}</Text>
      {result.note && <Text style={styles.note}>{result.note}</Text>}
      {/* Sugar stacking and where the first added sugar sits. Absent when the server couldn't place it. */}
      {stacking && (
        <View style={styles.stack}>
          {stacking.badge && (
            <View style={styles.tag}>
              <Text style={[styles.tagText, styles.stackTagText]}>{stacking.badge}</Text>
            </View>
          )}
          <Text style={styles.stackText}>{stacking.line}</Text>
        </View>
      )}

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
              accessibilityLabel={`${item}. Why it counts`}
              style={({ pressed }) => [styles.row, styles.rowIn, pressed && styles.rowPressed]}
            >
              <View style={styles.nameWrap}>
                <Text style={[styles.alias, { color: kindInk[s.kind] }]} numberOfLines={2}>
                  {item}
                </Text>
                <View style={styles.info}>
                  <Info size={13} color={mint.muted} strokeWidth={2} />
                </View>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{kindTag[s.kind]}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ))}

      {/* Jev's verdict is in; Claude is still listing the ingredients. */}
      {listsPending && (
        <View style={styles.pending}>
          <ActivityIndicator size="small" color={mint.muted} />
          <Text style={styles.pendingText}>Listing the sugars...</Text>
        </View>
      )}
      {!listsPending && onRetryLists && (
        <View style={styles.pending}>
          <Text style={styles.pendingText}>Couldn't list the sugars</Text>
          <Pressable
            onPress={onRetryLists}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Retry listing the sugars"
            style={({ pressed }) => [styles.retry, pressed && styles.rowPressed]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: mint.paper,
    borderTopWidth: 1,
    borderColor: mint.border,
    paddingTop: 20,
    boxShadow: `0px -8px 30px ${mint.shadowStrong}`,
  },
  // PaperGrid clipped to the sheet's rounded top (the sheet itself can't clip, or its shadow would go).
  paper: { ...StyleSheet.absoluteFill, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { paddingHorizontal: 22, paddingBottom: 14 },
  title: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 20, letterSpacing: 1.5, textTransform: 'uppercase', color: mint.muted },
  rule: { backgroundColor: mint.border },
  rule10: { height: 2, borderRadius: 1, marginTop: 8, marginBottom: 6 },
  rule5: { height: 1, marginVertical: 6 },
  why: { fontFamily: fonts.serif, fontSize: 23, lineHeight: 28, color: mint.ink, marginTop: 0, marginBottom: 2, paddingTop: 9, borderTopWidth: 1, borderTopColor: mint.ink },
  note: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 22, color: mint.muted, marginTop: 4 },
  stack: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4, marginTop: 8, marginBottom: 2 },
  stackTagText: { color: mint.BAD.deep },
  stackText: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: mint.muted },
  row: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: mint.border,
  },
  rowIn: { minHeight: 44, paddingLeft: 16 },
  rowPressed: { backgroundColor: mint.pressed },
  lastSection: { borderBottomWidth: 1, borderBottomColor: mint.border },
  rowHead: { fontFamily: fonts.extrabold, fontSize: 15, color: mint.ink },
  rowCount: { fontFamily: fonts.regular, fontSize: 13, color: mint.muted },
  nameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 8 },
  alias: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  info: { opacity: 0.8, marginTop: 1 },
  tag: { borderWidth: 1, borderColor: mint.chipBorder, backgroundColor: mint.surface, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  tagText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: mint.muted },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  pendingText: { fontFamily: fonts.serif, fontSize: 16, color: mint.muted },
  retry: { borderWidth: 1, borderColor: mint.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  retryText: { fontFamily: fonts.bold, fontSize: 14, color: mint.ink },
  button: {
    height: 56,
    marginHorizontal: 14,
    borderRadius: 28,
    backgroundColor: mint.ink,
    boxShadow: `0px 3px 8px ${mint.shadowStrong}`,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonText: { fontFamily: fonts.bold, fontSize: 17, color: mint.onInk },
});
