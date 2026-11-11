// Web only (phones use CrystalSwarm.tsx, which renders nothing): glossy sugar cubes and shards on a plain
// 2D canvas. Two pieces share the sprites:
//   CrystalSwarm  a light, slow swarm behind the sign-in screen
//   CrystalBurst  a one-second spray in the verdict colour when a verdict appears
// Neither is mounted on the camera or while a label is being read, so no canvas or frame loop runs there.
// Both are decoration: hidden from assistive tech, never take a tap, stop when the tab is hidden and
// stand still (swarm) or stay away (burst) when the system asks for reduced motion.
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import {
  bitAlpha,
  BURST_DELAY_MS,
  BURST_LIFE_MS,
  burstBand,
  burstColors,
  cappedPixelRatio,
  type CrystalBurstProps,
  type CrystalSwarmProps,
  KINDS,
  lerp,
  makeBurst,
  makeSwarm,
  quietDim,
  type Rect,
  seeded,
  stepBurst,
  stepSwarm,
  type Swarm,
} from '../lib/swarm';
import type { Verdict } from '../types';

const S = 96; // sprite size (px)
const PAD = 16; // room for blur
const CELL = S + PAD * 2;
const BLURS = [0, 2.2, 5.5];
const REDUCED = '(prefers-reduced-motion: reduce)';

/** Counters for checking, from the browser console or a test, that nothing is drawn where it shouldn't be. */
const stats = { loops: 0, swarmFrames: 0, burstFrames: 0, bursts: 0, swarmQuality: 0 };
(globalThis as { __crystalFx?: typeof stats }).__crystalFx = stats;

// ---------- sprites ----------

type Stops = [number, string][];
type Palette = { right: Stops; left: Stops; top: Stops; shard: Stops; facet: string; edge: string; seam: string; rim: string | null };
type Sprites = HTMLCanvasElement[][]; // [kind][blur level]
type Ctx = CanvasRenderingContext2D;
type Point = [number, number];

/** Clear sugar glass with a cool edge, for the dark sign-in backdrop. */
const GLASS: Palette = {
  right: [[0, 'rgba(176,192,222,0.62)'], [0.6, 'rgba(120,138,178,0.42)'], [1, 'rgba(98,190,196,0.40)']],
  left: [[0, 'rgba(236,241,252,0.80)'], [1, 'rgba(180,196,226,0.58)']],
  top: [[0, 'rgba(255,255,255,0.97)'], [1, 'rgba(222,230,246,0.88)']],
  shard: [[0, 'rgba(240,245,255,0.82)'], [0.5, 'rgba(170,188,224,0.40)'], [1, 'rgba(120,200,206,0.42)']],
  facet: 'rgba(255,255,255,0.38)',
  edge: 'rgba(255,255,255,0.85)',
  seam: 'rgba(255,255,255,0.65)',
  rim: null,
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
const rgba = (c: number[], alpha: number) => `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;

/** The same glass poured in a verdict colour, with a darker rim so it holds on the light result paper. */
function tintedGlass(tint: string, deep: string): Palette {
  const t = rgb(tint);
  const d = rgb(deep);
  const w = [255, 255, 255];
  return {
    right: [[0, rgba(t, 0.88)], [1, rgba(mix(t, d, 0.42), 0.84)]],
    left: [[0, rgba(mix(t, w, 0.45), 0.93)], [1, rgba(t, 0.88)]],
    top: [[0, rgba(w, 0.97)], [1, rgba(mix(t, w, 0.6), 0.94)]],
    shard: [[0, rgba(mix(t, w, 0.7), 0.93)], [0.5, rgba(t, 0.84)], [1, rgba(mix(t, d, 0.38), 0.84)]],
    facet: 'rgba(255,255,255,0.42)',
    edge: 'rgba(255,255,255,0.9)',
    seam: 'rgba(255,255,255,0.7)',
    rim: rgba(d, 0.42),
  };
}

function poly(g: Ctx, pts: Point[]) {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
}

function gradient(g: Ctx, x0: number, y0: number, x1: number, y1: number, stops: Stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([at, color]) => gr.addColorStop(at, color));
  return gr;
}

/** Tiny sugar grains sprinkled inside a face. */
function grain(g: Ctx, pts: Point[], n: number, alpha: number, rnd: () => number) {
  g.save();
  poly(g, pts);
  g.clip();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(255,255,255,${(alpha * (0.4 + rnd() * 0.6)).toFixed(3)})`;
    const r = 0.6 + rnd() * 1.3;
    g.fillRect(lerp(minX, maxX, rnd()), lerp(minY, maxY, rnd()), r, r);
  }
  g.restore();
}

function spot(g: Ctx, x: number, y: number, radius: number, alpha: number) {
  const sp = g.createRadialGradient(x, y, 0, x, y, radius);
  sp.addColorStop(0, `rgba(255,255,255,${alpha})`);
  sp.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sp;
}

/** A sugar cube seen from a corner: three glossy faces, bright edges and a hot spot on top. */
function drawCube(g: Ctx, variant: number, pal: Palette, rnd: () => number) {
  const e = S * (0.36 + variant * 0.02);
  const k = 0.866;
  const cx = S / 2 + PAD;
  const cy = S / 2 + PAD + e * 0.05;
  const P = (x: number, y: number): Point => [cx + x, cy + y];
  const top = [P(0, -e), P(k * e, -e / 2), P(0, 0), P(-k * e, -e / 2)];
  const left = [P(-k * e, -e / 2), P(0, 0), P(0, e), P(-k * e, e / 2)];
  const right = [P(0, 0), P(k * e, -e / 2), P(k * e, e / 2), P(0, e)];
  const outline = [P(0, -e), P(k * e, -e / 2), P(k * e, e / 2), P(0, e), P(-k * e, e / 2), P(-k * e, -e / 2)];
  g.lineJoin = 'round';
  if (pal.rim) {
    poly(g, outline);
    g.strokeStyle = pal.rim;
    g.lineWidth = 4;
    g.stroke();
  }
  poly(g, right);
  g.fillStyle = gradient(g, cx, cy - e / 2, cx + k * e, cy + e, pal.right);
  g.fill();
  poly(g, left);
  g.fillStyle = gradient(g, cx - k * e, cy - e / 2, cx, cy + e, pal.left);
  g.fill();
  poly(g, top);
  g.fillStyle = gradient(g, cx - k * e, cy - e, cx + k * e, cy, pal.top);
  g.fill();
  grain(g, top, 70, 0.9, rnd);
  grain(g, left, 50, 0.55, rnd);
  grain(g, right, 40, 0.35, rnd);
  g.strokeStyle = pal.edge;
  g.lineWidth = 1.6;
  poly(g, outline);
  g.stroke();
  g.strokeStyle = pal.seam;
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(cx - k * e, cy - e / 2);
  g.lineTo(cx, cy);
  g.lineTo(cx + k * e, cy - e / 2);
  g.moveTo(cx, cy);
  g.lineTo(cx, cy + e);
  g.stroke();
  spot(g, cx - e * 0.25, cy - e * 0.62, e * 0.45, 0.95);
  poly(g, top);
  g.fill();
}

/** A long splinter of sugar glass with one lit side. */
function drawShard(g: Ctx, variant: number, pal: Palette, rnd: () => number) {
  const cx = S / 2 + PAD;
  const cy = S / 2 + PAD;
  const L = S * (0.4 + rnd() * 0.06);
  const W = S * (0.13 + variant * 0.03);
  const tipA: Point = [cx, cy - L];
  const tipB: Point = [cx + (rnd() - 0.5) * 8, cy + L * (0.8 + rnd() * 0.15)];
  const r1: Point = [cx + W, cy - L * 0.35];
  const r2: Point = [cx + W * (0.8 + rnd() * 0.3), cy + L * 0.45];
  const l1: Point = [cx - W * (0.9 + rnd() * 0.2), cy - L * 0.28];
  const l2: Point = [cx - W * 0.85, cy + L * 0.5];
  const spine: Point = [cx + W * 0.15, cy - L * 0.2];
  const spine2: Point = [cx + W * 0.05, cy + L * 0.4];
  const body = [tipA, r1, r2, tipB, l2, l1];
  g.lineJoin = 'round';
  if (pal.rim) {
    poly(g, body);
    g.strokeStyle = pal.rim;
    g.lineWidth = 4;
    g.stroke();
  }
  poly(g, body);
  g.fillStyle = gradient(g, cx - W, cy, cx + W, cy, pal.shard);
  g.fill();
  poly(g, [tipA, spine, spine2, tipB, l2, l1]);
  g.fillStyle = pal.facet;
  g.fill();
  grain(g, body, 30, 0.5, rnd);
  g.strokeStyle = pal.edge;
  g.lineWidth = 1.4;
  poly(g, body);
  g.stroke();
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(tipA[0], tipA[1]);
  g.lineTo(spine[0], spine[1]);
  g.lineTo(spine2[0], spine2[1]);
  g.lineTo(tipB[0], tipB[1]);
  g.stroke();
  spot(g, cx - W * 0.2, cy - L * 0.45, W * 1.2, 0.9);
  poly(g, body);
  g.fill();
}

function blank(size: number) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

/** Every kind drawn once, plus pre-blurred copies for depth, so a frame is only cheap image draws. */
function buildSprites(pal: Palette, blurs: number[]): Sprites {
  const rnd = seeded(7);
  const sprites: Sprites = [];
  for (let kind = 0; kind < KINDS; kind++) {
    const base = blank(CELL);
    const g = base.getContext('2d')!;
    if (kind < 4) drawCube(g, kind, pal, rnd);
    else drawShard(g, kind - 4, pal, rnd);
    const set = [base];
    for (const radius of blurs.slice(1)) {
      const soft = blank(CELL);
      const sg = soft.getContext('2d')!;
      if (typeof sg.filter === 'string') {
        sg.filter = `blur(${radius}px)`;
        sg.drawImage(base, 0, 0);
      } else {
        // Browsers without canvas filters (older Safari): layered offset copies.
        sg.globalAlpha = 0.2;
        for (let i = 0; i < 8; i++) sg.drawImage(base, Math.cos((i / 8) * Math.PI * 2) * radius, Math.sin((i / 8) * Math.PI * 2) * radius);
        sg.globalAlpha = 0.3;
        sg.drawImage(base, 0, 0);
      }
      set.push(soft);
    }
    sprites.push(set);
  }
  return sprites;
}

/** A four-point sparkle. */
function buildGlint() {
  const c = blank(64);
  const g = c.getContext('2d')!;
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(0.15, 'rgba(255,255,255,0.6)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg;
  g.beginPath();
  g.moveTo(32, 2);
  g.quadraticCurveTo(34, 30, 62, 32);
  g.quadraticCurveTo(34, 34, 32, 62);
  g.quadraticCurveTo(30, 34, 2, 32);
  g.quadraticCurveTo(30, 30, 32, 2);
  g.fill();
  g.beginPath();
  g.arc(32, 32, 6, 0, Math.PI * 2);
  g.fill();
  return c;
}

// Built on first use, never at startup, so the camera path pays nothing for them.
let glass: { sprites: Sprites; glint: HTMLCanvasElement } | null = null;
const tinted = new Map<string, Sprites>();
const glassSprites = () => (glass ??= { sprites: buildSprites(GLASS, BLURS), glint: buildGlint() });
function tintedSprites(colors: { tint: string; deep: string }) {
  let sprites = tinted.get(colors.tint);
  if (!sprites) tinted.set(colors.tint, (sprites = buildSprites(tintedGlass(colors.tint, colors.deep), BLURS.slice(0, 2))));
  return sprites;
}

// ---------- sign-in swarm ----------

/** A view's box inside the canvas. React Native Web refs are the DOM elements themselves. */
function boxIn(view: unknown, host: DOMRect): Rect | null {
  const el = view as Element | null;
  if (!el || typeof el.getBoundingClientRect !== 'function') return null;
  const r = el.getBoundingClientRect();
  return r.width && r.height ? { x: r.left - host.left, y: r.top - host.top, width: r.width, height: r.height } : null;
}

function paintSwarm(ctx: Ctx, swarm: Swarm, dpr: number) {
  const { sprites, glint } = glassSprites();
  const { width: W, height: H } = swarm.view;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const glints: number[] = [];
  for (const p of swarm.parts) {
    if (p.x < -80 || p.x > W + 80 || p.y < -80 || p.y > H + 80) continue;
    const s = p.size / S;
    const flip = Math.cos(p.tumble); // fake 3D tumble around one axis
    const sx = s * (0.3 + 0.7 * Math.abs(flip));
    const c = Math.cos(p.rot);
    const sn = Math.sin(p.rot);
    const a = p.alpha * quietDim(p.x, p.y, swarm.quiet);
    ctx.globalAlpha = a * (0.82 + 0.18 * flip * flip); // the face brightens as it turns to the light
    ctx.setTransform(dpr * c * sx, dpr * sn * sx, -dpr * sn * s, dpr * c * s, dpr * p.x, dpr * p.y);
    ctx.drawImage(sprites[p.kind][p.blur], -CELL / 2, -CELL / 2);
    if (p.blur === 0 && p.z > 0.45) {
      const gl = Math.sin(swarm.time * p.glintF * 6.28 + p.glintP) * Math.abs(flip);
      if (gl > 0.93) glints.push(p.x, p.y - p.size * 0.28, ((gl - 0.93) / 0.07) * a, p.size);
    }
  }
  if (glints.length) {
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < glints.length; j += 4) {
      const size = glints[j + 3] * 0.9;
      ctx.globalAlpha = glints[j + 2];
      ctx.setTransform(dpr, 0, 0, dpr, dpr * glints[j], dpr * glints[j + 1]);
      ctx.drawImage(glint, -size / 2, -size / 2, size, size);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
}

const fill: CSSProperties = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' };

/** Sugar cubes and shards circling the sign-in content. Sits behind it; text and buttons stay on top. */
export function CrystalSwarm(props: CrystalSwarmProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const views = useRef(props);
  views.current = props;

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const reduce = window.matchMedia(REDUCED);
    let swarm: Swarm | null = null;
    let dpr = 1;
    let level = 0; // 0 full quality, 1 one canvas pixel per CSS pixel, 2 a third fewer crystals
    let raf = 0;
    let running = false;
    let last = 0;
    let frames = 0;
    let slow = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    /** Sizes the canvas and finds the content. True when the swarm was (re)seeded. */
    const measure = () => {
      const host = el.getBoundingClientRect();
      const around = boxIn(views.current.around.current, host);
      if (!host.width || !host.height || !around) return false;
      const quiet = views.current.quiet.flatMap((q) => boxIn(q.current, host) ?? []);
      const view = { width: host.width, height: host.height };
      const reseed = !swarm || Math.abs(view.width - swarm.view.width) > 80;
      dpr = level > 0 ? 1 : cappedPixelRatio(window.devicePixelRatio, view.width);
      el.width = Math.round(view.width * dpr);
      el.height = Math.round(view.height * dpr);
      if (reseed || !swarm) {
        swarm = makeSwarm(view, around, quiet);
        if (level > 1) swarm.parts = swarm.parts.filter((_, i) => i % 3 !== 0);
      } else {
        const scale = view.height / (swarm.view.height || view.height);
        for (const p of swarm.parts) p.y *= scale;
        Object.assign(swarm, { view, around, quiet });
      }
      return reseed;
    };

    /** If the device can't hold about 45 frames a second: lower the resolution, then thin the swarm. */
    const adapt = (ms: number) => {
      if (ms <= 0 || ms >= 200) return;
      frames++;
      if (ms > 22) slow++;
      if (frames < 90) return;
      if (slow > 45 && level < 2 && swarm) {
        level++;
        if (level === 1) {
          dpr = 1;
          el.width = Math.round(swarm.view.width);
          el.height = Math.round(swarm.view.height);
        } else swarm.parts = swarm.parts.filter((_, i) => i % 3 !== 0);
        stats.swarmQuality = level;
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
      paintSwarm(ctx, swarm, dpr);
      stats.swarmFrames++;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      stats.loops--;
      cancelAnimationFrame(raf);
    };
    const start = () => {
      if (running || !swarm || reduce.matches || document.hidden) return;
      running = true;
      stats.loops++;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    /** Reduced motion: let the scene settle once, then show that single still frame. */
    const settle = () => {
      if (!swarm) return;
      for (let i = 0; i < 90; i++) stepSwarm(swarm, 1 / 30);
    };
    const layout = () => {
      const reseeded = measure();
      if (!swarm) return;
      if (reduce.matches) {
        stop();
        if (reseeded) settle();
      }
      paintSwarm(ctx, swarm, dpr);
      start();
    };

    stats.swarmQuality = 0;
    layout();
    // Fonts loading, an error line appearing or the window changing size all move the content.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(layout, 120);
    }) : null;
    for (const view of [el, views.current.around.current, ...views.current.quiet.map((q) => q.current)]) {
      if (view && typeof (view as unknown as Element).getBoundingClientRect === 'function') observer?.observe(view as unknown as Element);
    }
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    reduce.addEventListener?.('change', layout);

    return () => {
      stop();
      clearTimeout(timer);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reduce.removeEventListener?.('change', layout);
    };
  }, []);

  return <canvas ref={canvas} aria-hidden="true" data-crystal="swarm" style={fill} />;
}

// ---------- verdict burst ----------

type Run = { id: number; verdict: Verdict; sheet: Rect; top: number; height: number; width: number };

/**
 * One spray of crystals in the verdict colour as the result sheet lands, then the canvas is removed.
 * Drawn behind the sheet and clipped to the area outside it, so it never covers the verdict word or the lists.
 * Shown once for each verdict that appears: re-renders, scrolling and the lists arriving don't replay it.
 */
export function CrystalBurst({ verdict, sheet, skip }: CrystalBurstProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const shown = useRef<Verdict | null>(null);
  const resting = useRef(sheet);
  resting.current = sheet;
  const [run, setRun] = useState<Run | null>(null);
  const ready = sheet !== null;

  useEffect(() => {
    const at = resting.current;
    if (!at || shown.current === verdict) return;
    shown.current = verdict;
    if (skip || !burstColors(verdict) || document.hidden || window.matchMedia(REDUCED).matches) return;
    const view = { width: window.innerWidth, height: window.innerHeight };
    setRun((prev) => ({ id: (prev?.id ?? 0) + 1, verdict, sheet: at, width: view.width, ...burstBand(at, view) }));
    // `skip` is read at the moment the verdict appears; a later change must not start a burst.
  }, [verdict, ready]);

  useEffect(() => {
    if (!run) return;
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    const colors = burstColors(run.verdict);
    const done = () => setRun((current) => (current?.id === run.id ? null : current));
    if (!el || !ctx || !colors) return done();
    const dpr = cappedPixelRatio(window.devicePixelRatio, run.width);
    el.width = Math.round(run.width * dpr);
    el.height = Math.round(run.height * dpr);
    const sprites = tintedSprites(colors);
    const bits = makeBurst(run.sheet, { width: run.width, height: window.innerHeight });
    const grainColors = [colors.tint, '#FFFFFF'];
    let raf = 0;
    let last = 0;
    let began = 0;
    let looping = false;

    const paint = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, el.width, el.height);
      const at = resting.current ?? run.sheet;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, el.width, el.height);
      ctx.rect(at.x * dpr, (at.y - run.top) * dpr, at.width * dpr, el.height);
      ctx.clip('evenodd');
      bits.forEach((b, i) => {
        const alpha = bitAlpha(b);
        if (!alpha) return;
        const c = Math.cos(b.rot);
        const sn = Math.sin(b.rot);
        const flip = 0.3 + 0.7 * Math.abs(Math.cos(b.tumble));
        const x = dpr * b.x;
        const y = dpr * (b.y - run.top);
        ctx.globalAlpha = alpha;
        if (b.kind < 0) {
          ctx.setTransform(dpr * c * flip, dpr * sn * flip, -dpr * sn, dpr * c, x, y);
          ctx.fillStyle = grainColors[i % 2];
          ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size);
        } else {
          const s = b.size / S;
          ctx.setTransform(dpr * c * s * flip, dpr * sn * s * flip, -dpr * sn * s, dpr * c * s, x, y);
          ctx.drawImage(sprites[b.kind][b.soft ? 1 : 0], -CELL / 2, -CELL / 2);
        }
      });
      ctx.restore();
      ctx.globalAlpha = 1;
    };
    const stop = () => {
      if (looping) stats.loops--;
      looping = false;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    const frame = (now: number) => {
      // Real time, so a slow device still finishes in about a second instead of playing in slow motion.
      const alive = stepBurst(bits, Math.min(Math.max(now - last, 0) / 1000, 1 / 12));
      last = now;
      paint();
      stats.burstFrames++;
      if (alive > 0 && now - began < BURST_LIFE_MS) raf = requestAnimationFrame(frame);
      else {
        stop();
        done();
      }
    };
    const onVisibility = () => {
      if (!document.hidden) return;
      stop();
      done();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const timer = setTimeout(() => {
      looping = true;
      stats.loops++;
      stats.bursts++;
      began = last = performance.now();
      raf = requestAnimationFrame(frame);
    }, BURST_DELAY_MS);
    return stop;
  }, [run]);

  if (!run) return null;
  const style: CSSProperties = { position: 'absolute', left: 0, top: run.top, width: run.width, height: run.height, pointerEvents: 'none' };
  return <canvas key={run.id} ref={canvas} aria-hidden="true" data-crystal="burst" data-verdict={run.verdict} style={style} />;
}
