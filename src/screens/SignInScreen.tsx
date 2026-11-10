import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CharacterView, MASCOT_FEET_RATIO } from '../components/Character';
import { Ambient, Footer, useReducedMotion } from '../components/Chrome';
import { links } from '../config';
import { signInWithGoogle, takeAuthRedirectError } from '../lib/api';
import { notify } from '../lib/confirm';
import { colors, fonts, frost } from '../theme';

// Option A layout (docs/design/signin-option-a-*.png). Wide = laptop, narrow = phones and tablets.
const WIDE_FROM = 900;
// The cube's head starts 2.3% down its image; the big name's letters end this far above the head.
const HEAD_RATIO = 0.023;
const NAME_GAP = 12;
// How far the "p" of "Depth" hangs below the text line, per px of font size (Libre Franklin 800).
const DESCENDER = { wide: 0.04, narrow: 0.075 };
// The big mascot is drawn in a box this many times as tall as it is wide (the cube fits the height).
const MASCOT_BOX_ASPECT = 0.71;

function layout(width: number, height: number, topInset: number) {
  const wide = width >= WIDE_FROM;
  const side = wide ? 30 : 20;
  const buttonHeight = wide ? 72 : 60;
  const buttonTop = topInset + height * (wide ? 560 / 900 : 470 / 844);
  const small = wide ? { left: 20, top: 12, width: 84, height: 64 } : { left: 12, top: 12, width: 68, height: 52 };

  const fontSize = wide ? Math.min(width * 0.145, 210) : Math.min(width * 0.246, 96);
  const lineHeight = wide ? 1 : 0.92;
  const nameHeight = fontSize * lineHeight * (wide ? 1 : 2);
  const cube = (wide ? 290 : Math.min(width * (240 / 390), 290)) * MASCOT_BOX_ASPECT;

  // On short screens, shrink the name and the mascot together so they fit between the small mascot and the button.
  const room = buttonTop - (topInset + small.top + small.height + 8);
  const descender = fontSize * (wide ? DESCENDER.wide : DESCENDER.narrow);
  const needed = nameHeight + descender + NAME_GAP + cube * (MASCOT_FEET_RATIO - HEAD_RATIO);
  const s = Math.min(1, room / needed);

  const cubeSize = cube * s;
  const cubeTop = buttonTop - cubeSize * MASCOT_FEET_RATIO; // the shoes land on the button's top edge
  const nameBottom = cubeTop + cubeSize * HEAD_RATIO - (NAME_GAP + descender) * s;
  return {
    wide,
    side,
    buttonHeight,
    buttonTop,
    small,
    cubeSize,
    cubeTop,
    nameBottom,
    name: { fontSize: fontSize * s, lineHeight: fontSize * s * lineHeight, letterSpacing: -0.04 * fontSize * s },
    finePrintGap: wide ? 24 : 18,
  };
}

/** Google sign-in only (free through Supabase Auth). Supabase creates the account on first sign-in. */
export function SignInScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const L = layout(width, height - insets.top - insets.bottom, insets.top);

  // Coming back from Google with an error (for example, the person pressed Cancel).
  useEffect(() => setError(takeAuthRedirectError()), []);

  const start = async () => {
    setBusy(true);
    setError(null);
    const err = await signInWithGoogle();
    // On the web the page is leaving for Google; on phones the auth listener in App.tsx takes over.
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <View style={styles.root}>
      <Ambient />
      <Text accessibilityRole="header" style={styles.srOnly}>
        Sugar Depth sign in
      </Text>

      <SmallMascot box={{ ...L.small, top: insets.top + L.small.top, left: insets.left + L.small.left }} still={reduced} />

      <Text
        testID="signin-name"
        aria-hidden
        style={[styles.name, L.name, { bottom: height - L.nameBottom }]}
      >
        {L.wide ? 'Sugar Depth' : 'Sugar\nDepth'}
      </Text>

      <View style={[styles.buttonSlot, { top: L.buttonTop, left: L.side, right: L.side }]}>
        <GoogleButton onPress={start} busy={busy} height={L.buttonHeight} />
        <Text style={[styles.fineprint, { marginTop: L.finePrintGap }]}>We only get your name and email from Google.</Text>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      {/* In front of the button but never in the way of a tap. */}
      <View testID="signin-mascot" pointerEvents="none" style={[styles.bigMascot, { top: L.cubeTop, left: (width - L.cubeSize) / 2 }]}>
        <CharacterView mood="idle" size={L.cubeSize} motion={reduced ? 'still' : 'planted'} shadow={false} />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
        <Footer ink />
      </View>
    </View>
  );
}

/** The small mascot at the top-left: a link to sugardepth.com (new tab on the web, the browser on phones). */
function SmallMascot({ box, still }: { box: { left: number; top: number; width: number; height: number }; still: boolean }) {
  const web = Platform.OS === 'web';
  const open = () => Linking.openURL(links.website).catch(() => notify("Couldn't open link", links.website));
  // react-native-web renders href/hrefAttrs as an anchor; they aren't in React Native's types.
  const anchor = web ? ({ href: links.website, hrefAttrs: { target: '_blank', rel: 'noopener' } } as object) : {};
  return (
    <Pressable
      {...anchor}
      onPress={web ? undefined : open}
      accessibilityRole="link"
      accessibilityLabel="Sugar Depth website"
      style={({ pressed }) => [styles.smallMascot, box, pressed && styles.smallPressed]}
    >
      <CharacterView mood="idle" size={box.height} motion={still ? 'still' : 'full'} shadow={false} />
    </Pressable>
  );
}

function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

function GoogleButton({ onPress, busy, height }: { onPress: () => void; busy: boolean; height: number }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      style={({ pressed }) => [styles.button, { height, borderRadius: height / 2 }, busy && styles.buttonDisabled, pressed && styles.buttonPressed]}
    >
      {busy ? (
        <ActivityIndicator color={colors.onInk} />
      ) : (
        <View style={styles.buttonRow}>
          <GoogleMark />
          <Text style={styles.buttonText}>Continue with Google</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Clip the ambient glows (they hang past the edges) so the page never scrolls.
  root: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  smallMascot: { position: 'absolute', zIndex: 3, alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44 },
  smallPressed: { opacity: 0.8 },
  // See-through wordmark: the app's heavy Libre Franklin at 800, 20% of the paper white.
  name: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.extrabold,
    color: 'rgba(244,241,234,0.2)',
  },
  buttonSlot: { position: 'absolute', zIndex: 1 },
  bigMascot: { position: 'absolute', zIndex: 2 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  button: {
    backgroundColor: 'rgba(244,246,251,0.92)',
    ...frost(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.35 },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fineprint: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkMuted, textAlign: 'center' },
  buttonText: { fontFamily: fonts.bold, fontSize: 18, color: colors.onInk },
  error: { fontFamily: fonts.semibold, fontSize: 14, color: colors.bad, textAlign: 'center', marginTop: 8 },
});
