// Warm editorial Verdict Facts over the frozen photo: glossy ink and a coloured glass slab,
// followed by the unchanged ingredient rows. The cube perches on the sheet's top edge.
import * as Haptics from 'expo-haptics';
import { Info } from 'lucide-react-native';
import { type ReactNode, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ingredientNames } from '../lib/display';
import type { Kind } from '../lib/glossary';
import { getPrefs } from '../lib/prefs';
import { colors, crystal, fonts, frost } from '../theme';
import type { ScanResult, Verdict } from '../types';
import { kindTag, type Pick } from './GlossaryCard';
import { CameraIcon } from './Icons';
import { CrystalVerdict, useCrystalReducedMotion } from './CrystalVerdict';

const kindInk = { added: crystal.UGLY.deep, sweetener: crystal.BAD.deep, natural: crystal.CLEAN.deep };

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
  const reduced = useCrystalReducedMotion();
  useEffect(() => {
    if (reduced) { rise.setValue(1); return; }
    Animated.spring(rise, { toValue: 1, friction: 9, tension: 60, useNativeDriver: true }).start();
  }, [rise, reduced]);
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
        <CameraIcon color={crystal.paper} size={22} />
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
export function VerdictContent({ result, listsPending, onPick }: { result: ScanResult; listsPending?: boolean; onPick: (p: Pick) => void }) {
  const sections = SECTIONS.map((s) => ({ ...s, items: ingredientNames(result[s.key]) })).filter((s) => s.items.length > 0);

  const pick = (name: string, kind: Kind) => {
    if (getPrefs().haptics) Haptics.selectionAsync().catch(() => {});
    onPick({ name, kind });
  };

  return (
    <>
      <Text style={styles.title}>Verdict Facts</Text>
      <Rule h={10} />
      <CrystalVerdict verdict={result.verdict} />
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
              accessibilityLabel={`${item}. Why it counts`}
              style={({ pressed }) => [styles.row, styles.rowIn, pressed && styles.rowPressed]}
            >
              <View style={styles.nameWrap}>
                <Text style={[styles.alias, { color: kindInk[s.kind] }]} numberOfLines={2}>
                  {item}
                </Text>
                <View style={styles.info}>
                  <Info size={13} color={crystal.muted} strokeWidth={2} />
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
          <ActivityIndicator size="small" color={crystal.muted} />
          <Text style={styles.pendingText}>Listing the sugars...</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    alignSelf: 'center',
    width: '96%',
    maxWidth: 700,
    borderRadius: 22,
    backgroundColor: crystal.paper,
    paddingTop: 20,
    ...frost(34),
    borderColor: '#FFFFFF',
    boxShadow: 'inset 0px 1px 0px #FFFFFF, 0px 16px 48px #14161330',
    overflow: 'hidden',
  },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { paddingHorizontal: 22, paddingBottom: 14 },
  title: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 20, letterSpacing: 1.5, textTransform: 'uppercase', color: crystal.muted },
  rule: { backgroundColor: crystal.rule },
  rule10: { height: 2, borderRadius: 1, marginTop: 8, marginBottom: 6 },
  rule5: { height: 1, marginVertical: 6 },
  why: { fontFamily: fonts.serif, fontSize: 23, lineHeight: 28, color: crystal.ink, marginTop: 0, marginBottom: 2, paddingTop: 9, borderTopWidth: 1, borderTopColor: crystal.ink },
  note: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 22, color: crystal.muted, marginTop: 4 },
  row: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: crystal.rule,
  },
  rowIn: { minHeight: 44, paddingLeft: 16 },
  rowPressed: { backgroundColor: '#1416130A' },
  lastSection: { borderBottomWidth: 1, borderBottomColor: crystal.rule },
  rowHead: { fontFamily: fonts.extrabold, fontSize: 15, color: crystal.ink },
  rowCount: { fontFamily: fonts.regular, fontSize: 13, color: crystal.muted },
  nameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 8 },
  alias: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  info: { opacity: 0.8, marginTop: 1 },
  tag: { borderWidth: 1, borderColor: crystal.rule, backgroundColor: '#FFFFFF77', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  tagText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: crystal.muted },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  pendingText: { fontFamily: fonts.serif, fontSize: 16, color: crystal.muted },
  button: {
    height: 56,
    marginHorizontal: 14,
    borderRadius: 28,
    backgroundColor: crystal.ink,
    ...frost(16),
    boxShadow: 'inset 0px 1px 0px #FFFFFF33, 0px 3px 8px #14161320',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonText: { fontFamily: fonts.bold, fontSize: 17, color: crystal.paper },
});
