import { BlurView } from 'expo-blur';
import type { ComponentProps, ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import type { ScanResult, Verdict } from '../types';
import { CubeIcon, DropIcon, LeafIcon, VerdictIcon } from './Icons';

export const verdictColor: Record<Verdict, string> = { CLEAN: colors.clean, OKAY: colors.okay, BAD: colors.bad };
const verdictIcon = { CLEAN: 'check', OKAY: 'dash', BAD: 'cross' } as const;

type BlurTarget = ComponentProps<typeof BlurView>['blurTarget'];

/** Top-right see-through card (dark tint + light blur): verdict, then the sugar lists that apply. */
export function VerdictPanel({ result, blurTarget }: { result: ScanResult; blurTarget: BlurTarget }) {
  const color = verdictColor[result.verdict];
  const sections: { title: string; items: string[]; icon: ReactNode }[] = [
    { title: 'Natural sugars', items: result.naturalSugars, icon: <LeafIcon color={colors.textMuted} /> },
    { title: 'Added sugars', items: result.addedSugars, icon: <CubeIcon color={colors.textMuted} /> },
    { title: 'Sweeteners', items: result.sweeteners, icon: <DropIcon color={colors.textMuted} /> },
  ].filter((s) => s.items.length > 0);

  return (
    <View style={styles.panel}>
      <BlurView
        intensity={20}
        tint="dark"
        blurTarget={blurTarget}
        blurMethod="dimezisBlurViewSdk31Plus"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.verdictRow}>
        <View style={glyphShadow}>
          <VerdictIcon kind={verdictIcon[result.verdict]} color={color} size={46} />
        </View>
        <View style={styles.verdictText}>
          <Text style={[styles.verdict, { color }]}>{result.verdict}</Text>
          <Text style={[styles.headline, { color }]} numberOfLines={2}>
            {result.headline}
          </Text>
        </View>
      </View>

      {sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <View style={[styles.sectionIcon, glyphShadow]}>{s.icon}</View>
          <View style={styles.sectionBody}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            {s.items.map((item) => (
              <Text key={item} style={styles.item}>
                {item}
              </Text>
            ))}
          </View>
        </View>
      ))}

      {result.note && (
        <View style={styles.noteRow}>
          <Text style={[styles.note, { color }]}>{result.note}</Text>
        </View>
      )}
    </View>
  );
}

// Very light shadow: the tinted card does the readability work, this just keeps edges crisp.
const textShadow = { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } };

// Same light shadow for the SVG icons: iOS shadows follow the drawn shape; Android needs a drop-shadow filter.
const glyphShadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 1, shadowOffset: { width: 0, height: 1 } },
  default: { filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))' },
});

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    right: 12,
    width: '54%',
    minWidth: 210,
    maxWidth: 320,
    backgroundColor: 'rgba(11,11,15,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    overflow: 'hidden',
    // 16 on every side: the verdict row already adds 16 on top, the last section adds 12 at the bottom.
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  verdictText: { flex: 1 },
  verdict: { fontFamily: fonts.extrabold, fontSize: 30, letterSpacing: 0.5, lineHeight: 34, ...textShadow },
  headline: { fontFamily: fonts.medium, fontSize: 14.5, marginTop: 1, ...textShadow },
  section: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  sectionIcon: { paddingTop: 1 },
  sectionBody: { flex: 1, gap: 6 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text, ...textShadow },
  item: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, ...textShadow },
  noteRow: { paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  note: { fontFamily: fonts.medium, fontSize: 14, ...textShadow },
});
