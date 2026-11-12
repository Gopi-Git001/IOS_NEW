// Phones (Expo Go and native builds): the sign-in crystal swarm drawn with React Native Skia.
// The art is in crystalArt.ts and the motion is the same maths as the web (lib/swarm.ts), so phones and browsers
// look and move alike.
// Decoration only: hidden from screen readers, never takes a tap, pauses in the background, and shows one
// still frame when the phone asks for reduced motion. Only the sign-in screen mounts it, so the camera pays nothing.
import { Canvas, Picture, type SkPicture } from '@shopify/react-native-skia';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, StyleSheet, View } from 'react-native';
import { makeSwarm, type CrystalSwarmProps, type Rect, stepSwarm, type Swarm } from '../lib/swarm';
import { relativeBox } from '../lib/swarmFrame';
import { paintSwarm } from './crystalArt';

/** How often the content is measured again (the sign-in layout settles after fonts load and on rotation). */
const REMEASURE_MS = 1000;

// ---------- the swarm ----------

type Measurable = { measureInWindow?: (cb: (x: number, y: number, width: number, height: number) => void) => void };

function measure(view: unknown): Promise<Rect | null> {
  const v = view as Measurable | null;
  if (!v || typeof v.measureInWindow !== 'function') return Promise.resolve(null);
  return new Promise((resolve) => v.measureInWindow!((x, y, width, height) => resolve({ x, y, width, height })));
}

/** Sugar cubes and shards drifting behind the sign-in screen. */
export function CrystalSwarmSkia(props: CrystalSwarmProps) {
  const host = useRef<ComponentRef<typeof View>>(null);
  const views = useRef(props);
  views.current = props;
  const [picture, setPicture] = useState<SkPicture | null>(null);
  const relayout = useRef<() => void>(() => {});

  useEffect(() => {
    let swarm: Swarm | null = null;
    let cancelled = false;
    let reduced = false;
    let active = AppState.currentState === 'active';
    let raf = 0;
    let running = false;
    let last = 0;
    let frames = 0;
    let slow = 0;
    let thinned = false;

    const show = () => {
      if (swarm) setPicture(paintSwarm(swarm));
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    /** If the phone can't hold about 45 frames a second, draw a third fewer crystals (like the web). */
    const adapt = (ms: number) => {
      if (thinned || ms <= 0 || ms >= 200) return;
      frames++;
      if (ms > 22) slow++;
      if (frames < 90) return;
      if (slow > 45 && swarm) {
        thinned = true;
        swarm.parts = swarm.parts.filter((_, i) => i % 3 !== 0);
      }
      frames = 0;
      slow = 0;
    };
    const frame = (now: number) => {
      if (!running || !swarm) return;
      const ms = now - last;
      last = now;
      adapt(ms);
      stepSwarm(swarm, Math.min(Math.max(ms, 0) / 1000, 1 / 30));
      show();
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running || !swarm || reduced || !active || cancelled) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    /** Reduced motion: let the scene settle once, then show that single still frame. */
    const settle = () => {
      if (!swarm) return;
      for (let i = 0; i < 90; i++) stepSwarm(swarm, 1 / 30);
    };

    const layout = async () => {
      const [h, around, ...quiet] = await Promise.all([
        measure(host.current),
        measure(views.current.around.current),
        ...views.current.quiet.map((q) => measure(q.current)),
      ]);
      if (cancelled || !h || !h.width || !h.height) return;
      const box = relativeBox(around, h);
      if (!box) return;
      const view = { width: h.width, height: h.height };
      const quietBoxes = quiet.flatMap((q) => relativeBox(q, h) ?? []);
      if (!swarm || Math.abs(view.width - swarm.view.width) > 80) {
        swarm = makeSwarm(view, box, quietBoxes);
        if (thinned) swarm.parts = swarm.parts.filter((_, i) => i % 3 !== 0);
        if (reduced) settle();
      } else {
        const scale = view.height / (swarm.view.height || view.height);
        if (scale !== 1) for (const p of swarm.parts) p.y *= scale;
        Object.assign(swarm, { view, around: box, quiet: quietBoxes });
      }
      if (reduced) show();
      else start();
    };
    relayout.current = () => void layout();

    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        reduced = on;
      })
      .catch(() => {})
      .finally(() => void layout());
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => {
      reduced = on;
      if (on) {
        stop();
        settle();
        show();
      } else start();
    });
    const app = AppState.addEventListener('change', (state) => {
      active = state === 'active';
      if (active) start();
      else stop();
    });
    // Fonts loading, an error line appearing or the phone turning all move the content.
    const timer = setInterval(() => void layout(), REMEASURE_MS);

    return () => {
      cancelled = true;
      stop();
      clearInterval(timer);
      motion.remove();
      app.remove();
    };
  }, []);

  return (
    <View
      ref={host}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={() => relayout.current()}
      style={StyleSheet.absoluteFill}
    >
      {picture && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Picture picture={picture} />
        </Canvas>
      )}
    </View>
  );
}
