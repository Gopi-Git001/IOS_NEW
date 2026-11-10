import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Verdict } from '../types';

// The glossy sugar-cube character (assets/cube/cube-*.webp), animated in code:
// it drops in with a bounce, then each mood has its own loop, a soft shadow that follows the hops,
// and a little glint that twinkles on the cube's top corner.
const images = {
  idle: require('../../assets/cube/cube-idle.webp'),
  scanning: require('../../assets/cube/cube-scanning.webp'),
  clean: require('../../assets/cube/cube-clean.webp'),
  okay: require('../../assets/cube/cube-okay.webp'),
  bad: require('../../assets/cube/cube-bad.webp'),
};

export type Mood = keyof typeof images;

/**
 * full: drop in, mood loop and glint (default). planted: same, but the feet never leave the ground
 * (for standing on a button). still: the first frame, nothing moves (reduce motion).
 */
export type Motion = 'full' | 'planted' | 'still';

/** Where the bottom of the shoes sits in every cube image (594 of 600 px). Below it is transparent. */
export const MASCOT_FEET_RATIO = 0.99;

// Where the cube's top-left corner sits in each image (fraction of the size), for the glint.
const corner: Record<Mood, [number, number]> = {
  idle: [0.15, 0.05],
  scanning: [0.2, 0.07],
  clean: [0.27, 0.15],
  okay: [0.23, 0.07],
  bad: [0.15, 0.05],
};

export const moodForVerdict: Record<Verdict, Mood> = { CLEAN: 'clean', OKAY: 'okay', BAD: 'bad' };

/** The character's width and height on a screen this wide (the images are square). */
export const characterSize = (screenWidth: number) => Math.min(screenWidth * 0.5, 230);

const ease = Easing.inOut(Easing.sin);
const t = (v: Animated.Value, toValue: number, duration: number, easing = ease) =>
  Animated.timing(v, { toValue, duration, easing, useNativeDriver: true });
const wait = Animated.delay;

type Values = { y: Animated.Value; sx: Animated.Value; sy: Animated.Value; r: Animated.Value; x: Animated.Value };

/** Squash (wide + short) or stretch (tall + thin) by `k`: 1 = rest. */
const squash = (v: Values, k: number, d: number, easing = ease) =>
  Animated.parallel([t(v.sy, k, d, easing), t(v.sx, 2 - k, d, easing)]);

function moodLoop(mood: Mood, v: Values, planted: boolean) {
  if (planted) {
    // Breathing in place: squash/stretch from the feet, no lift.
    return Animated.loop(Animated.sequence([squash(v, 1.025, 1300), squash(v, 1, 1300)]));
  }
  switch (mood) {
    case 'clean': // happy hops: crouch, stretch up, land with a squash
      return Animated.loop(
        Animated.sequence([
          squash(v, 0.86, 130),
          Animated.parallel([squash(v, 1.08, 170, Easing.out(Easing.quad)), t(v.y, -30, 260, Easing.out(Easing.quad)), t(v.r, -4, 260)]),
          Animated.parallel([squash(v, 1, 160), t(v.y, 0, 230, Easing.in(Easing.quad)), t(v.r, 0, 230)]),
          squash(v, 0.9, 90),
          squash(v, 1, 160, Easing.out(Easing.back(2))),
          wait(220),
        ]),
      );
    case 'scanning': // leans in to read, then back
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([t(v.r, 6, 650), t(v.x, 6, 650), squash(v, 0.97, 650)]),
          wait(350),
          Animated.parallel([t(v.r, -3, 800), t(v.x, -3, 800), squash(v, 1.02, 800)]),
          Animated.parallel([t(v.r, 0, 500), t(v.x, 0, 500), squash(v, 1, 500)]),
        ]),
      );
    case 'okay': // nervous shuffle from side to side
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([t(v.x, -5, 300), t(v.r, -3, 300)]),
          Animated.parallel([t(v.x, 5, 420), t(v.r, 3, 420)]),
          Animated.parallel([t(v.x, 0, 300), t(v.r, 0, 300)]),
          squash(v, 0.95, 220),
          squash(v, 1, 260),
          wait(500),
        ]),
      );
    case 'bad': // sobbing: quick shudders, then a slump
      return Animated.loop(
        Animated.sequence([
          ...[3, -3, 2.5, -2.5, 1.5, 0].map((x) => t(v.x, x, 55)),
          Animated.parallel([squash(v, 0.92, 320), t(v.y, 4, 320)]),
          Animated.parallel([squash(v, 1, 480), t(v.y, 0, 480)]),
          wait(600),
        ]),
      );
    default: // idle: slow breathing
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([squash(v, 1.025, 1300), t(v.y, -3, 1300)]),
          Animated.parallel([squash(v, 1, 1300), t(v.y, 0, 1300)]),
        ]),
      );
  }
}

function useCube(mood: Mood, motion: Motion) {
  const v = useRef({
    enter: new Animated.Value(0),
    glint: new Animated.Value(0),
    y: new Animated.Value(0),
    sx: new Animated.Value(1),
    sy: new Animated.Value(1),
    r: new Animated.Value(0),
    x: new Animated.Value(0),
  }).current;

  useEffect(() => {
    [v.y, v.r, v.x, v.enter, v.glint].forEach((a) => a.setValue(0));
    [v.sx, v.sy].forEach((a) => a.setValue(1));
    if (motion === 'still') {
      v.enter.setValue(1);
      return;
    }
    const loop = moodLoop(mood, v, motion === 'planted');
    const intro = Animated.spring(v.enter, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true });
    const glint = Animated.loop(Animated.sequence([wait(1400), t(v.glint, 1, 260), t(v.glint, 0, 420), wait(900)]));
    intro.start(() => loop.start());
    glint.start();
    return () => {
      intro.stop();
      loop.stop();
      glint.stop();
    };
  }, [mood, motion, v]);

  // Drop in from above, landing with a little squash from the spring overshoot.
  const dropY = v.enter.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] });
  const body = [
    { translateX: v.x },
    { translateY: Animated.add(v.y, dropY) },
    { rotate: v.r.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] }) },
    { scaleX: v.sx },
    { scaleY: v.sy },
  ];
  // The shadow shrinks and fades as the cube rises.
  const lift = v.y.interpolate({ inputRange: [-30, 0, 10], outputRange: [0.6, 1, 1.05], extrapolate: 'clamp' });
  const shadow = { opacity: Animated.multiply(v.enter, lift), transform: [{ scaleX: lift }] };
  const glint = {
    opacity: v.glint,
    transform: [{ scale: v.glint.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.1] }) }, { rotate: v.glint.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }],
  };
  return { body, shadow, glint, opacity: v.enter };
}

/** Standalone character (sign-in screen and anywhere it isn't pinned to a corner). */
export function CharacterView({ mood, size, motion = 'full', shadow: withShadow = true }: { mood: Mood; size: number; motion?: Motion; shadow?: boolean }) {
  const { body, shadow, glint, opacity } = useCube(mood, motion);
  // The glint is 18 px; it shrinks only on a small cube (under 113 px), so larger ones are unchanged.
  const g = Math.min(18, size * 0.16);
  return (
    <View style={{ width: size, height: size }}>
      {withShadow && <Animated.View style={[styles.shadow, { width: size * 0.5, left: size * 0.25, bottom: size * 0.02 }, shadow]} />}
      <Animated.View style={{ width: size, height: size, opacity, transform: body, transformOrigin: 'bottom' }}>
        <Animated.Image source={images[mood]} resizeMode="contain" style={{ width: size, height: size }} />
        <Animated.View style={[styles.glint, { left: size * corner[mood][0] - g / 2, top: size * corner[mood][1] - g / 2 }, glint]}>
          <Svg width={g} height={g} viewBox="0 0 24 24">
            <Path d="M12 0c.6 6 1.9 9.4 12 12-10.1 2.6-11.4 6-12 12-.6-6-1.9-9.4-12-12C10.1 9.4 11.4 6 12 0z" fill="#FFFFFF" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * The sugar-cube character standing above `bottom`: in the bottom-left corner by default,
 * or `right` points from the right edge (it perches on the result sheet that way).
 */
export function Character({ mood, bottom, size, right }: { mood: Mood; bottom: number; size?: number; right?: number }) {
  const { width } = useWindowDimensions();
  const side = right === undefined ? styles.left : { right };
  return (
    <View style={[styles.corner, side, { bottom }]} pointerEvents="none">
      <CharacterView key={mood} mood={mood} size={size ?? characterSize(width)} />
    </View>
  );
}

const styles = StyleSheet.create({
  corner: { position: 'absolute' },
  left: { left: 4 },
  // Soft contact shadow; light enough not to read as a handle when the cube hops on the paper sheet.
  shadow: { position: 'absolute', height: 10, borderRadius: 5, backgroundColor: 'rgba(14,14,12,0.14)', boxShadow: '0px 0px 8px 2px rgba(14,14,12,0.12)' },
  glint: { position: 'absolute' },
});
