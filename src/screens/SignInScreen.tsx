import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CharacterView, MASCOT_FEET_RATIO } from '../components/Character';
import { Ambient, Footer, useReducedMotion } from '../components/Chrome';
import { SmallMascot, smallMascotBox, WIDE_FROM } from '../components/SmallMascot';
import { CrystalSwarm } from '../components/CrystalSwarm';
import { completeSignInFromLink, isGoogleSignInRunning, signInWithGoogle, takeAuthRedirectError } from '../lib/api';
import { describeAuthUrl, isAuthLink } from '../lib/authFlow';
import { devLog } from '../lib/devLog';
import { colors, fonts, frost } from '../theme';

// Option A layout (docs/design/signin-option-a-*.png). Wide = laptop, narrow = phones and tablets.
// Where the big name sits (unchanged from the first Option A build): its letters end NAME_GAP above
// where a cube at HEAD_RATIO would start, with DESCENDER per px of font size for the "p".
const HEAD_RATIO = 0.023;
const NAME_GAP = 12;
const DESCENDER = { wide: 0.04, narrow: 0.075 };
// The big mascot is drawn in a box this many times as tall as it is wide (the cube fits the height).
const MASCOT_BOX_ASPECT = 0.71;
// Below the measured name: the gap to the mascot's head, and the least room kept above the footer.
const MASCOT_GAP = 16;
const FOOTER_GAP = 24;
const MIN_CUBE = 60;
// Width of the block the crystal swarm circles (main's single sign-in column).
const CONTENT_MAX = 440;

/** Where the big name sits and how it is set. The mascot, button and note are placed later, under the measured name. */
function layout(width: number, height: number, topInset: number) {
  const wide = width >= WIDE_FROM;
  const side = wide ? 30 : 20;
  const buttonHeight = wide ? 72 : 60;
  const buttonTop = topInset + height * (wide ? 560 / 900 : 470 / 844);
  const small = smallMascotBox(width);

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
  const cubeTop = buttonTop - cubeSize * MASCOT_FEET_RATIO;
  const nameBottom = cubeTop + cubeSize * HEAD_RATIO - (NAME_GAP + descender) * s;
  const lines = wide ? ['Sugar Depth'] : ['Sugar', 'Depth'];
  const pitch = fontSize * s * lineHeight; // distance from one line's baseline to the next
  return {
    wide,
    side,
    buttonHeight,
    maxCube: cubeSize,
    lines,
    pitch,
    nameTop: nameBottom - pitch * lines.length, // top of the original (tight) line boxes
    name: { fontSize: fontSize * s, letterSpacing: -0.04 * fontSize * s },
    finePrintGap: wide ? 24 : 18,
  };
}

/**
 * The mascot, button and note, hung under the measured name: head MASCOT_GAP below the name's descenders,
 * shoes on the button's top edge, and the note at least FOOTER_GAP above the footer. On a short screen the
 * mascot shrinks (the feet stay on the button) instead of anything overlapping.
 */
function group(nameBottom: number, maxCube: number, slotHeight: number, footerTop: number) {
  const cubeTop = nameBottom + MASCOT_GAP;
  const fits = (footerTop - FOOTER_GAP - slotHeight - cubeTop) / MASCOT_FEET_RATIO;
  const cubeSize = Math.max(MIN_CUBE, Math.min(maxCube, fits));
  return { cubeTop, cubeSize, buttonTop: cubeTop + cubeSize * MASCOT_FEET_RATIO };
}

/** Google sign-in only (free through Supabase Auth). Supabase creates the account on first sign-in. */
export function SignInScreen({ onBack }: { onBack?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The crystal swarm (web) circles the mascot column and keeps sharp crystals off the name, the button block and the footer.
  const content = useRef<ComponentRef<typeof View>>(null);
  const nameRef = useRef<ComponentRef<typeof View>>(null);
  const slotRef = useRef<ComponentRef<typeof View>>(null);
  const footerRef = useRef<ComponentRef<typeof View>>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const L = layout(width, height - insets.top - insets.bottom, insets.top);

  // Measured on screen: one name line at its natural height (it holds the g/p descenders on every platform),
  // the bottom of the whole name, the button + note block, and the footer's top.
  const [lineHeight, setLineHeight] = useState(0);
  const [nameHeight, setNameHeight] = useState(0);
  const [slotHeight, setSlotHeight] = useState(0);
  const [footerTop, setFooterTop] = useState(0);
  const ready = lineHeight > 0 && nameHeight > 0 && slotHeight > 0 && footerTop > 0;
  // Natural-height lines, shifted so each baseline lands where the tight lines put it.
  const shift = lineHeight ? (L.pitch - lineHeight) / 2 : 0;
  const nameTop = L.nameTop + shift;
  // The web reports a new size on layout but not always a new position, so the bottom is our top + its measured height.
  const G = group(nameTop + nameHeight, L.maxCube, slotHeight, footerTop || height);

  // Coming back from Google with an error (for example, the person pressed Cancel).
  useEffect(() => setError(takeAuthRedirectError()), []);

  // The sign-in return link reached the app outside the Google flow: Android Expo Go reloads the app
  // when exps://<host>/--/auth?code=... arrives (it is then the initial URL), or the Custom Tab's
  // "dismiss" beat the link. Trade its code for a session once (api.ts); App.tsx's auth listener then
  // leaves this screen. An error in the link or a failed exchange is shown, never silently dropped.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let live = true;
    const onLink = (url: string | null) => {
      if (!url || !isAuthLink(url)) return;
      devLog('auth', `incoming link: ${describeAuthUrl(url)}`);
      setBusy(true);
      setError(null);
      completeSignInFromLink(url)
        .then((err) => {
          if (live && err) setError(err);
        })
        .catch(() => {
          if (live) setError('Could not sign you in. Try again.');
        })
        .finally(() => {
          if (live) setBusy(false);
        });
    };
    Linking.getInitialURL()
      .then(onLink)
      .catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => onLink(url));
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  const start = async () => {
    devLog('auth', `tap (flow running: ${isGoogleSignInRunning() ? 'yes' : 'no'})`);
    setBusy(true);
    setError(null);
    try {
      const err = await signInWithGoogle();
      // On the web the page is leaving for Google; on phones the auth listener in App.tsx takes over.
      if (err) setError(err);
    } catch {
      setError('Google sign-in failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Ambient />
      {/* Behind everything else on the screen, above the glows; never takes a tap. */}
      <CrystalSwarm around={content} quiet={[nameRef, slotRef, footerRef]} />
      <View
        ref={content}
        pointerEvents="none"
        style={[styles.content, { top: nameTop, height: Math.max(0, G.buttonTop + slotHeight - nameTop), width: Math.min(CONTENT_MAX, width - 2 * L.side), left: (width - Math.min(CONTENT_MAX, width - 2 * L.side)) / 2 }]}
      />
      <Text accessibilityRole="header" style={styles.srOnly}>
        Sugar Depth sign in
      </Text>

      <SmallMascot still={reduced} />

      <View
        ref={nameRef}
        testID="signin-name"
        aria-hidden
        pointerEvents="none"
        onLayout={(e) => setNameHeight(e.nativeEvent.layout.height)}
        style={[styles.nameGroup, { top: nameTop }, !ready && styles.hidden]}
      >
        {L.lines.map((line, i) => (
          <Text
            key={line}
            onLayout={i === 0 ? (e) => setLineHeight(e.nativeEvent.layout.height) : undefined}
            style={[styles.name, L.name, i > 0 && lineHeight > 0 && { marginTop: L.pitch - lineHeight }]}
          >
            {line}
          </Text>
        ))}
      </View>

      <View
        ref={slotRef}
        onLayout={(e) => setSlotHeight(e.nativeEvent.layout.height)}
        style={[styles.buttonSlot, { top: G.buttonTop, left: L.side, right: L.side }, !ready && styles.hidden]}
      >
        <GoogleButton onPress={start} busy={busy} height={L.buttonHeight} />
        <Text style={[styles.fineprint, { marginTop: L.finePrintGap }]}>We only get your name and email from Google.</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        {onBack && (
          <Pressable onPress={onBack} accessibilityRole="button" style={styles.back}>
            <Text style={styles.link}>Back to camera</Text>
          </Pressable>
        )}
      </View>

      {/* In front of the button but never in the way of a tap. */}
      <View
        testID="signin-mascot"
        pointerEvents="none"
        style={[styles.bigMascot, { top: G.cubeTop, left: (width - G.cubeSize) / 2 }, !ready && styles.hidden]}
      >
        <CharacterView mood="idle" size={G.cubeSize} motion={reduced ? 'still' : 'planted'} shadow={false} />
      </View>

      <View ref={footerRef} onLayout={(e) => setFooterTop(e.nativeEvent.layout.y)} style={[styles.footer, { paddingBottom: insets.bottom }]}>
        <Footer ink />
      </View>
    </View>
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

/** Also used by the guest scan prompt, which leaves out `height` and gets the standard 58 px button. */
export function GoogleButton({ onPress, busy, height }: { onPress: () => void; busy: boolean; height?: number }) {
  const size = height ? { height, borderRadius: height / 2 } : styles.buttonStandard;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      style={({ pressed }) => [styles.button, size, busy && styles.buttonDisabled, pressed && styles.buttonPressed]}
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
  // See-through wordmark: the app's heavy Libre Franklin at 800, 20% of the paper white.
  nameGroup: { position: 'absolute', left: 0, right: 0 },
  name: {
    textAlign: 'center',
    fontFamily: fonts.extrabold,
    color: 'rgba(244,241,234,0.2)',
    includeFontPadding: false, // Android: the line is exactly ascent + descent, like iOS and the web
  },
  hidden: { opacity: 0 }, // until the name, button block and footer have been measured
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
  buttonStandard: { height: 58, borderRadius: 29, marginTop: 4 },
  content: { position: 'absolute' }, // invisible: the block the crystal swarm circles
  back: { alignSelf: 'center', marginTop: 12, padding: 4 },
  link: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
});
