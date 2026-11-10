// Generates the sugarcane character as Lottie animations in assets/lottie/.
// Run with: npm run lottie
//
// The character is a real-looking sugarcane stalk (orange, matching the cane-i logo):
// three jointed internodes with cylindrical shading, node rings, waxy bloom, fibre streaks and buds,
// a crown of arching leaves on top, and two leaves that work as arms.
//
// Motion is built to feel physical rather than cartoon-snappy:
//   * the stalk bends joint by joint (each internode is nested in the one below), so sway travels up it;
//   * leaves follow through: they lag the stalk and flex (shape morph), not just rotate;
//   * squash/stretch is anchored at the root, with anticipation before jumps and settle after landing;
//   * blinks and glances are irregular, and breathing never stops.
import { mkdirSync, writeFileSync } from 'node:fs';

const FPS = 30;
const SIZE = 300;
const ROOT = [150, 268]; // where the stalk meets the ground

// ---------- Lottie helpers ----------
const isProp = (v) => v && typeof v === 'object' && 'a' in v && 'k' in v;
const prop = (v) => (isProp(v) ? v : { a: 0, k: v });

const EASE = {
  inOut: [[0.42, 0], [0.58, 1]],
  out: [[0.2, 0.6], [0.35, 1]],
  in: [[0.55, 0], [0.8, 0.4]],
  linear: [[0.25, 0.25], [0.75, 0.75]],
  back: [[0.3, 0], [0.2, 1.4]], // slight overshoot
};

/** Animated value. frames: [[frame, value, ease?], ...] — values are numbers, arrays or path shapes. */
const kf = (frames, defEase = 'inOut') => ({
  a: 1,
  k: frames.map(([t, v, e], idx) => {
    const isShape = v && typeof v === 'object' && !Array.isArray(v);
    const s = isShape ? [v] : Array.isArray(v) ? v : [v];
    if (idx === frames.length - 1) return { t, s };
    const dims = isShape ? 1 : s.length;
    const [o, i] = EASE[e ?? defEase];
    return { t, s, o: { x: Array(dims).fill(o[0]), y: Array(dims).fill(o[1]) }, i: { x: Array(dims).fill(i[0]), y: Array(dims).fill(i[1]) } };
  }),
});

/** A smooth looping sine: `cycles` per loop, offset by `phase` (0..1), sampled every few frames. */
const wave = (op, { base = 0, amp = 1, cycles = 1, phase = 0, steps = 16 } = {}) => {
  const frames = [];
  for (let k = 0; k <= steps; k++) {
    const t = (op * k) / steps;
    const val = (x) => base + amp * Math.sin(2 * Math.PI * (cycles * x + phase));
    frames.push([Math.round(t * 100) / 100, Array.isArray(base) ? base : val(k / steps), 'linear']);
  }
  return kf(frames);
};
/** Same as wave, for [x, y] vectors (amplitude per axis). */
const wave2 = (op, { base, amp, cycles = 1, phase = 0, steps = 16 }) => {
  const frames = [];
  for (let k = 0; k <= steps; k++) {
    const x = k / steps;
    const s = Math.sin(2 * Math.PI * (cycles * x + phase));
    frames.push([(op * k) / steps, base.map((b, i) => b + (amp[i] ?? 0) * s), 'linear']);
  }
  return kf(frames);
};

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const rgba = (h, a = 1) => [...hex(h), a];

const fill = (color, opacity = 100) => ({ ty: 'fl', c: prop(rgba(color)), o: prop(opacity), r: 1, nm: 'fill' });
const stroke = (color, width, opacity = 100) => ({
  ty: 'st', c: prop(rgba(color)), o: prop(opacity), w: prop(width), lc: 2, lj: 2, ml: 4, nm: 'stroke',
});
/** Linear gradient fill. stops: [[offset, '#hex'], ...]; s/e: start and end points in local space. */
const gfill = (stops, s, e, opacity = 100) => ({
  ty: 'gf', nm: 'gradient', o: prop(opacity), r: 1, t: 1, s: prop(s), e: prop(e),
  g: { p: stops.length, k: prop(stops.flatMap(([o, c]) => [o, ...hex(c)])) },
});
const ellipse = (p, s) => ({ ty: 'el', d: 1, p: prop(p), s: prop(s), nm: 'ellipse' });
const rect = (p, s, r) => ({ ty: 'rc', d: 1, p: prop(p), s: prop(s), r: prop(r), nm: 'rect' });

/** Path shape data. pts: [[x, y, inTangent?, outTangent?], ...] (tangents relative to the point). */
const shape = (pts, closed = false) => ({
  c: closed, v: pts.map((p) => [p[0], p[1]]), i: pts.map((p) => p[2] ?? [0, 0]), o: pts.map((p) => p[3] ?? [0, 0]),
});
const path = (pts, closed = false) => ({ ty: 'sh', d: 1, ks: prop(shape(pts, closed)), nm: 'path' });
const pathAnim = (frames) => ({ ty: 'sh', d: 1, ks: kf(frames), nm: 'path' });

/** Smooth path through points (Catmull-Rom → Bézier). */
const smooth = (pts, closed = false, tension = 1 / 6) => {
  const n = pts.length;
  const at = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  return shape(
    pts.map((p, i) => {
      const a = at(i - 1), b = at(i + 1);
      const t = [(b[0] - a[0]) * tension, (b[1] - a[1]) * tension];
      return [p[0], p[1], [-t[0], -t[1]], t];
    }),
    closed,
  );
};

const group = (nm, items, tr = {}) => ({
  ty: 'gr', nm,
  it: [
    ...items,
    { ty: 'tr', p: prop(tr.p ?? [0, 0]), a: prop(tr.a ?? [0, 0]), s: prop(tr.s ?? [100, 100]), r: prop(tr.r ?? 0), o: prop(tr.o ?? 100), sk: prop(0), sa: prop(0), nm: 'transform' },
  ],
});

const layer = (nm, shapes, op, ks = {}) => ({
  ddd: 0, ty: 4, nm, sr: 1, ao: 0, ip: 0, op, st: 0, bm: 0,
  ks: { o: prop(ks.o ?? 100), r: prop(ks.r ?? 0), p: prop(ks.p ?? [0, 0, 0]), a: prop(ks.a ?? [0, 0, 0]), s: prop(ks.s ?? [100, 100, 100]) },
  shapes,
});

const animation = (nm, op, layers) => ({
  v: '5.7.4', fr: FPS, ip: 0, op, w: SIZE, h: SIZE, nm, ddd: 0, assets: [],
  layers: layers.map((l, i) => ({ ...l, ind: i + 1 })),
});

// ---------- Palettes ----------
const HEALTHY = {
  rind: ['#7A3510', '#C8621C', '#F39A3D', '#FFD08A', '#F08A2C', '#B4521A', '#6B2C0C'],
  node: ['#5C250A', '#9A4614', '#C9772F', '#8B3B10', '#4E1F08'],
  outline: '#4A1E06',
  bloom: '#FFF4DC',
  streak: '#7A3510',
  leafBase: '#2F6B22',
  leafMid: '#5AA537',
  leafTip: '#A7D65A',
  rib: '#D8F0A8',
  lid: '#E88A33',
  cheek: '#FF7A59',
};
const SICK = {
  rind: ['#4E3214', '#7E5A2A', '#A88648', '#C8AC70', '#9C7C40', '#6E4E22', '#3E2810'],
  node: ['#3A2410', '#5E3F1C', '#7C5A30', '#56391A', '#2E1C0C'],
  outline: '#2E1C0C',
  bloom: '#E8E0C8',
  streak: '#3E2810',
  leafBase: '#5A5A22',
  leafMid: '#9A8A34',
  leafTip: '#8A5A22',
  rib: '#D8CF9A',
  lid: '#9C7C40',
  cheek: '#9C7C40',
};

const INK = '#2A1206';
const IRIS = '#5B3417';
const MOUTH = '#5A1A08';
const TONGUE = '#E86A5A';
const TEAR = '#7CC4FF';

// ---------- Stalk ----------
// Internode heights / widths (bottom → top). Local coordinates: joint at (0,0), growing up to (0,-h).
const SEG = [
  { h: 66, w0: 48, w1: 50 },
  { h: 82, w0: 56, w1: 58 }, // the face lives here
  { h: 52, w0: 52, w1: 46 },
];

const rindGradient = (pal, w) =>
  gfill(
    pal.rind.map((c, i) => [i / (pal.rind.length - 1), c]),
    [-w / 2 - 1, 0],
    [w / 2 + 1, 0],
  );

/** One internode: slightly barrel-shaped cylinder with shading, streaks and bloom. */
function internode(pal, { h, w0, w1 }, i) {
  const l0 = -w0 / 2, r0 = w0 / 2, l1 = -w1 / 2, r1 = w1 / 2;
  const bulge = 2.5;
  const body = path(
    [
      [l0, 4, [0, 0], [-bulge, -h * 0.35]],
      [l1, -h, [-bulge, h * 0.35], [w1 * 0.25, -2]],
      [r1, -h, [-w1 * 0.25, -2], [bulge, h * 0.35]],
      [r0, 4, [bulge, -h * 0.35], [-w0 * 0.25, 2]],
    ],
    true,
  );
  const w = Math.max(w0, w1);
  const streaks = group('streaks', [
    path([[l0 * 0.55, -6, [0, 0], [-1, -h * 0.3]], [l1 * 0.6, -h + 8, [-1, h * 0.3], [0, 0]]]),
    path([[r0 * 0.25, -10, [0, 0], [1, -h * 0.3]], [r1 * 0.3, -h + 12, [1, h * 0.3], [0, 0]]]),
    path([[r0 * 0.7, -4, [0, 0], [1.5, -h * 0.3]], [r1 * 0.72, -h + 6, [1.5, h * 0.3], [0, 0]]]),
    stroke(pal.streak, 1.2, 22),
  ]);
  // Specular sheen down the lit side, plus soft occlusion under the node above.
  const sheen = group('sheen', [
    path([[l0 * 0.32, -8, [0, 0], [-1, -h * 0.3]], [l1 * 0.36, -h + 10, [-1, h * 0.3], [0, 0]]]),
    stroke('#FFFFFF', 4, 26),
  ]);
  const occlusion = group('occlusion', [rect([0, -h + 5], [w1 + 1, 10], 5), fill(pal.rind[0], 30)]);
  const bloom = group('bloom', [rect([0, -9], [w0 - 2, 9], 4.5), fill(pal.bloom, 30)]);
  return [occlusion, sheen, streaks, bloom, group('rind', [body, stroke(pal.outline, 2.2, 70), rindGradient(pal, w)])];
}

/** The ring where two internodes meet, with a growth ring, leaf scar and a bud on alternating sides. */
function node(pal, w, side) {
  const nodeGrad = gfill(pal.node.map((c, i) => [i / (pal.node.length - 1), c]), [-w / 2 - 2, 0], [w / 2 + 2, 0]);
  return group('node', [
    group('bud', [
      path([[0, 4, [0, 0], [-4, -2]], [0, -6, [-3, 3], [3, 3]], [0, 4, [4, -2], [0, 0]]], true),
      stroke(pal.outline, 1.4, 60),
      fill(pal.node[2]),
    ], { p: [side * (w / 2 - 6), -5] }),
    group('scar', [path([[-w / 2 + 2, 3], [w / 2 - 2, 3]]), stroke(pal.node[0], 1.2, 45)]),
    group('growth-ring', [path([[-w / 2 + 1, -3.5, [0, 0], [w * 0.2, 1.5]], [w / 2 - 1, -3.5, [-w * 0.2, 1.5], [0, 0]]]), stroke(pal.bloom, 1.4, 55)]),
    group('ring', [rect([0, 0], [w + 5, 8], 4), stroke(pal.outline, 2, 75), nodeGrad]),
  ]);
}

// ---------- Leaves ----------
/**
 * A tapered grass blade as a closed path. The spine starts at angle a0 (degrees, 0 = right, -90 = up)
 * and curves by `bend` degrees over its length, so animating `bend` flexes the leaf like a real blade.
 */
function leafShape({ len, w, a0, bend, droop = 0 }) {
  const N = 9;
  const spine = [];
  let x = 0, y = 0;
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const ang = ((a0 + bend * t * t + droop * t * t * t) * Math.PI) / 180;
    spine.push({ x, y, ang, t });
    x += (Math.cos(ang) * len) / N;
    y += (Math.sin(ang) * len) / N;
  }
  const half = (t) => (w / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95)), 0.8) * (1 - t * 0.15);
  const left = spine.map(({ x, y, ang, t }) => [x + Math.sin(ang) * half(t), y - Math.cos(ang) * half(t)]);
  const right = spine.map(({ x, y, ang, t }) => [x - Math.sin(ang) * half(t), y + Math.cos(ang) * half(t)]);
  const tip = [spine[N].x, spine[N].y];
  const outline = [...left.slice(0, N), tip, ...right.slice(0, N).reverse()];
  const rib = spine.slice(0, N).map(({ x, y }) => [x, y]);
  return { outline: smooth(outline, true), rib: smooth(rib, false), tip };
}

/** A leaf whose bend (and droop) can be animated: frames [[t, {bend, droop}], ...] or a static spec. */
function leaf(pal, nm, spec, anim = null, tr = {}) {
  const frames = anim ?? [[0, {}]];
  const shapes = frames.map(([t, over, e]) => [t, leafShape({ ...spec, ...over }), e]);
  const outline = shapes.length > 1 ? pathAnim(shapes.map(([t, s, e]) => [t, s.outline, e])) : { ty: 'sh', d: 1, ks: prop(shapes[0][1].outline), nm: 'path' };
  const rib = shapes.length > 1 ? pathAnim(shapes.map(([t, s, e]) => [t, s.rib, e])) : { ty: 'sh', d: 1, ks: prop(shapes[0][1].rib), nm: 'path' };
  const tipDir = shapes[0][1].tip;
  return group(nm, [
    group('rib', [rib, stroke(pal.rib, 1.3, 55)]),
    group('blade', [
      outline,
      stroke(pal.leafBase, 1.4, 80),
      gfill([[0, pal.leafBase], [0.45, pal.leafMid], [1, pal.leafTip]], [0, 0], [tipDir[0], tipDir[1]]),
    ]),
  ], tr);
}

/** Frames that flex a leaf between bend values on a loop, with an optional phase lag. */
const flex = (op, { bend, amp, cycles = 1, phase = 0, droop = 0, droopAmp = 0, steps = 12 }) => {
  const frames = [];
  for (let k = 0; k <= steps; k++) {
    const s = Math.sin(2 * Math.PI * (cycles * (k / steps) + phase));
    frames.push([(op * k) / steps, { bend: bend + amp * s, droop: droop + droopAmp * s }, 'linear']);
  }
  return frames;
};

// ---------- Face ----------
/** Realistic-ish eye: white with soft shade, iris, pupil, two highlights, optional eyelid. */
function eye(nm, pos, { look = [0, 0], blink = null, lid = 0, pal, size = [17, 20], lidAnim = null }) {
  const [ew, eh] = size;
  const lidItems = [];
  if (lid || lidAnim) {
    // Upper lid: a rind-coloured cap that covers the top of the eye.
    const cap = (amount) => shape([
      [-ew / 2 - 2, -eh / 2 - 3, [0, 0], [0, 0]],
      [ew / 2 + 2, -eh / 2 - 3, [0, 0], [0, 0]],
      [ew / 2 + 2, -eh / 2 + eh * amount, [0, 0], [-ew * 0.3, 3]],
      [-ew / 2 - 2, -eh / 2 + eh * amount, [ew * 0.3, 3], [0, 0]],
    ], true);
    const lidShape = lidAnim ? pathAnim(lidAnim.map(([t, a, e]) => [t, cap(a), e])) : { ty: 'sh', d: 1, ks: prop(cap(lid)), nm: 'path' };
    lidItems.push(group('lid', [
      group('lash', [lidAnim ? pathAnim(lidAnim.map(([t, a, e]) => [t, shape([[-ew / 2 - 1, -eh / 2 + eh * a + 1, [0, 0], [ew * 0.3, 3]], [ew / 2 + 1, -eh / 2 + eh * a + 1, [-ew * 0.3, 3], [0, 0]]]), e])) : path([[-ew / 2 - 1, -eh / 2 + eh * lid + 1, [0, 0], [ew * 0.3, 3]], [ew / 2 + 1, -eh / 2 + eh * lid + 1, [-ew * 0.3, 3], [0, 0]]]), stroke(INK, 2)]),
      group('cap', [lidShape, fill(pal.lid)]),
    ]));
  }
  return group(nm, [
    ...lidItems,
    group('iris', [
      group('glint-2', [ellipse([2.6, 2.4], [1.8, 1.8]), fill('#FFFFFF', 80)]),
      group('glint', [ellipse([-2.2, -2.6], [3.6, 3.6]), fill('#FFFFFF')]),
      group('pupil', [ellipse([0, 0], [5.4, 6.2]), fill('#120804')]),
      group('iris-ring', [ellipse([0, 0], [10.5, 12]), stroke('#2A160A', 1, 70), gfill([[0, '#8A5A2E'], [1, IRIS]], [0, -6], [0, 6])]),
    ], { p: look }),
    group('shade', [ellipse([0, -eh * 0.18], [ew * 0.9, eh * 0.55]), fill('#C9B8A8', 35)]),
    group('white', [ellipse([0, 0], size), stroke(INK, 1.8), fill('#FFFDF8')]),
  ], { p: pos, s: blink ?? [100, 100] });
}

/** Irregular blink: frames list of blink start frames. */
const blinks = (op, at) => {
  const f = [[0, [100, 100]]];
  for (const t of at) f.push([t, [100, 100], 'in'], [t + 2, [100, 6], 'out'], [t + 5, [100, 100]]);
  f.push([op, [100, 100]]);
  return kf(f);
};

const brow = (pts) => path(pts);
const browGroup = (l, r, anim = {}) =>
  group('brows', [group('l', [l, stroke(INK, 2.6)], anim.l ?? {}), group('r', [r, stroke(INK, 2.6)], anim.r ?? {})]);

const cheeks = (pal, op = 40) => group('cheeks', [ellipse([-17, -36], [11, 6]), ellipse([19, -36], [11, 6]), fill(pal.cheek, op)]);

// Mouth shapes: 4 vertices, closed, so they can morph into each other.
const mouthShape = ({ w = 14, up = 0, open = 2, curve = 6 }) =>
  shape([
    [-w / 2, -up, [0, 0], [w * 0.2, curve]],
    [w / 2, -up, [-w * 0.2, curve], [0, open * 0.6]],
    [0, curve + open, [w * 0.3, 0], [-w * 0.3, 0]],
    [-w / 2, -up, [0, open * 0.6], [0, 0]],
  ], true);
const mouth = (frames, p = [1, -26]) =>
  group('mouth', [
    frames.length > 1 ? pathAnim(frames.map(([t, m, e]) => [t, mouthShape(m), e])) : { ty: 'sh', d: 1, ks: prop(mouthShape(frames[0][1])), nm: 'path' },
    stroke(INK, 2),
    fill(MOUTH),
  ], { p });

// ---------- Assembly ----------
/**
 * Builds the whole stalk as nested groups so each joint can bend.
 * opts: { pal, rot: [r1, r2, r3] (props), face: [...items], arms: { l, r }, crown: [...leaves], extra2, extra3 }
 */
function stalk(opts) {
  const { pal } = opts;
  const [s1, s2, s3] = SEG;
  const crownGroup = group('crown', opts.crown ?? [], { p: [0, -s3.h + 4] });
  const seg3 = group('seg-3', [
    ...(opts.extra3 ?? []),
    crownGroup,
    node(pal, s3.w0, 1),
    ...internode(pal, s3, 2),
  ], { p: [0, -s2.h], r: opts.rot?.[2] ?? 0 });
  const seg2 = group('seg-2', [
    ...(opts.extra2 ?? []),
    opts.arms?.l ?? group('arm-l', []),
    opts.arms?.r ?? group('arm-r', []),
    seg3,
    ...(opts.face ?? []),
    node(pal, s2.w0, -1),
    ...internode(pal, s2, 1),
  ], { p: [0, -s1.h], r: opts.rot?.[1] ?? 0 });
  const seg1 = group('seg-1', [seg2, ...internode(pal, s1, 0)], { r: opts.rot?.[0] ?? 0 });
  const roots = group('roots', [
    path([[-14, -2, [0, 0], [-6, 4]], [-26, 6, [4, -3], [0, 0]]]),
    path([[-6, 0, [0, 0], [-2, 5]], [-12, 9, [2, -3], [0, 0]]]),
    path([[8, 0, [0, 0], [3, 5]], [14, 9, [-2, -3], [0, 0]]]),
    path([[15, -2, [0, 0], [6, 4]], [27, 5, [-4, -3], [0, 0]]]),
    stroke('#6B4A2A', 2.4, 85),
  ]);
  // Scaled to leave headroom for jumps and the crown inside the 300 × 300 frame.
  return [group('stalk', [seg1, roots], { s: [86, 86] })];
}

/** Arm leaf attached at the top of the face internode. side: -1 left, 1 right. */
function armLeaf(pal, side, { rot = 0, bendFrames = null, spec = {}, extra = [] } = {}) {
  const base = { len: 62, w: 13, a0: side > 0 ? -18 : -162, bend: side > 0 ? 70 : -70, ...spec };
  const lf = leaf(pal, 'blade', base, bendFrames);
  return group(side > 0 ? 'arm-r' : 'arm-l', [...extra, lf], { p: [side * (SEG[1].w1 / 2 - 4), -SEG[1].h + 6], r: rot });
}

/** Crown: five arching leaves and a spindle, each with its own lag so wind ripples through them. */
function crown(pal, op, { amp = 6, droop = 0, cycles = 1, phaseBase = 0.1, still = false } = {}) {
  const leaves = [
    { a0: -120, bend: -70, len: 64, w: 12, phase: 0.0 },
    { a0: -60, bend: 72, len: 66, w: 12, phase: 0.12 },
    { a0: -104, bend: -40, len: 72, w: 11, phase: 0.22 },
    { a0: -76, bend: 44, len: 74, w: 11, phase: 0.32 },
    { a0: -92, bend: 10, len: 50, w: 8, phase: 0.42 }, // spindle
  ];
  return leaves.map((l, i) =>
    leaf(
      pal,
      `crown-${i}`,
      { len: l.len, w: l.w, a0: l.a0, bend: l.bend },
      still ? null : flex(op, { bend: l.bend, amp: amp * Math.sign(l.bend || 1), cycles, phase: phaseBase + l.phase, droop: droop * Math.sign(l.bend || 1), droopAmp: droop * 0.15 }),
      { r: still ? 0 : wave(op, { amp: amp * 0.35, cycles, phase: phaseBase + l.phase + 0.1 }) },
    ),
  );
}

const shadowLayer = (op, scale = [100, 100, 100]) =>
  layer('shadow', [
    group('contact', [ellipse([0, 0], [70, 10]), fill('#000000', 35)]),
    group('soft', [ellipse([0, 0], [130, 22]), fill('#000000', 18)]),
  ], op, { p: [...ROOT, 0], s: scale });

const bodyLayer = (shapes, op, ks = {}) => layer('body', shapes, op, { a: [0, 0, 0], p: ks.p ?? [...ROOT, 0], s: ks.s, r: ks.r });

// Face coordinates are local to the face internode (joint at 0, top at -82).
const EYE_L = [-12, -50];
const EYE_R = [14, -50];

// ---------- Moods ----------

function idle() {
  const op = 120;
  const pal = HEALTHY;
  const look = kf([[0, [0, 0]], [28, [0, 0]], [34, [3, -1], 'out'], [70, [3, -1]], [76, [-2, 0], 'out'], [100, [-2, 0]], [108, [0, 0]], [op, [0, 0]]]);
  return animation('idle', op, [
    bodyLayer(
      stalk({
        pal,
        rot: [wave(op, { amp: 1.4 }), wave(op, { amp: 1.8, phase: -0.08 }), wave(op, { amp: 2.6, phase: -0.16 })],
        face: [
          mouth([[0, { w: 13, curve: 5, open: 1.5 }], [60, { w: 14, curve: 6, open: 2 }], [op, { w: 13, curve: 5, open: 1.5 }]]),
          cheeks(pal),
          browGroup(brow([[-19, -64, [0, 0], [4, -3]], [-6, -65, [-4, -1], [0, 0]]]), brow([[8, -65, [0, 0], [4, -1]], [21, -64, [-4, -3], [0, 0]]])),
          eye('eye-l', EYE_L, { pal, look, blink: blinks(op, [46, 104]) }),
          eye('eye-r', EYE_R, { pal, look, blink: blinks(op, [46, 104]) }),
        ],
        arms: {
          l: armLeaf(pal, -1, { rot: wave(op, { amp: 4, phase: -0.2 }), bendFrames: flex(op, { bend: -70, amp: -6, phase: -0.25 }) }),
          r: armLeaf(pal, 1, { rot: wave(op, { amp: 4, phase: -0.3 }), bendFrames: flex(op, { bend: 70, amp: 6, phase: -0.35 }) }),
        },
        crown: crown(pal, op, { amp: 5 }),
      }),
      op,
      { s: wave2(op, { base: [100, 100, 100], amp: [-0.6, 1.2, 0], cycles: 2 }) },
    ),
    shadowLayer(op, wave2(op, { base: [100, 100, 100], amp: [2, 0, 0] })),
  ]);
}

function scanning() {
  const op = 60;
  const pal = HEALTHY;
  // Eyes sweep across the label the way a reader's do: steady drift, quick return.
  const look = kf([[0, [-3, 1]], [24, [3.5, 1], 'linear'], [30, [-3, 2.5], 'out'], [54, [3.5, 2.5], 'linear'], [op, [-3, 1], 'out']]);
  const magnifier = group('magnifier', [
    group('glint', [path([[-9, -14, [0, 0], [1, -4]], [-4, -18, [-4, 0], [0, 0]]]), stroke('#FFFFFF', 2.4, 90)]),
    group('lens', [ellipse([0, -10], [26, 26]), stroke('#3A3F48', 3.4), gfill([[0, '#DDF2FF'], [1, '#8EC9F0']], [-10, -20], [10, 0], 45)]),
    group('handle', [path([[0, 3], [0, 18]]), stroke('#5A3A22', 5)]),
  ], { p: [46, -28], r: -30 });
  return animation('scanning', op, [
    bodyLayer(
      stalk({
        pal,
        rot: [kf([[0, -1.5], [30, 1.5], [op, -1.5]]), kf([[0, -3], [30, 2], [op, -3]]), kf([[0, -4], [32, 3], [op, -4]])],
        face: [
          mouth([[0, { w: 7, curve: 2, open: 4 }], [30, { w: 8, curve: 1.5, open: 5 }], [op, { w: 7, curve: 2, open: 4 }]]),
          cheeks(pal, 25),
          browGroup(
            brow([[-19, -62, [0, 0], [4, -2]], [-5, -63, [-4, 0], [0, 0]]]),
            brow([[8, -67, [0, 0], [4, -4]], [22, -68, [-4, -2], [0, 0]]]),
            { r: { p: kf([[0, [0, 0]], [30, [0, -1.5]], [op, [0, 0]]]) } },
          ),
          eye('eye-l', EYE_L, { pal, look, lid: 0.18 }),
          eye('eye-r', EYE_R, { pal, look, lid: 0.12 }),
        ],
        arms: {
          l: armLeaf(pal, -1, { rot: wave(op, { amp: 3, phase: -0.2 }), bendFrames: flex(op, { bend: -78, amp: -5, phase: -0.2 }) }),
          r: armLeaf(pal, 1, {
            spec: { a0: -40, bend: 20, len: 50 },
            rot: kf([[0, -10], [26, 14], [32, 12], [54, -8], [op, -10]]),
            extra: [magnifier],
          }),
        },
        crown: crown(pal, op, { amp: 4, cycles: 1, phaseBase: -0.1 }),
      }),
      op,
      { s: wave2(op, { base: [100, 100, 100], amp: [-0.5, 1, 0], cycles: 1 }) },
    ),
    shadowLayer(op),
  ]);
}

function happy() {
  // CLEAN: anticipation crouch → spring up with leaves flung high → float → land with squash → settle.
  const op = 54;
  const pal = HEALTHY;
  const y = (dy) => [ROOT[0], ROOT[1] + dy, 0];
  const pos = kf([[0, y(0)], [8, y(0), 'out'], [24, y(-26), 'out'], [30, y(-28), 'in'], [40, y(0), 'out'], [op, y(0)]]);
  const squash = kf([
    [0, [100, 100, 100]], [8, [110, 88, 100], 'out'], [14, [93, 110, 100], 'out'], [24, [99, 101, 100]],
    [40, [100, 100, 100], 'out'], [43, [112, 86, 100], 'out'], [48, [97, 103, 100]], [op, [100, 100, 100]],
  ]);
  const armUp = (side) =>
    armLeaf(pal, side, {
      rot: kf([[0, 0], [8, side * 12, 'out'], [16, side * -52, 'back'], [30, side * -46], [40, side * -36], [46, side * -6, 'out'], [op, 0]]),
      bendFrames: [[0, { bend: side * 70 }], [16, { bend: side * 30 }, 'out'], [30, { bend: side * 50 }], [44, { bend: side * 84 }, 'out'], [op, { bend: side * 70 }]],
    });
  const crownFollow = crown(pal, op, { amp: 9, cycles: 2, phaseBase: 0.25 });
  const glint = (cx, cy, R, color, delay) => {
    const r = R * 0.22;
    const pts = [];
    for (let k = 0; k < 8; k++) {
      const ang = (Math.PI / 4) * k - Math.PI / 2;
      const rad = k % 2 === 0 ? R : r;
      pts.push([Math.cos(ang) * rad, Math.sin(ang) * rad]);
    }
    const frames = [[0, [0, 0]], [delay, [0, 0]], [delay + 7, [120, 120], 'out'], [delay + 16, [0, 0], 'in'], [op, [0, 0]]];
    return group('glint', [path(pts, true), fill(color)], { p: [cx, cy], s: kf(frames), r: kf([[0, 0], [op, 90]]) });
  };
  return animation('happy', op, [
    layer('sparkles', [
      glint(58, 70, 13, '#FFE8A3', 14),
      glint(244, 58, 11, '#FFFFFF', 20),
      glint(252, 150, 8, '#A7F3D0', 26),
      glint(44, 150, 9, '#FFE8A3', 18),
      glint(150, 22, 9, '#A7F3D0', 24),
    ], op),
    bodyLayer(
      stalk({
        pal,
        rot: [kf([[0, 0], [8, 0], [14, -2], [24, 1.5], [40, 0], [44, 2], [op, 0]]), kf([[0, 0], [14, -3], [26, 2], [44, -2.5], [50, 1], [op, 0]]), kf([[0, 0], [16, -5], [28, 3], [46, -4], [52, 1.5], [op, 0]])],
        face: [
          mouth([[0, { w: 18, curve: 9, open: 7, up: 1 }], [16, { w: 22, curve: 11, open: 10, up: 2 }, 'out'], [40, { w: 20, curve: 10, open: 8, up: 1 }], [op, { w: 18, curve: 9, open: 7, up: 1 }]]),
          group('tongue', [ellipse([1, -16], [9, 5]), fill(TONGUE)], { o: 85 }),
          cheeks(pal, 70),
          browGroup(brow([[-20, -66, [0, 0], [4, -4]], [-5, -68, [-4, -1], [0, 0]]]), brow([[8, -68, [0, 0], [4, -1]], [23, -66, [-4, -4], [0, 0]]]), { l: { p: kf([[0, [0, 0]], [16, [0, -3]], [40, [0, -1]], [op, [0, 0]]]) }, r: { p: kf([[0, [0, 0]], [16, [0, -3]], [40, [0, -1]], [op, [0, 0]]]) } }),
          // Happy closed eyes: smiling arcs.
          group('eye-l', [path([[-8, 2, [0, 0], [3, -9]], [8, 2, [-3, -9], [0, 0]]]), stroke(INK, 2.8)], { p: EYE_L }),
          group('eye-r', [path([[-8, 2, [0, 0], [3, -9]], [8, 2, [-3, -9], [0, 0]]]), stroke(INK, 2.8)], { p: EYE_R }),
        ],
        arms: { l: armUp(-1), r: armUp(1) },
        crown: crownFollow,
      }),
      op,
      { p: pos, s: squash },
    ),
    shadowLayer(op, kf([[0, [100, 100, 100]], [8, [108, 108, 100]], [27, [55, 55, 100]], [40, [100, 100, 100], 'out'], [43, [112, 112, 100]], [op, [100, 100, 100]]])),
  ]);
}

function okay() {
  // OKAY: a slow, unconvinced shrug with a head tilt, one raised brow and a nervous sweat drop.
  const op = 84;
  const pal = HEALTHY;
  const shrug = (side) =>
    armLeaf(pal, side, {
      rot: kf([[0, 0], [14, side * -6, 'in'], [24, side * -40, 'back'], [46, side * -36], [58, side * -4, 'inOut'], [op, 0]]),
      bendFrames: [[0, { bend: side * 72 }], [24, { bend: side * 40 }, 'out'], [46, { bend: side * 46 }], [60, { bend: side * 78 }], [op, { bend: side * 72 }]],
    });
  const look = kf([[0, [-3, 1]], [20, [-3, 1]], [26, [3, 1], 'out'], [56, [3, 1]], [62, [-3, 1], 'out'], [op, [-3, 1]]]);
  const sweat = group('sweat', [
    group('drop', [path([[0, -6, [0, 0], [3, 4]], [0, 5, [4, 0], [-4, 0]], [0, -6, [-3, 4], [0, 0]]], true), stroke('#3E8FCC', 1, 60), fill(TEAR, 90)]),
  ], {
    p: kf([[0, [26, -72]], [18, [26, -72]], [44, [28, -50], 'in'], [op, [28, -50]]]),
    o: kf([[0, 0], [18, 0], [22, 100], [40, 100], [46, 0], [op, 0]]),
  });
  return animation('okay', op, [
    bodyLayer(
      stalk({
        pal,
        rot: [kf([[0, 0], [24, -1], [56, -1], [op, 0]]), kf([[0, 0], [24, 3, 'out'], [56, 3.5], [70, 0], [op, 0]]), kf([[0, 0], [26, 7, 'out'], [56, 8], [72, 0], [op, 0]])],
        face: [
          sweat,
          mouth([[0, { w: 14, curve: -1, open: 1.5 }], [24, { w: 15, curve: -3, open: 2 }, 'out'], [56, { w: 15, curve: -3, open: 2 }], [op, { w: 14, curve: -1, open: 1.5 }]], [2, -26]),
          cheeks(pal, 20),
          browGroup(
            brow([[-19, -63, [0, 0], [4, 0]], [-5, -63, [-4, 0], [0, 0]]]),
            brow([[8, -66, [0, 0], [4, -5]], [22, -66, [-4, -4], [0, 0]]]),
            { r: { p: kf([[0, [0, 0]], [24, [0, -4], 'back'], [56, [0, -4]], [66, [0, 0]], [op, [0, 0]]]) } },
          ),
          eye('eye-l', EYE_L, { pal, look, lid: 0.32, blink: blinks(op, [70]) }),
          eye('eye-r', EYE_R, { pal, look, lid: 0.1, blink: blinks(op, [70]) }),
        ],
        arms: { l: shrug(-1), r: shrug(1) },
        crown: crown(pal, op, { amp: 4, phaseBase: 0.3 }),
      }),
      op,
      { s: kf([[0, [100, 100, 100]], [20, [101, 99, 100]], [26, [99, 102, 100], 'out'], [56, [100, 101, 100]], [66, [100, 100, 100]], [op, [100, 100, 100]]]) },
    ),
    shadowLayer(op),
  ]);
}

function bad() {
  // BAD: the cane has gone off. It wilts forward, leaves droop and brown at the tips,
  // it shivers and sobs, and a fly circles it. Colours are sick from frame 0 so the loop is seamless.
  const op = 72;
  const pal = SICK;
  const sob = kf([[0, [100, 100, 100]], [9, [101.5, 97.5, 100]], [18, [100, 100, 100]], [27, [101.5, 97.5, 100]], [36, [100, 100, 100]], [op, [100, 100, 100]]]);
  const shiver = (base, amp) => {
    const f = [];
    for (let t = 0; t <= op; t += 3) f.push([t, base + (t % 6 === 0 ? amp : -amp), 'linear']);
    f[f.length - 1] = [op, base + amp];
    return kf(f);
  };
  const tear = (x, delay) =>
    group('tear', [path([[0, -4, [0, 0], [2.5, 3]], [0, 4, [3, 0], [-3, 0]], [0, -4, [-2.5, 3], [0, 0]]], true), fill(TEAR, 95)], {
      p: kf([[0, [x, -42]], [delay, [x, -42]], [delay + 26, [x + (x < 0 ? -3 : 3), -4], 'in'], [op, [x + (x < 0 ? -3 : 3), -4]]]),
      o: kf([[0, 0], [delay, 0], [delay + 3, 100], [delay + 22, 100], [delay + 26, 0], [op, 0]]),
    });
  const rot = group('rot-spots', [ellipse([-16, -16], [7, 5]), ellipse([18, -8], [5, 4]), ellipse([10, -70], [4, 3]), fill('#3A2410', 55)]);
  const droopArm = (side) =>
    armLeaf(pal, side, {
      spec: { a0: side > 0 ? 10 : 170, len: 60 },
      rot: kf([[0, side * 8], [18, side * 11], [36, side * 8], [54, side * 11], [op, side * 8]]),
      bendFrames: [[0, { bend: side * 85, droop: side * 25 }], [36, { bend: side * 92, droop: side * 30 }], [op, { bend: side * 85, droop: side * 25 }]],
    });
  // Fly: body + flapping wings on a lazy figure-eight around the head.
  const flyPath = [];
  for (let k = 0; k <= 12; k++) {
    const a = (2 * Math.PI * k) / 12;
    flyPath.push([(op * k) / 12, [150 + 70 * Math.sin(a), 70 + 22 * Math.sin(2 * a)], 'linear']);
  }
  const flap = [];
  for (let t = 0; t <= op; t += 2) flap.push([t, [100, t % 4 === 0 ? 100 : 25], 'linear']);
  const fly = group('fly', [
    group('wings', [ellipse([-4, -5], [8, 6]), ellipse([4, -5], [8, 6]), stroke('#FFFFFF', 0.8, 70), fill('#DDEEFF', 60)], { s: kf(flap) }),
    group('body', [ellipse([0, 0], [8, 6]), fill('#151515')]),
  ], { p: kf(flyPath) });
  return animation('sad', op, [
    layer('fly', [fly], op),
    bodyLayer(
      stalk({
        pal,
        rot: [shiver(4, 0.4), kf([[0, 6], [18, 8], [36, 6], [54, 8], [op, 6]]), kf([[0, 9], [20, 12], [38, 9], [56, 12], [op, 9]])],
        extra2: [rot],
        face: [
          tear(-12, 4),
          tear(14, 30),
          tear(-12, 40),
          mouth([[0, { w: 16, curve: -7, open: 2, up: -6 }], [9, { w: 17, curve: -9, open: 4, up: -6 }], [18, { w: 16, curve: -7, open: 2, up: -6 }], [27, { w: 17, curve: -9, open: 4, up: -6 }], [36, { w: 16, curve: -7, open: 2, up: -6 }], [op, { w: 16, curve: -7, open: 2, up: -6 }]], [1, -22]),
          browGroup(brow([[-20, -60, [0, 0], [4, -2]], [-6, -66, [-3, 2], [0, 0]]]), brow([[8, -66, [0, 0], [3, 2]], [22, -60, [-4, -2], [0, 0]]])),
          eye('eye-l', EYE_L, { pal, look: [1, 3], lid: 0.38, size: [17, 19] }),
          eye('eye-r', EYE_R, { pal, look: [-1, 3], lid: 0.38, size: [17, 19] }),
        ],
        arms: { l: droopArm(-1), r: droopArm(1) },
        crown: crown(pal, op, { amp: 3, droop: 70, cycles: 1 }),
      }),
      op,
      { s: sob },
    ),
    shadowLayer(op),
  ]);
}

mkdirSync('assets/lottie', { recursive: true });
const moods = { idle, scanning, clean: happy, okay, bad };
for (const [name, build] of Object.entries(moods)) {
  const anim = build();
  anim.nm = name;
  // Two decimals is plenty at this size and keeps the files small.
  writeFileSync(`assets/lottie/${name}.json`, JSON.stringify(anim, (_k, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)));
  console.log(`wrote assets/lottie/${name}.json`);
}
