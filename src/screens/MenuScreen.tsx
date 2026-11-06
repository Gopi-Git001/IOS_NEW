import Constants from 'expo-constants';
import { BookOpen, Feather, FileText, History, Lock, Mail, ShieldCheck, Star, Trash2, Vibrate } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, FlatList, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Group, listStyles, openLink, Row, Sheet } from '../components/ListUI';
import { verdictColor } from '../components/VerdictPanel';
import { links } from '../config';
import { applyStrictMode, ingredientSummary } from '../lib/display';
import { clearHistory, useHistory } from '../lib/history';
import { type Prefs, setPref, usePrefs } from '../lib/prefs';
import { colors, fonts } from '../theme';

type Page = 'menu' | 'history' | 'methodology';
const titles: Record<Page, string> = { menu: 'Menu', history: 'Scan history', methodology: 'How verdicts work' };

/** The ☰ screen: scan history, preferences and about. */
export function MenuScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [page, setPage] = useState<Page>('menu');
  const back = () => {
    if (page !== 'menu') return setPage('menu');
    onClose();
  };

  return (
    <Sheet visible={visible} title={titles[page]} onBack={back} backLabel={page === 'menu' ? 'Close menu' : 'Back'}>
      {page === 'menu' && <MenuList open={setPage} />}
      {page === 'history' && <HistoryList />}
      {page === 'methodology' && <Methodology />}
    </Sheet>
  );
}

function MenuList({ open }: { open: (p: Page) => void }) {
  const prefs = usePrefs();
  const history = useHistory();
  const toggle = (key: keyof Prefs) => (value: boolean) => setPref(key, value);

  return (
    <ScrollView contentContainerStyle={listStyles.content}>
      <Group title="History">
        <Row icon={History} label="Scan history" value={`${history.length}`} onPress={() => open('history')} chevron />
        <Row icon={Trash2} label="Clear history" onPress={confirmClearHistory} />
      </Group>

      <Group title="Preferences">
        <Row
          icon={ShieldCheck}
          label="Strict mode"
          detail="Stevia and monk fruit count as BAD at best."
          toggle={{ value: prefs.strict, onChange: toggle('strict') }}
        />
        <Row
          icon={Feather}
          label="Gentle mode"
          detail="For UGLY, the cube stays calm instead of crying."
          toggle={{ value: prefs.gentle, onChange: toggle('gentle') }}
        />
        <Row icon={Vibrate} label="Haptics" detail="Vibrate when a verdict appears." toggle={{ value: prefs.haptics, onChange: toggle('haptics') }} />
      </Group>

      <Group title="About">
        <Row icon={BookOpen} label="How verdicts work" onPress={() => open('methodology')} chevron />
        <Row icon={Mail} label="Help & support" onPress={() => openLink(`mailto:${links.supportEmail}?subject=Sugar%20Hunter%20support`)} chevron />
        <Row icon={Lock} label="Privacy policy" onPress={() => openLink(links.privacy)} chevron />
        <Row icon={FileText} label="Terms" onPress={() => openLink(links.terms)} chevron />
        <Row icon={Star} label="Rate Sugar Hunter" onPress={() => openLink(Platform.OS === 'ios' ? links.appStore : links.playStore)} chevron />
      </Group>

      <Text style={listStyles.version}>Sugar Hunter {Constants.expoConfig?.version ?? ''}</Text>
    </ScrollView>
  );
}

function confirmClearHistory() {
  Alert.alert('Clear history?', 'This removes every saved scan from this phone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear', style: 'destructive', onPress: clearHistory },
  ]);
}

// ---------- History (on this phone; moves to the account in Phase 4) ----------

function HistoryList() {
  const history = useHistory();
  const { strict } = usePrefs();
  return (
    <FlatList
      data={history}
      keyExtractor={(e) => e.id}
      contentContainerStyle={listStyles.content}
      ListEmptyComponent={<Text style={styles.empty}>No scans yet. Your last 50 scans will show here.</Text>}
      renderItem={({ item, index }) => {
        const result = applyStrictMode(item.result, strict);
        const color = verdictColor[result.verdict];
        return (
          <View style={[styles.historyRow, index === 0 && styles.first, index === history.length - 1 && styles.last]}>
            <View style={[listStyles.badge, styles.historyBadge, { backgroundColor: `${color}29` }]}>
              <Text style={[listStyles.badgeText, { color }]}>{result.verdict}</Text>
            </View>
            <View style={listStyles.rowText}>
              <Text style={listStyles.rowLabel} numberOfLines={1}>
                {result.headline}
              </Text>
              <Text style={listStyles.rowDetail} numberOfLines={1}>
                {ingredientSummary(result)}
              </Text>
            </View>
            <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
          </View>
        );
      }}
    />
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}\n${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

// ---------- How verdicts work ----------

const rules: { verdict: keyof typeof verdictColor; text: string }[] = [
  { verdict: 'CLEAN', text: 'No added sugar and no sweeteners. Sugars that are naturally in the food, like the lactose in milk or the fructose in fruit, are fine.' },
  { verdict: 'BAD', text: 'A little added sugar (1–4 g per serving), sugar alcohols such as erythritol, or plant sweeteners such as stevia and monk fruit.' },
  { verdict: 'UGLY', text: 'Artificial sweeteners such as aspartame or sucralose, alcohol, or more than 4 g of added sugar per serving.' },
];

function Methodology() {
  return (
    <ScrollView contentContainerStyle={listStyles.content}>
      <Text style={styles.paragraph}>
        Sugar Hunter reads the ingredient list and the nutrition panel from your photo. Fixed rules then decide the verdict, so the same label
        always gets the same answer.
      </Text>
      {rules.map((r) => (
        <View key={r.verdict} style={styles.ruleCard}>
          <View style={[listStyles.badge, { backgroundColor: `${verdictColor[r.verdict]}29`, alignSelf: 'flex-start' }]}>
            <Text style={[listStyles.badgeText, { color: verdictColor[r.verdict] }]}>{r.verdict}</Text>
          </View>
          <Text style={styles.ruleText}>{r.text}</Text>
        </View>
      ))}
      <Text style={styles.paragraph}>
        If the label doesn't show how many grams of added sugar there are, any added sugar counts as BAD and Sugar Hunter asks you to scan the
        nutrition panel.
      </Text>
      <Text style={styles.paragraph}>
        With Strict mode off, a product whose only sweetener is stevia, monk fruit or a similar plant sweetener shows as CLEAN.
      </Text>
      <Text style={styles.muted}>Not medical advice. Sugar Hunter doesn't check allergens.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  historyRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  first: { marginTop: 16, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderTopWidth: 0 },
  last: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  historyBadge: { width: 58, alignItems: 'center' }, // same width, so the text column lines up
  historyDate: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.cardTextMuted, textAlign: 'right' },
  empty: { fontFamily: fonts.regular, fontSize: 15, color: colors.cardTextMuted, textAlign: 'center', marginTop: 48 },
  paragraph: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.cardText, marginTop: 16 },
  ruleCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginTop: 12, gap: 8 },
  ruleText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.cardText },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.textFaint, marginTop: 24 },
});
