import { Fragment, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CharacterView, MASCOT_FEET_RATIO } from '../components/Character';
import { Footer, PaperGrid, useReducedMotion } from '../components/Chrome';
import { SmallMascot, smallMascotBox, WIDE_FROM } from '../components/SmallMascot';
import { signInWithGoogle, takeAuthRedirectError } from '../lib/api';
import { colors, fonts, frost, mint } from '../theme';

// One-time sign-in intro. t = 0 is the moment `ready` becomes true, not mount. SPEED scales every delay and duration.
const INTRO = {
  SPEED: 1,
  buttonMs: 350,
  hopDelay: 350,
  hopRise: 302,
  hopFall: 248,
  letterStart: 700,
  letterStagger: 40,
  letterDrop: 176,
  letterRebound: 74,
  letterSettle: 70,
  letters: 10,
  squashDelay: 900,
  squashA: 105,
  squashB: 105,
  squashC: 90,
  restDelay: 1150,
  fadeMs: 200,
  hlStart: [1150, 1250],
  hlMs: 350,
  footerDelay: 1200,
  plantedAt: 1200,
  smallDelay: 1250,
};

const introMs = (n: number) => n * INTRO.SPEED;
const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
const easeHop = Easing.bezier(0.3, 0.6, 0.5, 1);
const easeLetter = Easing.bezier(0.5, 0, 0.5, 1);
const easeSoft = Easing.out(Easing.ease);

const letterDrop = (p: Animated.Value, delay: number) =>
  Animated.sequence([
    Animated.delay(introMs(delay)),
    Animated.timing(p, { toValue: 0.55, duration: introMs(INTRO.letterDrop), easing: easeLetter, useNativeDriver: true }),
    Animated.timing(p, { toValue: 0.78, duration: introMs(INTRO.letterRebound), easing: easeLetter, useNativeDriver: true }),
    Animated.timing(p, { toValue: 1, duration: introMs(INTRO.letterSettle), easing: easeLetter, useNativeDriver: true }),
  ]);

const wipe = (p: Animated.Value, delay: number) =>
  Animated.sequence([
    Animated.delay(introMs(delay)),
    Animated.timing(p, { toValue: 1, duration: introMs(INTRO.hlMs), easing: easeOut, useNativeDriver: true }),
  ]);

const fadeIn = (p: Animated.Value, delay: number) =>
  Animated.sequence([
    Animated.delay(introMs(delay)),
    Animated.timing(p, { toValue: 1, duration: introMs(INTRO.fadeMs), easing: easeSoft, useNativeDriver: true }),
  ]);

type SignInWord = { highlight: number; letters: { char: string; index: number }[] };

/** Both layouts index S…h as 0…9. The space between "Sugar" and "Depth" is not a letter. */
function signInLines(lines: string[]): { index: number; words: SignInWord[] }[] {
  let glyph = 0;
  let highlight = 0;
  return lines.map((line, index) => ({
    index,
    words: line.split(' ').map((word) => ({
      highlight: highlight++,
      letters: Array.from(word).map((char) => ({ char, index: glyph++ })),
    })),
  }));
}

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
/** Above this viewport width the web build centres a phone-width column instead of stretching. */
const COLUMN_FROM = 600;
const COLUMN_MAX = 440;

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
  const [introDone, setIntroDone] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const reducedNow = useRef(reduced);
  reducedNow.current = reduced;
  // Browsers on a laptop would otherwise stretch the phone layout edge to edge, with a button wider
  // than the screen is tall. Past COLUMN_FROM the screen becomes a centred phone-width column on the
  // paper background; phones and tablets keep the full viewport. Native is untouched.
  const column = Platform.OS === 'web' && width > COLUMN_FROM;
  const width_ = column ? Math.min(COLUMN_MAX, width) : width;
  const L = layout(width_, height - insets.top - insets.bottom, insets.top);

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

  const start = async () => {
    setBusy(true);
    setError(null);
    const err = await signInWithGoogle();
    // On the web the page is leaving for Google; on phones the auth listener in App.tsx takes over.
    if (err) setError(err);
    setBusy(false);
  };

  const v = useRef({
    button: new Animated.Value(0),
    rest: new Animated.Value(0),
    footer: new Animated.Value(0),
    small: new Animated.Value(0),
    hop: new Animated.Value(0),
    squash: new Animated.Value(0),
    hl: [new Animated.Value(0), new Animated.Value(0)],
    letters: Array.from({ length: INTRO.letters }, () => new Animated.Value(0)),
  }).current;
  const introRan = useRef(false);
  const animRef = useRef<ReturnType<typeof Animated.parallel> | null>(null);

  const setAllFinal = () => {
    animRef.current?.stop();
    animRef.current = null;
    [v.button, v.rest, v.footer, v.small, v.hop, v.squash, ...v.hl, ...v.letters].forEach((a) => {
      a.stopAnimation();
      a.setValue(1);
    });
    setIntroDone(true);
  };

  // Plays once, the first time the name, button and footer have been measured. Resize does not replay it.
  useEffect(() => {
    if (!ready || introRan.current) return;
    introRan.current = true;
    if (reducedNow.current) {
      setAllFinal();
      return;
    }
    const buttonIn = Animated.timing(v.button, { toValue: 1, duration: introMs(INTRO.buttonMs), easing: easeOut, useNativeDriver: true });
    const hop = Animated.sequence([
      Animated.delay(introMs(INTRO.hopDelay)),
      Animated.timing(v.hop, { toValue: 0.55, duration: introMs(INTRO.hopRise), easing: easeHop, useNativeDriver: true }),
      Animated.timing(v.hop, { toValue: 1, duration: introMs(INTRO.hopFall), easing: easeHop, useNativeDriver: true }),
    ]);
    const squashLand = Animated.sequence([
      Animated.timing(v.squash, { toValue: 0.35, duration: introMs(INTRO.squashA), easing: easeSoft, useNativeDriver: true }),
      Animated.timing(v.squash, { toValue: 0.7, duration: introMs(INTRO.squashB), easing: easeSoft, useNativeDriver: true }),
      Animated.timing(v.squash, { toValue: 1, duration: introMs(INTRO.squashC), easing: easeSoft, useNativeDriver: true }),
    ]);
    const anim = Animated.parallel([
      buttonIn,
      hop,
      Animated.sequence([Animated.delay(introMs(INTRO.squashDelay)), squashLand]),
      ...v.letters.map((p, i) => letterDrop(p, INTRO.letterStart + INTRO.letterStagger * i)),
      wipe(v.hl[0], INTRO.hlStart[0]),
      wipe(v.hl[1], INTRO.hlStart[1]),
      fadeIn(v.rest, INTRO.restDelay),
      fadeIn(v.footer, INTRO.footerDelay),
      fadeIn(v.small, INTRO.smallDelay),
    ]);
    animRef.current = anim;
    anim.start();
    const timer = setTimeout(() => setIntroDone(true), introMs(INTRO.plantedAt));
    return () => {
      anim.stop();
      clearTimeout(timer);
    };
  }, [ready, v]);

  // Reduced motion switched on mid-intro: stop and show the finished frame.
  useEffect(() => {
    if (reduced && introRan.current) setAllFinal();
  }, [reduced, v]);

  const fontK = L.name.fontSize / 93;
  const hopK = G.cubeSize / 166;
  const bandInset = 4 * fontK;
  const band = {
    position: 'absolute' as const,
    left: -bandInset,
    right: -bandInset,
    top: (lineHeight - L.pitch) / 2 + 0.56 * L.pitch,
    height: 0.34 * L.pitch,
    backgroundColor: mint.highlight,
  };

  return (
    <View style={styles.page}>
      <View style={[styles.root, column && { width: COLUMN_MAX }]}>
      <PaperGrid />
      <Text accessibilityRole="header" style={styles.srOnly}>
        Sugar Depth sign in
      </Text>

      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 3, opacity: v.small }]}>
        <SmallMascot still={reduced} layoutWidth={width_} />
      </Animated.View>

      <View
        testID="signin-name"
        aria-hidden
        // Native only: react-native-web forwards these as unknown DOM attributes.
        {...(Platform.OS === 'web'
          ? {}
          : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const })}
        pointerEvents="none"
        onLayout={(e) => setNameHeight(e.nativeEvent.layout.height)}
        style={[styles.nameGroup, { top: nameTop }, !ready && styles.hidden]}
      >
        {signInLines(L.lines).map((line) => (
          <View
            key={line.index}
            onLayout={line.index === 0 ? (e) => setLineHeight(e.nativeEvent.layout.height) : undefined}
            style={[styles.line, line.index > 0 && lineHeight > 0 && { marginTop: L.pitch - lineHeight }]}
          >
            {line.words.map((word, wi) => {
              const highlight = v.hl[word.highlight] ?? v.hl[0];
              return (
                <Fragment key={word.letters[0]?.index ?? wi}>
                  {wi > 0 ? <Text style={[styles.name, L.name]}>{' '}</Text> : null}
                  <View style={styles.word}>
                    <Animated.View pointerEvents="none" style={[band, { transform: [{ scaleX: highlight }], transformOrigin: 'left center' }]} />
                    {word.letters.map(({ char, index }) => {
                      const p = v.letters[index];
                      if (!p) return null;
                      return (
                        <Animated.Text
                          key={index}
                          style={[
                            styles.name,
                            L.name,
                            {
                              opacity: p.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 1, 1] }),
                              transform: [{ translateY: p.interpolate({ inputRange: [0, 0.55, 0.78, 1], outputRange: [-44 * fontK, 0, -7 * fontK, 0] }) }],
                            },
                          ]}
                        >
                          {char}
                        </Animated.Text>
                      );
                    })}
                  </View>
                </Fragment>
              );
            })}
          </View>
        ))}
      </View>

      <View
        onLayout={(e) => setSlotHeight(e.nativeEvent.layout.height)}
        style={[styles.buttonSlot, { top: G.buttonTop, left: L.side, right: L.side }, !ready && styles.hidden]}
      >
        <Animated.View style={{ opacity: v.button, transform: [{ translateY: v.button.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] }}>
          <GoogleButton variant="ink" onPress={start} busy={busy} height={L.buttonHeight} />
        </Animated.View>
        <Animated.View style={{ opacity: v.rest }}>
          <Text style={[styles.fineprint, { marginTop: L.finePrintGap }]}>We only get your name and email from Google.</Text>
          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          {onBack && (
            <Pressable onPress={onBack} accessibilityRole="button" style={styles.back}>
              <Text style={styles.link}>Back to camera</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>

      {/* In front of the button but never in the way of a tap. */}
      <View
        testID="signin-mascot"
        pointerEvents="none"
        style={[styles.bigMascot, { top: G.cubeTop, left: (width_ - G.cubeSize) / 2 }, !ready && styles.hidden]}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            opacity: v.hop.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateX: v.hop.interpolate({ inputRange: [0, 0.55, 1], outputRange: [-150 * hopK, -60 * hopK, 0] }) },
              { translateY: v.hop.interpolate({ inputRange: [0, 0.55, 1], outputRange: [220 * hopK, -70 * hopK, 0] }) },
            ],
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              transformOrigin: '50% 99%',
              transform: [
                { scaleX: v.squash.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [1, 1.08, 0.98, 1] }) },
                { scaleY: v.squash.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [1, 0.9, 1.03, 1] }) },
              ],
            }}
          >
            <CharacterView mood="idle" size={G.cubeSize} shadow={false} skipEnter motion={reduced || !introDone ? 'still' : 'planted'} />
          </Animated.View>
        </Animated.View>
      </View>

      <View onLayout={(e) => setFooterTop(e.nativeEvent.layout.y)} style={[styles.footer, { paddingBottom: insets.bottom }]}>
        <Animated.View style={{ opacity: v.footer }}>
          <Footer ink />
        </Animated.View>
      </View>
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

/**
 * Also used by the guest scan prompt, which leaves out `height` and gets the standard 58 px button.
 * `glass` (default) is the frosted pill on the dark camera modal; `ink` is the solid black pill on the mint sign-in screen.
 */
export function GoogleButton({
  onPress,
  busy,
  height,
  variant = 'glass',
}: {
  onPress: () => void;
  busy: boolean;
  height?: number;
  variant?: 'glass' | 'ink';
}) {
  const size = height ? { height, borderRadius: height / 2 } : styles.buttonStandard;
  const ink = variant === 'ink';
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      style={({ pressed }) => [styles.button, ink ? styles.buttonInk : styles.buttonGlass, size, busy && styles.buttonDisabled, pressed && styles.buttonPressed]}
    >
      {busy ? (
        <ActivityIndicator color={ink ? mint.onInk : colors.onInk} />
      ) : (
        <View style={styles.buttonRow}>
          <GoogleMark />
          <Text style={[styles.buttonText, ink && styles.buttonTextInk]}>Continue with Google</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Mint paper fills the screen. PaperGrid draws the grid, fade and glow inside it, and nothing scrolls.
  // Clip the ambient glows (they hang past the edges) so the page never scrolls.
  // page: the whole viewport on a laptop, with the phone-width column centred on it.
  page: { flex: 1, backgroundColor: mint.paper, alignItems: 'center' },
  root: { flex: 1, width: '100%', backgroundColor: mint.paper, overflow: 'hidden' },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  // Ink wordmark: the app's heavy Libre Franklin at 800, with a mint highlighter band behind each word.
  nameGroup: { position: 'absolute', left: 0, right: 0 },
  line: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start' },
  word: { position: 'relative', flexDirection: 'row', alignItems: 'flex-start' },
  name: {
    textAlign: 'center',
    fontFamily: fonts.extrabold,
    color: mint.ink,
    includeFontPadding: false, // Android: the line is exactly ascent + descent, like iOS and the web
  },
  hidden: { opacity: 0 }, // until the name, button block and footer have been measured
  buttonSlot: { position: 'absolute', zIndex: 1 },
  bigMascot: { position: 'absolute', zIndex: 2 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  button: { alignItems: 'center', justifyContent: 'center' },
  buttonGlass: { backgroundColor: 'rgba(244,246,251,0.92)', ...frost(16) },
  buttonInk: { backgroundColor: mint.ink },
  buttonDisabled: { opacity: 0.35 },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fineprint: { fontFamily: fonts.semibold, fontSize: 13, color: mint.muted, textAlign: 'center' },
  buttonText: { fontFamily: fonts.bold, fontSize: 18, color: colors.onInk },
  buttonTextInk: { color: mint.onInk },
  error: { fontFamily: fonts.semibold, fontSize: 14, color: mint.danger, textAlign: 'center', marginTop: 8 },
  buttonStandard: { height: 58, borderRadius: 29, marginTop: 4 },
  back: { alignSelf: 'center', marginTop: 12, padding: 4 },
  link: { fontFamily: fonts.bold, fontSize: 15, color: mint.ink, textDecorationLine: 'underline' },
});
