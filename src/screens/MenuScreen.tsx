import Constants from 'expo-constants';
import { BookOpen, Feather, FileText, History, Lock, Mail, ShieldCheck, Star, Trash2, Vibrate, Globe } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Group, listStyles, openLink, Row, Sheet } from '../components/ListUI';
import { verdictColor } from '../components/VerdictPanel';
import { links } from '../config';
import { applyStrictMode, ingredientSummary } from '../lib/display';
import { confirmAction } from '../lib/confirm';
import { clearHistory, useHistory } from '../lib/history';
import { type Prefs, setPref, usePrefs } from '../lib/prefs';
import { brand, colors, fonts, frost } from '../theme';

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
      <Group title="What the verdicts mean">
        {definitions.map((d, i) => (
          <View key={d.verdict} style={[styles.defRow, i > 0 && styles.defDivider]} accessible accessibilityLabel={`${d.verdict}: ${d.text}`}>
            <View style={[listStyles.badge, styles.defBadge, { backgroundColor: `${verdictColor[d.verdict]}1F` }]}>
              <Text style={[listStyles.badgeText, { color: verdictColor[d.verdict] }]}>{d.verdict}</Text>
            </View>
            <Text style={styles.defText}>{d.text}</Text>
          </View>
        ))}
      </Group>

      <Group title="History">
        <Row icon={History} label="Scan history" value={`${history.length}`} onPress={() => open('history')} chevron />
        <Row icon={Trash2} label="Clear history" onPress={confirmClearHistory} />
      </Group>

      <Group title="Preferences">
        <Row
          icon={ShieldCheck}
          label="Strict mode"
          detail="Stevia and monk fruit count as OKAY at best."
          toggle={{ value: prefs.strict, onChange: toggle('strict') }}
        />
        <Row
          icon={Feather}
          label="Gentle mode"
          detail="For BAD, the cube stays calm instead of crying."
          toggle={{ value: prefs.gentle, onChange: toggle('gentle') }}
        />
        <Row icon={Vibrate} label="Haptics" detail="Vibrate when a verdict appears." toggle={{ value: prefs.haptics, onChange: toggle('haptics') }} />
      </Group>

      <Group title="About">
        <Row icon={BookOpen} label="How verdicts work" onPress={() => open('methodology')} chevron />
        <Row icon={Globe} label="Learn more at sugardepth.com" onPress={() => openLink(links.howItWorks)} chevron />
        <Row icon={Mail} label="Help & support" onPress={() => openLink(`mailto:${links.supportEmail}?subject=Sugar%20Depth%20support`)} chevron />
        <Row icon={Lock} label="Privacy policy" onPress={() => openLink(links.privacy)} chevron />
        <Row icon={FileText} label="Terms" onPress={() => openLink(links.terms)} chevron />
        <Row icon={Star} label={`Rate ${brand.name}`} onPress={() => openLink(Platform.OS === 'ios' ? links.appStore : links.playStore)} chevron />
      </Group>

      <Text style={listStyles.version}>{brand.name} {Constants.expoConfig?.version ?? ''} · {brand.tagline}</Text>
    </ScrollView>
  );
}

function confirmClearHistory() {
  confirmAction('Clear history?', 'This removes every saved scan from this phone.', 'Clear', clearHistory, true);
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
            <View style={[listStyles.badge, styles.historyBadge, { backgroundColor: `${color}1F` }]}>
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

/** One-line definitions for the menu; "How verdicts work" has the full rules (Rules v3). */
const definitions: { verdict: keyof typeof verdictColor; text: string }[] = [
  { verdict: 'CLEAN', text: 'No added sugar, sweeteners or alcohol. Only sugars that are naturally in the food.' },
  { verdict: 'OKAY', text: '4 g or less of added sugar per serving, or a gentler sweetener such as stevia, monk fruit or a sugar alcohol.' },
  { verdict: 'BAD', text: 'More than 4 g of added sugar per serving, an artificial sweetener, or alcohol.' },
];

const rules: { verdict: keyof typeof verdictColor; text: string }[] = [
  { verdict: 'CLEAN', text: 'No added sugar, no sweeteners and no alcohol. Sugars that are naturally in the food, like the lactose in milk, the fructose in fruit or a 100% juice, are fine.' },
  { verdict: 'OKAY', text: '4 g or less of added sugar per serving, or a gentler sweetener: stevia, monk fruit, allulose, or a sugar alcohol such as erythritol, xylitol, sorbitol or maltitol.' },
  { verdict: 'BAD', text: 'More than 4 g of added sugar per serving, or added sugar when the grams per serving are not shown. Also artificial sweeteners such as sucralose or aspartame, or alcohol above 0.5% ABV.' },
];

function Methodology() {
  return (
    <ScrollView contentContainerStyle={listStyles.content}>
      <Text style={styles.paragraph}>
        {brand.name} reads the ingredient list and the nutrition panel from your photo. Fixed rules then decide the verdict, so the same label
        always gets the same answer.
      </Text>
      {rules.map((r) => (
        <View key={r.verdict} style={styles.ruleCard}>
          <View style={[listStyles.badge, { backgroundColor: `${verdictColor[r.verdict]}1F`, alignSelf: 'flex-start' }]}>
            <Text style={[listStyles.badgeText, { color: verdictColor[r.verdict] }]}>{r.verdict}</Text>
          </View>
          <Text style={styles.ruleText}>{r.text}</Text>
        </View>
      ))}
      <Text style={styles.paragraph}>
        Added sugar is graded by the Added Sugars grams per serving on the nutrition panel. When the grams can't be read, any added sugar
        makes a product BAD, so scan the panel too. Added sugar, artificial sweeteners and alcohol never get CLEAN.
      </Text>
      <Text style={styles.paragraph}>
        With Strict mode off, a product whose only sweetener is stevia, monk fruit or a similar plant sweetener shows as CLEAN.
      </Text>
      <Text style={styles.muted}>Not medical advice. {brand.name} doesn't check allergens.</Text>
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
    backgroundColor: colors.paperRaised,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  first: { marginTop: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, borderTopColor: colors.hairline },
  last: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  historyBadge: { width: 58, alignItems: 'center' }, // same width, so the text column lines up
  historyDate: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.inkMuted, textAlign: 'right' },
  empty: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkMuted, textAlign: 'center', marginTop: 48 },
  paragraph: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, color: colors.ink, marginTop: 16 },
  defRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  defDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.rule },
  defBadge: { width: 62, alignItems: 'center', marginTop: 1 },
  defText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  ruleCard: { backgroundColor: colors.paperRaised, ...frost(24), borderRadius: 20, padding: 16, marginTop: 12, gap: 8 },
  ruleText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkFaint, marginTop: 24 },
});
