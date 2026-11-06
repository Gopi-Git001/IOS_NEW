import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import type { Verdict } from '../types';

// The glossy inflatable sugarcane character (assets/glossy/cane-*.webp).
// Motion is done in code so it feels like a balloon toy: it inflates in, then squishes and bounces.
const images = {
  idle: require('../../assets/glossy/cane-idle.webp'),
  scanning: require('../../assets/glossy/cane-scanning.webp'),
  clean: require('../../assets/glossy/cane-clean.webp'),
  bad: require('../../assets/glossy/cane-bad.webp'),
  ugly: require('../../assets/glossy/cane-ugly.webp'),
};

export type Mood = keyof typeof images;

export const moodForVerdict: Record<Verdict, Mood> = { CLEAN: 'clean', BAD: 'bad', UGLY: 'ugly' };

const ASPECT = 0.51; // width / height of the cane images

const ease = Easing.inOut(Easing.sin);
const t = (v: Animated.Value, toValue: number, duration: number) =>
  Animated.timing(v, { toValue, duration, easing: ease, useNativeDriver: true });

/** One loop per mood. `y` = lift in px, `s` = squash (1 = rest), `r` = tilt in degrees, `x` = side shake in px. */
function moodLoop(mood: Mood, v: { y: Animated.Value; s: Animated.Value; r: Animated.Value; x: Animated.Value }) {
  switch (mood) {
    case 'clean': // happy hops with a squash on each landing
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([t(v.s, 0.9, 140), t(v.y, 0, 140)]),
          Animated.parallel([t(v.s, 1.06, 220), t(v.y, -22, 260)]),
          Animated.parallel([t(v.s, 1, 200), t(v.y, 0, 240)]),
          t(v.s, 0.94, 110),
          t(v.s, 1, 160),
          Animated.delay(260),
        ]),
      );
    case 'scanning': // curious sway while it reads
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([t(v.r, -5, 700), t(v.y, -6, 700)]),
          Animated.parallel([t(v.r, 5, 900), t(v.y, 0, 900)]),
          Animated.parallel([t(v.r, 0, 600), t(v.y, -3, 600)]),
        ]),
      );
    case 'bad': // uneasy wobble
      return Animated.loop(
        Animated.sequence([
          t(v.r, -3, 380),
          t(v.r, 3, 520),
          t(v.r, 0, 380),
          Animated.parallel([t(v.s, 0.97, 500), t(v.y, 2, 500)]),
          Animated.parallel([t(v.s, 1, 600), t(v.y, 0, 600)]),
        ]),
      );
    case 'ugly': // recoil shudder, like a balloon losing a little air
      return Animated.loop(
        Animated.sequence([
          ...[4, -4, 3, -3, 2, 0].map((x) => t(v.x, x, 60)),
          Animated.parallel([t(v.s, 0.93, 260), t(v.r, -3, 260)]),
          Animated.parallel([t(v.s, 1, 420), t(v.r, 0, 420)]),
          Animated.delay(700),
        ]),
      );
    default: // idle: slow breathing
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([t(v.s, 1.025, 1300), t(v.y, -5, 1300)]),
          Animated.parallel([t(v.s, 1, 1300), t(v.y, 0, 1300)]),
        ]),
      );
  }
}

function useInflatable(mood: Mood) {
  const v = useRef({
    inflate: new Animated.Value(0),
    y: new Animated.Value(0),
    s: new Animated.Value(1),
    r: new Animated.Value(0),
    x: new Animated.Value(0),
  }).current;

  useEffect(() => {
    [v.y, v.r, v.x].forEach((a) => a.setValue(0));
    v.s.setValue(1);
    v.inflate.setValue(0);
    const loop = moodLoop(mood, v);
    const intro = Animated.spring(v.inflate, { toValue: 1, friction: 4, tension: 70, useNativeDriver: true });
    intro.start(() => loop.start());
    return () => {
      intro.stop();
      loop.stop();
    };
  }, [mood, v]);

  const grow = v.inflate.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  return [
    { translateX: v.x },
    { translateY: v.y },
    { rotate: v.r.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] }) },
    // Squash: taller means thinner, like a real balloon.
    { scaleX: Animated.multiply(grow, v.s.interpolate({ inputRange: [0.8, 1.2], outputRange: [1.12, 0.9] })) },
    { scaleY: Animated.multiply(grow, v.s) },
  ];
}

/** Standalone character (sign-in screen and anywhere it isn't pinned to a corner). */
export function CharacterView({ mood, height }: { mood: Mood; height: number }) {
  const transform = useInflatable(mood);
  return (
    <Animated.Image
      source={images[mood]}
      resizeMode="contain"
      style={{ width: height * ASPECT, height, transform, transformOrigin: 'bottom' }}
    />
  );
}

/** The sugarcane character, standing in the bottom-left corner above `bottom`. */
export function Character({ mood, bottom }: { mood: Mood; bottom: number }) {
  const { width } = useWindowDimensions();
  const height = Math.min(width * 0.58, 250);
  return (
    <Animated.View style={[styles.corner, { bottom }]} pointerEvents="none">
      <CharacterView mood={mood} height={height} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', left: 14 },
});
