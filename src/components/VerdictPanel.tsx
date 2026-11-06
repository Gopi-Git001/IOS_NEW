import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import type { ScanResult, Verdict } from '../types';
import { CubeIcon, DropIcon, LeafIcon } from './Icons';

export const verdictColor: Record<Verdict, string> = { CLEAN: colors.clean, BAD: colors.bad, UGLY: colors.ugly };
// Glossy balloon-letter verdict words (assets/glossy/word-*.webp) with their width/height ratios.
const verdictWord = {
  CLEAN: { src: require('../../assets/glossy/word-clean.webp'), ratio: 734 / 260 },
  BAD: { src: require('../../assets/glossy/word-bad.webp'), ratio: 549 / 260 },
  UGLY: { src: require('../../assets/glossy/word-ugly.webp'), ratio: 529 / 260 },
} as const;
const WORD_HEIGHT = 64;

type BlurTarget = ComponentProps<typeof BlurView>['blurTarget'];

/** Top-right see-through card (dark tint + light blur): verdict, then the sugar lists that apply. */
export function VerdictPanel({ result, blurTarget, listsPending = false }: { result: ScanResult; blurTarget: BlurTarget; listsPending?: boolean }) {
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
      {/* Glossy finish: verdict-tinted glass, a bright sheen across the top, a soft glow under the word. */}
      <LinearGradient
        colors={[color + '59', 'rgba(11,11,15,0.35)', 'rgba(11,11,15,0.55)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
        locations={[0, 0.35, 0.36, 1]}
        style={styles.sheen}
        pointerEvents="none"
      />
      <View style={styles.verdictRow}>
        <Image
          source={verdictWord[result.verdict].src}
          accessibilityLabel={result.verdict}
          resizeMode="contain"
          style={[styles.word, { width: Math.min(WORD_HEIGHT * verdictWord[result.verdict].ratio, 270) }]}
        />
        <Text style={[styles.headline, textShadow]} numberOfLines={2}>
          {result.headline}
        </Text>
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

      {listsPending && (
        <View style={[styles.section, styles.pendingRow]}>
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={styles.item}>Listing the sugars...</Text>
        </View>
      )}

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
    width: '60%',
    minWidth: 220,
    maxWidth: 340,
    backgroundColor: 'rgba(11,11,15,0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.38)',
    borderRadius: 28,
    overflow: 'hidden',
    // 16 on every side: the verdict row already adds 16 on top, the last section adds 12 at the bottom.
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 96, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  verdictRow: { alignItems: 'flex-start', gap: 6, paddingTop: 14, paddingBottom: 14 },
  word: { height: WORD_HEIGHT, marginLeft: -4 },
  headline: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
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
  pendingRow: { alignItems: 'center' },
  noteRow: { paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  note: { fontFamily: fonts.medium, fontSize: 14, ...textShadow },
});
