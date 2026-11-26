// Shared pieces of the grouped-list screens (Profile, Menu): a full-screen sheet, groups and rows.
// Styled in Website Mint: mint paper with the 40 px grid, solid white cards and ink type.
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { notify } from '../lib/confirm';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Verdict } from '../types';
import { fonts, mint } from '../theme';
import { PaperGrid, useReducedMotion } from './Chrome';

/** Full-screen sheet that slides up, with a back chevron and a title. Android back calls `onBack`. */
export function Sheet({ visible, title, onBack, backLabel, children }: { visible: boolean; title: string; onBack: () => void; backLabel: string; children: ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={listStyles.screen}>
        <PaperGrid />
        <SafeAreaView style={listStyles.fill} edges={['top', 'bottom']}>
          <View style={listStyles.topBar}>
            <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel={backLabel}>
              <View style={listStyles.back}>
                <ChevronLeft size={24} color={mint.ink} strokeWidth={2.5} />
              </View>
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
      <View style={listStyles.groupPill}>
        <View style={listStyles.groupDot} />
        <Text style={listStyles.groupTitle}>{title}</Text>
      </View>
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
  const ink = danger ? mint.danger : mint.ink;
  return (
    <Pressable
      onPress={toggle ? () => toggle.onChange(!toggle.value) : onPress}
      disabled={!onPress && !toggle}
      accessibilityRole={toggle ? 'switch' : onPress ? 'button' : 'text'}
      accessibilityState={toggle ? { checked: toggle.value } : undefined}
      aria-checked={toggle ? toggle.value : undefined}
      style={({ pressed }) => [listStyles.row, pressed && listStyles.rowPressed]}
    >
      <Icon size={20} color={ink} strokeWidth={1.75} />
      <View style={listStyles.rowText}>
        <Text style={[listStyles.rowLabel, { color: ink }]}>{label}</Text>
        {detail && <Text style={listStyles.rowDetail}>{detail}</Text>}
      </View>
      {value !== undefined && <Text style={listStyles.rowValue}>{value}</Text>}
      {toggle && <Toggle value={toggle.value} />}
      {chevron && <ChevronRight size={18} color={mint.muted} strokeWidth={2} />}
    </Pressable>
  );
}

/**
 * Website Mint switch: ink track when on, grey track with a darker outline when off (the outline keeps the
 * off state visible on the white card), white thumb. Drawn by hand so it looks the same on iOS, Android
 * and web; the row is the control (role "switch"), so taps anywhere on the row flip it, as before.
 */
function Toggle({ value }: { value: boolean }) {
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return x.setValue(value ? 1 : 0);
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [value, reduced, x]);
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [0, TOGGLE_TRAVEL] });
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[listStyles.toggle, value ? listStyles.toggleOn : listStyles.toggleOff]}
    >
      <Animated.View style={[listStyles.thumb, { transform: [{ translateX }] }]} />
    </View>
  );
}

const TOGGLE_W = 51;
const TOGGLE_H = 31;
const THUMB = 27;
const TOGGLE_TRAVEL = TOGGLE_W - THUMB - 4;

/** Verdict chip for the Website Mint lists: white pill, hairline border, a colored dot and the darker verdict ink. */
export function VerdictChip({ verdict }: { verdict: Verdict }) {
  return (
    <View style={listStyles.chip}>
      <View style={[listStyles.chipDot, { backgroundColor: mint[verdict].tint }]} />
      <Text style={[listStyles.chipText, { color: mint[verdict].deep }]}>{verdict}</Text>
    </View>
  );
}

export function openLink(url: string) {
  Linking.openURL(url).catch(() => notify("Couldn't open link", url));
}

export const demoAlert = () => notify('Demo mode', 'The backend is not connected yet, so results are fake and there is no account.');

export const listStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: mint.paper },
  fill: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 14 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 2,
    backgroundColor: mint.surface,
    borderWidth: 1,
    borderColor: mint.border,
    boxShadow: `0px 2px 6px ${mint.shadow}`,
  },
  // iOS large title, set like the top of a Nutrition Facts panel.
  title: { fontFamily: fonts.black, fontSize: 36, lineHeight: 40, letterSpacing: -1.4, color: mint.ink, paddingHorizontal: 20, marginTop: 2 },
  titleRule: { height: 2, borderRadius: 1, backgroundColor: mint.border, marginHorizontal: 20, marginTop: 6, marginBottom: 4 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  group: { marginTop: 22 },
  // Section label as the website's mint pill: dot + uppercase, letter-spaced green text.
  groupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    backgroundColor: mint.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
    marginLeft: 8,
  },
  groupDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: mint.pillDot },
  groupTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
    color: mint.pillInk,
  },
  groupCard: { backgroundColor: mint.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: mint.border },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: mint.border,
    marginTop: -StyleSheet.hairlineWidth, // hides the first row's top line
  },
  rowPressed: { backgroundColor: mint.pressed },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: fonts.semibold, fontSize: 16, color: mint.ink },
  rowDetail: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: mint.muted, marginTop: 2 },
  rowValue: { fontFamily: fonts.medium, fontSize: 15, color: mint.muted },
  version: { fontFamily: fonts.serif, fontSize: 15, color: mint.muted, textAlign: 'center', marginTop: 28 },
  toggle: { width: TOGGLE_W, height: TOGGLE_H, borderRadius: TOGGLE_H / 2, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: mint.toggleOn },
  toggleOff: { backgroundColor: mint.toggleOff, borderWidth: 1, borderColor: mint.toggleOffBorder, padding: 1 },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: mint.thumb, boxShadow: `0px 2px 4px ${mint.thumbShadow}` },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: mint.chipBorder,
    backgroundColor: mint.surface,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.44 },
});
