// Shared pieces of the dark grouped-list screens (Profile, Menu): a full-screen sheet, groups and rows.
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Alert, Linking, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

/** Full-screen sheet that slides up, with a back chevron and a title. Android back calls `onBack`. */
export function Sheet({ visible, title, onBack, backLabel, children }: { visible: boolean; title: string; onBack: () => void; backLabel: string; children: ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>
        <SafeAreaView style={listStyles.screen} edges={['top', 'bottom']}>
          <View style={listStyles.topBar}>
            <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={backLabel}>
              <ChevronLeft size={26} color={colors.cardText} />
            </Pressable>
            <Text style={listStyles.title} accessibilityRole="header">
              {title}
            </Text>
          </View>
          {children}
        </SafeAreaView>
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
  const ink = danger ? colors.ugly : colors.cardText;
  return (
    <Pressable
      onPress={toggle ? () => toggle.onChange(!toggle.value) : onPress}
      disabled={!onPress && !toggle}
      accessibilityRole={toggle ? 'switch' : onPress ? 'button' : 'text'}
      accessibilityState={toggle ? { checked: toggle.value } : undefined}
      style={({ pressed }) => [listStyles.row, pressed && listStyles.rowPressed]}
    >
      <Icon size={20} color={danger ? colors.ugly : colors.cardTextMuted} strokeWidth={2} />
      <View style={listStyles.rowText}>
        <Text style={[listStyles.rowLabel, { color: ink }]}>{label}</Text>
        {detail && <Text style={listStyles.rowDetail}>{detail}</Text>}
      </View>
      {value !== undefined && <Text style={listStyles.rowValue}>{value}</Text>}
      {toggle && (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ false: 'rgba(255,255,255,0.18)', true: colors.clean }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="rgba(255,255,255,0.18)"
        />
      )}
      {chevron && <ChevronRight size={18} color={colors.textFaint} />}
    </Pressable>
  );
}

export function openLink(url: string) {
  Linking.openURL(url).catch(() => Alert.alert("Couldn't open link", url));
}

export const demoAlert = () => Alert.alert('Demo mode', 'The backend is not connected yet, so results are fake and there is no account.');

export const listStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingHorizontal: 12 },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.cardText },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  group: { marginTop: 20 },
  groupTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textFaint,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    marginTop: -StyleSheet.hairlineWidth, // hides the first row's top line
  },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: fonts.medium, fontSize: 16, color: colors.cardText },
  rowDetail: { fontFamily: fonts.regular, fontSize: 13, color: colors.cardTextMuted, marginTop: 2 },
  rowValue: { fontFamily: fonts.medium, fontSize: 15, color: colors.cardTextMuted },
  version: { fontFamily: fonts.regular, fontSize: 13, color: colors.textFaint, textAlign: 'center', marginTop: 28 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
});
