// Liquid Glass for the controls layer (top bar, shutter, floating pills). Apple's guidance: glass only on
// controls that float above content, never on the content itself (the result sheet stays solid).
//
//   iOS 26+ native build  -> real Liquid Glass (expo-glass-effect GlassView)
//   Older iOS / Android   -> system blur (expo-blur) with a light rim
//   Web                   -> CSS backdrop blur + saturation, a bright top rim and a soft inner glow,
//                            a close imitation of the real thing
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const nativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 'clear' over the live camera (more see-through), 'regular' everywhere else. */
  variant?: 'regular' | 'clear';
  /** Native only: the glass reacts to touch (primary buttons). */
  interactive?: boolean;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  /** 'dark' over photos and the camera; 'light' on the bone paper screens. */
  tone?: 'dark' | 'light';
};

export function Glass({ children, style, variant = 'regular', interactive, pointerEvents, tone = 'dark' }: Props) {
  const light = tone === 'light';
  if (nativeGlass) {
    return (
      <GlassView glassEffectStyle={variant} isInteractive={interactive} colorScheme={light ? 'light' : 'dark'} style={style} pointerEvents={pointerEvents}>
        {children}
      </GlassView>
    );
  }
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.web, light ? styles.webLight : variant === 'clear' ? styles.webClear : styles.webRegular, style]} pointerEvents={pointerEvents}>
        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']} style={styles.webSheen} />
        {children}
      </View>
    );
  }
  return (
    <View style={[styles.fallback, light && styles.fallbackLight, style]} pointerEvents={pointerEvents}>
      <BlurView intensity={variant === 'clear' ? 30 : 50} tint={light ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

const webGlass = (bg: string, blur: number) =>
  ({
    backgroundColor: bg,
    backdropFilter: `blur(${blur}px) saturate(180%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(180%)`,
  }) as unknown as ViewStyle;

const styles = StyleSheet.create({
  web: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    // Bright top rim, darker lower edge and a soft drop shadow, like iOS 27 glass.
    boxShadow:
      'inset 0px 1px 0px rgba(255,255,255,0.45), inset 0px -1px 0px rgba(0,0,0,0.25), inset 0px 0px 18px rgba(255,255,255,0.06), 0px 8px 24px rgba(0,0,0,0.28)',
  },
  webRegular: webGlass('rgba(38,38,44,0.42)', 22),
  webClear: webGlass('rgba(255,255,255,0.10)', 14),
  webLight: {
    ...webGlass('rgba(255,255,255,0.62)', 22),
    borderColor: 'rgba(14,14,12,0.08)',
    boxShadow: 'inset 0px 1px 0px rgba(255,255,255,0.9), 0px 4px 16px rgba(14,14,12,0.10)',
  } as ViewStyle,
  // Specular highlight across the top half.
  webSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  fallback: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(30,30,36,0.35)',
  },
  fallbackLight: { borderColor: 'rgba(14,14,12,0.1)', backgroundColor: 'rgba(255,255,255,0.5)' },
});
