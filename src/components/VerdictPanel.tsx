import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ingredientNames, reasonLine } from '../lib/display';
import { colors, fonts } from '../theme';
import type { ScanResult, Verdict } from '../types';
import { CubeIcon, DropIcon, LeafIcon } from './Icons';

export const verdictColor: Record<Verdict, string> = { CLEAN: colors.clean, BAD: colors.bad, UGLY: colors.ugly };

const sectionColor = { natural: '#34D399', added: '#FBBF24', sweeteners: '#60A5FA' };
const SECTION_ICON = 14;

// Collapsed or not, remembered until the app is closed.
let collapsedThisSession = false;

/**
 * Top-right dark status card: the verdict word, a one-line reason (with added grams when known),
 * then the sugar names that apply. Scrolls inside if taller than `maxHeight`.
 */
export function VerdictPanel({ result, maxHeight, listsPending = false }: { result: ScanResult; maxHeight: number; listsPending?: boolean }) {
  const [collapsed, setCollapsed] = useState(collapsedThisSession);
  const color = verdictColor[result.verdict];
  const sections = [
    { title: 'Natural sugars', items: ingredientNames(result.naturalSugars), color: sectionColor.natural, Icon: LeafIcon },
    { title: 'Added sugars', items: ingredientNames(result.addedSugars), color: sectionColor.added, Icon: CubeIcon },
    { title: 'Sweeteners', items: ingredientNames(result.sweeteners), color: sectionColor.sweeteners, Icon: DropIcon },
  ].filter((s) => s.items.length > 0);

  const toggle = () => {
    collapsedThisSession = !collapsed;
    setCollapsed(collapsedThisSession);
  };

  return (
    <View style={[styles.card, { maxHeight }]}>
      <View style={styles.verdictRow}>
        <Text style={[styles.verdict, { color }]} accessibilityRole="header" accessibilityLabel={`${result.verdict}. ${result.headline}`}>
          {result.verdict}
        </Text>
        <View style={styles.spacer} />
        {sections.length > 0 && (
          <Pressable
            onPress={toggle}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? 'Show details' : 'Hide details'}
            style={collapsed && styles.chevronCollapsed}
          >
            <ChevronDown size={20} color={colors.cardTextMuted} strokeWidth={2.5} />
          </Pressable>
        )}
      </View>

      <Text style={styles.reason}>{reasonLine(result)}</Text>

      {!collapsed && sections.length > 0 && (
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false} bounces={false}>
          {sections.map((s) => (
            <View key={s.title} style={styles.section}>
              <View style={styles.labelRow}>
                <s.Icon size={SECTION_ICON} color={s.color} />
                <Text style={[styles.label, { color: s.color }]}>{s.title}</Text>
              </View>
              {s.items.map((item) => (
                <Text key={item} style={styles.item}>
                  {item}
                </Text>
              ))}
            </View>
          ))}

        </ScrollView>
      )}

      {/* Jev's verdict is in; Claude is still listing the ingredients. */}
      {listsPending && (
        <View style={[styles.section, styles.pending]}>
          <ActivityIndicator size="small" color={colors.cardTextMuted} />
          <Text style={styles.pendingText}>Listing the sugars...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    boxShadow: '0px 6px 20px rgba(0,0,0,0.4)',
  },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verdict: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 26 },
  spacer: { flex: 1 },
  chevronCollapsed: { transform: [{ rotate: '180deg' }] },
  body: { flexGrow: 0 },
  section: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.cardBorder, gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  reason: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, color: colors.cardTextMuted, marginTop: 2 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingText: { fontFamily: fonts.medium, fontSize: 13, color: colors.cardTextMuted },
  item: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.cardText },
});
