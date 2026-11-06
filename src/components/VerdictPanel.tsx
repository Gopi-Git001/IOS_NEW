import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import type { ScanResult, Verdict } from '../types';
import { CubeIcon, DropIcon, LeafIcon, VerdictIcon } from './Icons';

export const verdictColor: Record<Verdict, string> = { CLEAN: colors.clean, BAD: colors.bad, UGLY: colors.ugly };
const verdictIcon = { CLEAN: 'check', BAD: 'dash', UGLY: 'cross' } as const;
const TIERS: Verdict[] = ['CLEAN', 'BAD', 'UGLY'];

type BlurTarget = ComponentProps<typeof BlurView>['blurTarget'];

/**
 * Top-right glass HUD card, laid out like a gamer profile:
 * badge + verdict "rank", a 3-step sugar level bar, stat counters, then the ingredient loadout.
 */
export function VerdictPanel({ result, blurTarget, listsPending = false }: { result: ScanResult; blurTarget: BlurTarget; listsPending?: boolean }) {
  const color = verdictColor[result.verdict];
  const level = TIERS.indexOf(result.verdict) + 1;
  const stats: { label: string; items: string[]; icon: ReactNode }[] = [
    { label: 'Natural', items: result.naturalSugars, icon: <LeafIcon color={colors.textMuted} size={14} /> },
    { label: 'Added', items: result.addedSugars, icon: <CubeIcon color={colors.textMuted} size={14} /> },
    { label: 'Sweet', items: result.sweeteners, icon: <DropIcon color={colors.textMuted} size={14} /> },
  ];
  const loadout = [
    { title: 'Natural sugars', items: result.naturalSugars },
    { title: 'Added sugars', items: result.addedSugars },
    { title: 'Sweeteners', items: result.sweeteners },
  ].filter((s) => s.items.length > 0);

  return (
    <View style={[styles.panel, { borderColor: `${color}55` }]}>
      <BlurView intensity={28} tint="dark" blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" style={StyleSheet.absoluteFill} />
      {/* glass sheen on the top edge */}
      <LinearGradient colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']} style={styles.sheen} pointerEvents="none" />
      <Corners color={color} />

      {/* profile header */}
      <View style={styles.profile}>
        <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}22` }, glow(color)]}>
          <View style={styles.badgeIcon}>
            <VerdictIcon kind={verdictIcon[result.verdict]} color={color} size={30} />
          </View>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.kicker}>SUGAR RANK</Text>
          <Text style={[styles.verdict, { color }, textGlow(color)]}>{result.verdict}</Text>
        </View>
      </View>
      <Text style={styles.headline} numberOfLines={2}>
        {result.headline}
      </Text>

      {/* sugar level bar */}
      <View style={styles.levelRow}>
        <Text style={styles.kicker}>SUGAR LVL</Text>
        <Text style={[styles.levelValue, { color }]}>
          {level}/{TIERS.length}
        </Text>
      </View>
      <View style={styles.levelBar}>
        {TIERS.map((t, i) => (
          <View key={t} style={[styles.levelSeg, i < level ? { backgroundColor: color, ...glow(color) } : styles.levelSegOff]} />
        ))}
      </View>

      {/* stat counters */}
      <View style={styles.stats}>
        {stats.map((s, i) => (
          <View key={s.label} style={[styles.stat, i > 0 && styles.statDivider]}>
            <View style={styles.statLabelRow}>
              {s.icon}
              <Text style={[styles.statValue, s.items.length > 0 && s.label !== 'Natural' && { color }]}>{s.items.length}</Text>
            </View>
            <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      {/* ingredient loadout */}
      {loadout.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={styles.kicker}>{s.title.toUpperCase()}</Text>
          <View style={styles.chips}>
            {s.items.map((item) => (
              <View key={item} style={styles.chip}>
                <Text style={styles.chipText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {listsPending && (
        <View style={[styles.section, styles.pendingRow]}>
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={styles.chipText}>Listing the sugars...</Text>
        </View>
      )}

      {result.note && (
        <View style={styles.noteRow}>
          <Text style={[styles.note, { color }]}>{'> '}{result.note}</Text>
        </View>
      )}
    </View>
  );
}

/** HUD corner brackets in the verdict color. */
function Corners({ color }: { color: string }) {
  const b = { borderColor: color, position: 'absolute' as const, width: 14, height: 14 };
  return (
    <>
      <View pointerEvents="none" style={[b, { top: 6, left: 6, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 4 }]} />
      <View pointerEvents="none" style={[b, { top: 6, right: 6, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 4 }]} />
      <View pointerEvents="none" style={[b, { bottom: 6, left: 6, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 4 }]} />
      <View pointerEvents="none" style={[b, { bottom: 6, right: 6, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 4 }]} />
    </>
  );
}

const glow = (color: string) =>
  Platform.select({
    ios: { shadowColor: color, shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
    android: { elevation: 0 },
    default: { boxShadow: `0 0 8px ${color}99` },
  }) as object;

const textGlow = (color: string) => ({ textShadowColor: `${color}AA`, textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } });
const textShadow = { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } };

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    right: 12,
    width: '58%',
    minWidth: 220,
    maxWidth: 330,
    backgroundColor: 'rgba(10,12,18,0.42)',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sheen: { position: 'absolute', left: 0, right: 0, top: 0, height: 56 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 46, height: 46, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] },
  badgeIcon: { transform: [{ rotate: '-45deg' }] },
  profileText: { flex: 1, marginLeft: 4 },
  kicker: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 1.6, color: colors.textFaint, ...textShadow },
  verdict: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 34, letterSpacing: 1 },
  headline: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.text, marginTop: 8, ...textShadow },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 },
  levelValue: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1 },
  levelBar: { flexDirection: 'row', gap: 4, marginTop: 6 },
  levelSeg: { flex: 1, height: 7, borderRadius: 2, transform: [{ skewX: '-20deg' }] },
  levelSegOff: { backgroundColor: 'rgba(255,255,255,0.14)' },
  stats: {
    flexDirection: 'row',
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.divider },
  statValue: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.text, ...textShadow },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel: { fontFamily: fonts.semibold, fontSize: 9.5, letterSpacing: 1.2, color: colors.textMuted },
  section: { paddingTop: 12, gap: 7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text, ...textShadow },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteRow: { marginTop: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  note: { fontFamily: fonts.semibold, fontSize: 13.5, ...textShadow },
});
