// Shared pieces of the glass grouped-list screens (Profile, Menu): a full-screen sheet, groups and rows.
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { notify } from '../lib/confirm';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, fonts, frost } from '../theme';
import { Glass } from './Glass';
import { Ambient } from './Chrome';

/** Full-screen sheet that slides up, with a back chevron and a title. Android back calls `onBack`. */
export function Sheet({ visible, title, onBack, backLabel, children }: { visible: boolean; title: string; onBack: () => void; backLabel: string; children: ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={listStyles.screen}>
        <Ambient />
        <SafeAreaView style={listStyles.fill} edges={['top', 'bottom']}>
          <View style={listStyles.topBar}>
            <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel={backLabel}>
              <Glass tone="dark" style={listStyles.back}>
                <ChevronLeft size={24} color={colors.ink} strokeWidth={2.5} />
              </Glass>
            </Pressable>
          </View>
          <Text style={listStyles.title} accessibilityRole="header">
            {title}
          </Text>
          <View style={listStyles.titleRule} />
          {children}
        </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={listStyles.group}>
      <Text style={listStyles.groupTitle}>{title}</Text>
      <View style={listStyles.groupCard}>{children}</View>
    </View>
  );
}

type RowProps = {
  icon: LucideIcon;
  label: string;
  detail?: string;
  value?: string;
  danger?: boolean;
  chevron?: boolean;
  onPress?: () => void;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
};

/** 52 px row: icon, label (+ one-line detail), then a value, a toggle or a chevron. */
export function Row({ icon: Icon, label, detail, value, danger, chevron, onPress, toggle }: RowProps) {
  const ink = danger ? colors.ugly : colors.ink;
  return (
    <Pressable
      onPress={toggle ? () => toggle.onChange(!toggle.value) : onPress}
      disabled={!onPress && !toggle}
      accessibilityRole={toggle ? 'switch' : onPress ? 'button' : 'text'}
      accessibilityState={toggle ? { checked: toggle.value } : undefined}
      style={({ pressed }) => [listStyles.row, pressed && listStyles.rowPressed]}
    >
      <Icon size={20} color={danger ? colors.ugly : colors.ink} strokeWidth={1.75} />
      <View style={listStyles.rowText}>
        <Text style={[listStyles.rowLabel, { color: ink }]}>{label}</Text>
        {detail && <Text style={listStyles.rowDetail}>{detail}</Text>}
      </View>
      {value !== undefined && <Text style={listStyles.rowValue}>{value}</Text>}
      {toggle && (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.ink }}
          thumbColor="#FFFFFF"
          {...({ activeThumbColor: '#FFFFFF' } as object) /* react-native-web: keep the thumb white when on */}
          ios_backgroundColor="rgba(255,255,255,0.2)"
        />
      )}
      {chevron && <ChevronRight size={18} color={colors.inkFaint} />}
    </Pressable>
  );
}

export function openLink(url: string) {
  Linking.openURL(url).catch(() => notify("Couldn't open link", url));
}

export const demoAlert = () => notify('Demo mode', 'The backend is not connected yet, so results are fake and there is no account.');

export const listStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  fill: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 14 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingRight: 2 },
  // iOS large title, set like the top of a Nutrition Facts panel.
  title: { fontFamily: fonts.black, fontSize: 36, lineHeight: 40, letterSpacing: -1.4, color: colors.ink, paddingHorizontal: 20, marginTop: 2 },
  titleRule: { height: 2, borderRadius: 1, backgroundColor: colors.rule, marginHorizontal: 20, marginTop: 6, marginBottom: 4 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  group: { marginTop: 22 },
  groupTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.inkMuted,
    marginBottom: 8,
    marginLeft: 16,
  },
  groupCard: { backgroundColor: colors.paperRaised, borderRadius: 20, overflow: 'hidden', ...frost(24) },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    marginTop: -StyleSheet.hairlineWidth, // hides the first row's top line
  },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  rowDetail: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.inkMuted, marginTop: 2 },
  rowValue: { fontFamily: fonts.medium, fontSize: 15, color: colors.inkMuted },
  version: { fontFamily: fonts.serif, fontSize: 15, color: colors.inkFaint, textAlign: 'center', marginTop: 28 },
  badge: { borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.black, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
});
