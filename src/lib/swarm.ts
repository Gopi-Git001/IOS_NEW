// Pure maths for the crystal swarm (sign-in backdrop) and the one-shot verdict burst.
// No React Native or DOM imports, so it runs under Node tests; CrystalSwarm.web.tsx does the drawing.
import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';
import { crystal } from '../theme';
import type { Verdict } from '../types';

export type Rect = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };

/** `around` is the content block the crystals circle; text inside the `quiet` views stays clear of sharp crystals. */
type ViewRef = RefObject<ComponentRef<typeof View> | null>;
export type CrystalSwarmProps = { around: ViewRef; quiet: readonly ViewRef[] };
/** `sheet` is where the result sheet rests on screen; null until it has been laid out. `skip` drops the burst (loading). */
export type CrystalBurstProps = { verdict: Verdict; sheet: Rect | null; skip?: boolean };

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Same sequence every time, so the still frame shown under reduced motion never changes. */
export function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Sprite kinds: 0 to 3 are sugar cubes, 4 to 7 are shards. Never faceted gems. */
export const KINDS = 8;

// ---------- sign-in swarm ----------

export const PHONE_WIDTH = 700;
export const SWARM_MIN = 60;
export const SWARM_PHONE_MAX = 90;
export const SWARM_WIDE_MAX = 140;

/** A light swarm: 60 to 90 crystals on phones, at most 140 on wide screens (the marketing site runs 180 to 380). */
export function swarmCount(view: Size) {
  const max = view.width < PHONE_WIDTH ? SWARM_PHONE_MAX : SWARM_WIDE_MAX;
  return clamp(Math.round((view.width * view.height) / 4500), SWARM_MIN, max);
}

/** Canvas pixels per CSS pixel: capped so a 3x phone doesn't fill nine times the pixels. */
export function cappedPixelRatio(devicePixelRatio: number | undefined, width: number) {
  return clamp(devicePixelRatio || 1, 1, width < PHONE_WIDTH ? 1.5 : 2);
}

export type Crystal = {
  kind: number;
  /** Depth: 0 is far, 1 is near. */
  z: number;
  size: number;
  blur: 0 | 1 | 2;
  alpha: number;
  theta: number;
  omega: number;
  ring: number;
  bobA: number;
  bobF: number;
  bobP: number;
  rot: number;
  vrot: number;
  tumble: number;
  vtumble: number;
  falling: boolean;
  fallV: number;
  swayA: number;
  swayF: number;
  homeX: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  glintP: number;
  glintF: number;
};

export type Swarm = { parts: Crystal[]; time: number; view: Size; around: Rect; quiet: Rect[]; rnd: () => number };

const QUIET_MARGIN_X = 14;
const QUIET_MARGIN_Y = 10;

/** Where an orbiting crystal wants to be: an ellipse just outside the content block, reaching the screen edges. */
function orbit(p: Crystal, s: Swarm): [number, number] {
  const hw = s.around.width / 2;
  const hh = s.around.height / 2;
  const rx = lerp(hw + 34, Math.max(hw + 50, s.view.width / 2 + 30), p.ring);
  const ry = lerp(hh + 34, Math.max(hh + 50, s.view.height / 2 + 24), p.ring);
  const bob = Math.sin(s.time * p.bobF + p.bobP) * p.bobA;
  return [s.around.x + hw + Math.cos(p.theta) * rx, s.around.y + hh + Math.sin(p.theta) * ry + bob];
}

/** A column for a sharp falling crystal that never crosses the quiet text; null when the text spans the screen. */
function clearColumn(s: Swarm, rnd: () => number): number | null {
  let left = s.view.width;
  let right = 0;
  for (const q of s.quiet) {
    left = Math.min(left, q.x - QUIET_MARGIN_X);
    right = Math.max(right, q.x + q.width + QUIET_MARGIN_X);
  }
  const gaps = [left - 30, s.view.width - right - 30].map((g) => Math.max(g, 0));
  if (gaps[0] + gaps[1] < 60) return null;
  const at = rnd() * (gaps[0] + gaps[1]);
  return (at < gaps[0] ? 15 + at : right + 15 + (at - gaps[0])) / s.view.width;
}

function makeCrystal(s: Swarm): Crystal {
  const { rnd } = s;
  const z = Math.pow(rnd(), 0.75); // more far than near
  const blur = z > 0.9 ? 2 : z > 0.8 ? 1 : z < 0.18 ? 2 : z < 0.36 ? 1 : 0;
  let falling = rnd() < 0.3;
  let homeX = rnd();
  if (falling && blur === 0) {
    const column = clearColumn(s, rnd);
    if (column === null) falling = false;
    else homeX = column;
  }
  const p: Crystal = {
    kind: (rnd() < 0.55 ? 0 : 4) + ((rnd() * 4) | 0),
    z,
    size: lerp(9, 46, z * z * 0.85 + z * 0.15) * (0.8 + rnd() * 0.4),
    blur,
    alpha: z > 0.86 ? 0.7 : lerp(0.4, 1, clamp(z / 0.6, 0, 1)),
    theta: rnd() * Math.PI * 2,
    omega: (0.1 + rnd() * 0.16) * (0.6 + z * 0.9) * (rnd() < 0.86 ? 1 : -1),
    ring: clamp(Math.pow(rnd(), 1.4) + (1 - z) * 0.2, 0, 1.15),
    bobA: 6 + rnd() * 22,
    bobF: 0.4 + rnd() * 0.9,
    bobP: rnd() * 6.28,
    rot: rnd() * 6.28,
    vrot: (rnd() - 0.5) * 1.6,
    tumble: rnd() * 6.28,
    vtumble: (0.4 + rnd() * 1.4) * (rnd() < 0.5 ? -1 : 1),
    falling,
    fallV: lerp(14, 60, z) * (0.7 + rnd() * 0.6),
    swayA: 10 + rnd() * 30,
    swayF: 0.3 + rnd() * 0.6,
    homeX,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    glintP: rnd() * 6.28,
    glintF: 0.25 + rnd() * 0.5,
  };
  if (falling) {
    p.x = p.homeX * s.view.width;
    p.y = rnd() * s.view.height;
  } else [p.x, p.y] = orbit(p, s);
  return p;
}

export function makeSwarm(view: Size, around: Rect, quiet: Rect[], count = swarmCount(view)): Swarm {
  const s: Swarm = { parts: [], time: 0, view, around, quiet, rnd: seeded(7) };
  for (let i = 0; i < count; i++) s.parts.push(makeCrystal(s));
  s.parts.sort((a, b) => a.z - b.z); // far ones are drawn first
  return s;
}

/** One step of drift. Sharp crystals are pushed out of the quiet rectangles so the text stays readable. */
export function stepSwarm(s: Swarm, dt: number) {
  s.time += dt;
  const { width: W, height: H } = s.view;
  const damp = Math.pow(0.06, dt);
  for (const p of s.parts) {
    let ax = 0;
    let ay = 0;
    p.theta += p.omega * dt;
    if (p.falling) {
      const tx = p.homeX * W + Math.sin(s.time * p.swayF + p.bobP) * (p.blur === 0 ? Math.min(p.swayA, 12) : p.swayA);
      ax += (tx - p.x) * 1.2;
      ay += (p.fallV - p.vy) * 1.5;
      if (p.y > H + 60) {
        p.y = -60;
        if (p.blur !== 0) p.homeX = s.rnd();
        p.x = p.homeX * W;
        p.vy = p.fallV;
        p.vx = 0;
      }
    } else {
      const [tx, ty] = orbit(p, s);
      ax += (tx - p.x) * 2.4;
      ay += (ty - p.y) * 2.4;
    }
    if (p.blur === 0) {
      for (const q of s.quiet) {
        const x0 = q.x - QUIET_MARGIN_X;
        const x1 = q.x + q.width + QUIET_MARGIN_X;
        const y0 = q.y - QUIET_MARGIN_Y;
        const y1 = q.y + q.height + QUIET_MARGIN_Y;
        if (p.x <= x0 || p.x >= x1 || p.y <= y0 || p.y >= y1) continue;
        const dl = p.x - x0;
        const dr = x1 - p.x;
        const dt2 = p.y - y0;
        const db = y1 - p.y;
        const m = Math.min(dl, dr, dt2, db);
        const push = 900 + 1400 * p.z;
        if (m === dl) ax -= push;
        else if (m === dr) ax += push;
        else if (m === dt2) ay -= push;
        else ay += push;
      }
    }
    p.vx = (p.vx + ax * dt) * damp;
    p.vy = (p.vy + ay * dt) * damp;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // spin settles back toward its base speed
    p.vrot += ((p.vrot > 0 ? 0.5 : -0.5) - p.vrot) * 0.6 * dt;
    p.vtumble += ((p.vtumble > 0 ? 0.9 : -0.9) - p.vtumble) * 0.5 * dt;
    p.rot += p.vrot * dt;
    p.tumble += p.vtumble * dt;
  }
}

/** How much of a crystal's brightness is kept at this point: 1 in the open, fading to a quarter behind quiet text. */
export function quietDim(x: number, y: number, quiet: readonly Rect[]) {
  let keep = 1;
  for (const q of quiet) {
    const inside = Math.min(x - q.x, q.x + q.width - x, y - q.y, q.y + q.height - y);
    const t = clamp((inside + 18) / 30, 0, 1);
    keep = Math.min(keep, 1 - 0.76 * t * t * (3 - 2 * t));
  }
  return keep;
}

// ---------- verdict burst ----------

const BURSTS: Record<Verdict, { tint: string; deep: string }> = { CLEAN: crystal.CLEAN, OKAY: crystal.OKAY, BAD: crystal.BAD };

/**
 * The burst colours for the verdict on screen, in the current names (CLEAN / OKAY / BAD, see lib/verdicts.ts).
 * Anything else (RETRY, an error, an old name that was never converted) gets no burst.
 */
export function burstColors(verdict: unknown) {
  return typeof verdict === 'string' && Object.hasOwn(BURSTS, verdict) ? BURSTS[verdict as Verdict] : null;
}

/** The sheet springs up for about this long; the crystals leave its top edge as it lands. */
export const BURST_DELAY_MS = 170;
/** Longest a crystal lives, start to gone. The whole burst is over within BURST_DELAY_MS + this. */
export const BURST_LIFE_MS = 1000;
const BURST_STAGGER_MS = 110;
const GRAVITY = 900;

export type Bit = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  tumble: number;
  vtumble: number;
  size: number;
  /** A sprite kind, or -1 for a loose grain of sugar. */
  kind: number;
  soft: boolean;
  /** Seconds before it leaves the sheet edge. */
  wait: number;
  life: number;
  max: number;
};

/**
 * Crystals thrown from the sheet's top edge (and its sides where the screen is wide enough), away from the sheet.
 * They are drawn behind the sheet and clipped to the area outside it, so they can never cover the verdict or the lists.
 */
export function makeBurst(sheet: Rect, view: Size, rnd: () => number = seeded(11)): Bit[] {
  const phone = view.width < PHONE_WIDTH;
  const bits: Bit[] = [];
  const bit = (x: number, y: number, angle: number, speed: number, grain: boolean) => {
    const max = (grain ? 0.45 : 0.62) + rnd() * 0.3;
    bits.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: rnd() * 6.28,
      vrot: (rnd() - 0.5) * 10,
      tumble: rnd() * 6.28,
      vtumble: (rnd() - 0.5) * 10,
      size: grain ? 2 + rnd() * 2.5 : 11 + rnd() * 19,
      kind: grain ? -1 : (rnd() * KINDS) | 0,
      soft: !grain && rnd() < 0.2,
      wait: (rnd() * BURST_STAGGER_MS) / 1000,
      life: 0,
      max: Math.min(max, (BURST_LIFE_MS - BURST_STAGGER_MS) / 1000),
    });
  };
  const up = -Math.PI / 2;
  const top = phone ? 24 : 30;
  for (let i = 0; i < top + 16; i++) {
    const grain = i >= top;
    const along = grain ? rnd() : (i + rnd()) / top; // crystals spread evenly, with jitter
    const x = sheet.x + 14 + along * (sheet.width - 28);
    // fan outward from the middle so the spray opens like a crown
    const lean = (along - 0.5) * 1.1 + (rnd() - 0.5) * 0.7;
    bit(x, sheet.y + 6, up + lean, (grain ? 260 : 230) + rnd() * 290, grain);
  }
  const side = sheet.x; // room beside the sheet, the same on both sides
  if (side >= 60) {
    const reach = Math.min(sheet.height * 0.6, 320);
    for (let i = 0; i < 28; i++) {
      const leftSide = i % 2 === 0;
      const grain = i >= 20;
      const angle = (leftSide ? Math.PI : 0) + (leftSide ? 1 : -1) * (0.25 + rnd() * 0.75);
      bit(leftSide ? sheet.x + 6 : sheet.x + sheet.width - 6, sheet.y + 10 + rnd() * reach, angle, 200 + rnd() * 300, grain);
    }
  }
  return bits;
}

/** Moves the burst on by `dt` seconds. Returns how many crystals are still alive (waiting ones included). */
export function stepBurst(bits: Bit[], dt: number) {
  let alive = 0;
  const drag = Math.pow(0.4, dt);
  for (const b of bits) {
    if (b.wait > 0) {
      b.wait -= dt;
      alive++;
      continue;
    }
    b.life += dt;
    if (b.life >= b.max) continue;
    alive++;
    b.vy += GRAVITY * dt;
    b.vx *= drag;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.rot += b.vrot * dt;
    b.tumble += b.vtumble * dt;
  }
  return alive;
}

/** A crystal's opacity over its life: full, then fading out over the last 35%. Zero before it starts and after it ends. */
export function bitAlpha(b: Bit) {
  if (b.wait > 0 || b.life >= b.max) return 0;
  const t = b.life / b.max;
  return t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
}

/** The strip of screen the burst canvas covers: just the band above the sheet on phones, more where the sides are open. */
export function burstBand(sheet: Rect, view: Size) {
  const top = Math.max(0, sheet.y - 220);
  const bottom = sheet.x >= 60 ? Math.min(view.height, sheet.y + Math.min(sheet.height, 520)) : Math.min(view.height, sheet.y + 16);
  return { top, height: Math.max(1, bottom - top) };
}
