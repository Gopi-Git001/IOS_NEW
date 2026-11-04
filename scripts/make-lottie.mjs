// Generates the sugar-cube character as Lottie animations in assets/lottie/.
// Run with: npm run lottie
import { mkdirSync, writeFileSync } from 'node:fs';

const FPS = 30;
const SIZE = 300;

// ---------- Lottie helpers ----------
const isProp = (v) => v && typeof v === 'object' && 'a' in v && 'k' in v;
const prop = (v) => (isProp(v) ? v : { a: 0, k: v });

/** Animated value. frames: [[frame, value], ...] — values are numbers, arrays or path shapes. */
const kf = (frames) => ({
  a: 1,
  k: frames.map(([t, v], idx) => {
    const isShape = v && typeof v === 'object' && !Array.isArray(v);
    const s = isShape ? [v] : Array.isArray(v) ? v : [v];
    if (idx === frames.length - 1) return { t, s };
    const dims = isShape ? 1 : s.length;
    return {
      t,
      s,
      o: { x: Array(dims).fill(0.42), y: Array(dims).fill(0) },
      i: { x: Array(dims).fill(0.58), y: Array(dims).fill(1) },
    };
  }),
});

const hex = (h, a = 1) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
};

const fill = (color, opacity = 100) => ({ ty: 'fl', c: prop(hex(color)), o: prop(opacity), r: 1, nm: 'fill' });
const stroke = (color, width, opacity = 100) => ({
  ty: 'st', c: prop(hex(color)), o: prop(opacity), w: prop(width), lc: 2, lj: 2, ml: 4, nm: 'stroke',
});
const ellipse = (p, s) => ({ ty: 'el', d: 1, p: prop(p), s: prop(s), nm: 'ellipse' });
const rect = (p, s, r) => ({ ty: 'rc', d: 1, p: prop(p), s: prop(s), r: prop(r), nm: 'rect' });

/** Path shape data. pts: [[x, y, inTangent?, outTangent?], ...] (tangents relative to the point). */
const shape = (pts, closed = false) => ({
  c: closed,
  v: pts.map((p) => [p[0], p[1]]),
  i: pts.map((p) => p[2] ?? [0, 0]),
  o: pts.map((p) => p[3] ?? [0, 0]),
});
const path = (pts, closed = false) => ({ ty: 'sh', d: 1, ks: prop(shape(pts, closed)), nm: 'path' });
const pathAnim = (frames) => ({ ty: 'sh', d: 1, ks: kf(frames), nm: 'path' });

const group = (nm, items, tr = {}) => ({
  ty: 'gr',
  nm,
  it: [
    ...items,
    {
      ty: 'tr',
      p: prop(tr.p ?? [0, 0]),
      a: prop(tr.a ?? [0, 0]),
      s: prop(tr.s ?? [100, 100]),
      r: prop(tr.r ?? 0),
      o: prop(tr.o ?? 100),
      sk: prop(0),
      sa: prop(0),
      nm: 'transform',
    },
  ],
});

const layer = (nm, ind, shapes, op, ks = {}) => ({
  ddd: 0,
  ind,
  ty: 4,
  nm,
  sr: 1,
  ao: 0,
  ip: 0,
  op,
  st: 0,
  bm: 0,
  ks: {
    o: prop(ks.o ?? 100),
    r: prop(ks.r ?? 0),
    p: prop(ks.p ?? [0, 0, 0]),
    a: prop(ks.a ?? [0, 0, 0]),
    s: prop(ks.s ?? [100, 100, 100]),
  },
  shapes,
});

const animation = (nm, op, layers) => ({
  v: '5.7.4', fr: FPS, ip: 0, op, w: SIZE, h: SIZE, nm, ddd: 0, assets: [],
  layers: layers.map((l, i) => ({ ...l, ind: i + 1 })),
});

// ---------- Character parts ----------
const INK = '#1E1E26';
const FRONT = '#F5F5F0';
const TOP = '#FFFFFF';
const SIDE = '#D8D8D2';
const SPECK = '#C9C9C2';
const BLUSH = '#F9A8B8';
const TEAR = '#60A5FA';

// Cube front face spans x 80..200, y 95..205. Feet rest at y≈250.
const FEET = [150, 250];

const cube = () => [
  group('front', [rect([140, 150], [120, 110], 16), stroke(INK, 5), fill(FRONT)]),
  group('side', [path([[196, 97], [222, 74], [222, 180], [198, 202]], true), stroke(INK, 5), fill(SIDE)]),
  group('top', [path([[84, 97], [108, 72], [222, 72], [198, 97]], true), stroke(INK, 5), fill(TOP)]),
];

// Little sugar-grain specks on the faces.
const specks = () =>
  group('specks', [
    ...[[96, 112], [186, 118], [92, 190], [184, 192], [140, 112], [210, 120], [212, 160], [130, 82], [180, 80]].map(
      (p) => ellipse(p, [3.5, 3.5]),
    ),
    fill(SPECK),
  ]);

/** One open eye centred on the origin; pupil offset can be animated. */
const eye = (name, pos, { pupil = [2, 3], blink = null, size = [26, 30] } = {}) =>
  group(
    name,
    [
      group('shine', [ellipse([-2, -4], [5, 5]), fill('#FFFFFF')], { p: pupil }),
      group('pupil', [ellipse([0, 0], [13, 15]), fill(INK)], { p: pupil }),
      group('white', [ellipse([0, 0], size), stroke(INK, 4), fill('#FFFFFF')]),
    ],
    { p: pos, s: blink ?? [100, 100] },
  );

const blinkFrames = (at) => kf([[0, [100, 100]], [at, [100, 100]], [at + 3, [100, 8]], [at + 6, [100, 100]]]);

/** Closed "^ ^" happy eye. */
const happyEye = (name, pos) =>
  group(name, [path([[-11, 4, [0, 0], [4, -12]], [11, 4, [-4, -12], [0, 0]]]), stroke(INK, 5)], { p: pos });

const blush = () => group('blush', [ellipse([102, 166], [17, 9]), ellipse([178, 166], [17, 9]), fill(BLUSH, 85)]);

const brows = (left, right) =>
  group('brows', [path(left), path(right), stroke(INK, 4.5)]);

/** Arm: a curved line from the shoulder (origin) to a round hand. */
const arm = (name, shoulder, hand, rotation = 0, extra = []) =>
  group(
    name,
    [
      ...extra,
      group('hand', [ellipse(hand, [17, 17]), stroke(INK, 4), fill('#FFFFFF')]),
      group('line', [path([[0, 0, [0, 0], [hand[0] * 0.2, hand[1] * 0.6]], [hand[0], hand[1], [-hand[0] * 0.3, 0], [0, 0]]]), stroke(INK, 5)]),
    ],
    { p: shoulder, r: rotation },
  );

const legs = (shoe = '#F2F2EC', accent = null) => [
  group('shoes', [
    ...(accent
      ? [group('stripes', [path([[106, 241], [116, 247]]), path([[158, 241], [168, 247]]), stroke(accent, 3.5)])]
      : []),
    group('soles', [rect([116, 245], [30, 15], 7), rect([166, 245], [30, 15], 7), stroke(INK, 4), fill(shoe)]),
  ]),
  group('legs', [path([[122, 204], [120, 240]]), path([[160, 204], [163, 240]]), stroke(INK, 5)]),
];

const shadowLayer = (op, scale = [100, 100, 100]) =>
  layer('shadow', 0, [group('shadow', [ellipse([0, 0], [130, 18]), fill('#000000', 35)])], op, {
    p: [150, 254, 0],
    s: scale,
  });

/** Body layer: anchored at the feet so scale = squash/stretch. */
const bodyLayer = (shapes, op, ks = {}) =>
  layer('body', 0, shapes, op, { a: [...FEET, 0], p: ks.p ?? [...FEET, 0], s: ks.s, r: ks.r });

const bob = (op, depth = 4) => kf([[0, [...FEET, 0]], [op / 2, [FEET[0], FEET[1] - depth, 0]], [op, [...FEET, 0]]]);

// ---------- Moods ----------

function idle() {
  const op = 90;
  const smile = path([[-14, 0, [0, 0], [6, 10]], [14, 0, [-6, 10], [0, 0]]]);
  return animation('idle', op, [
    bodyLayer(
      [
        arm('arm-l', [84, 162], [-14, 34], kf([[0, 4], [op / 2, -3], [op, 4]])),
        arm('arm-r', [210, 160], [14, 34], kf([[0, -4], [op / 2, 3], [op, -4]])),
        group('mouth', [smile, stroke(INK, 4.5)], { p: [140, 172] }),
        blush(),
        eye('eye-l', [118, 140], { blink: blinkFrames(55) }),
        eye('eye-r', [162, 140], { blink: blinkFrames(55) }),
        specks(),
        ...cube(),
        ...legs(),
      ],
      op,
      { p: bob(op) },
    ),
    shadowLayer(op),
  ]);
}

function scanning() {
  const op = 60;
  const look = kf([[0, [-2, 3]], [op / 2, [5, 2]], [op, [-2, 3]]]);
  const magnifier = [
    group('glass', [ellipse([-20, -24], [38, 38]), stroke('#2563EB', 6), fill('#BFE3FF', 55)]),
    group('glare', [path([[-30, -30, [0, 0], [2, -6]], [-22, -36, [-6, 0], [0, 0]]]), stroke('#FFFFFF', 3.5)]),
    group('handle', [path([[10, 10], [-6, -10]]), stroke('#7C4A2D', 8)]),
  ];
  const mouth = path(
    [[-10, -2, [0, 0], [4, 12]], [10, -2, [-4, 12], [0, 0]], [0, -4, [6, 0], [-6, 0]]],
    true,
  );
  return animation('scanning', op, [
    bodyLayer(
      [
        arm('arm-r', [208, 162], [10, 10], kf([[0, -12], [op / 2, 10], [op, -12]]), magnifier),
        arm('arm-l', [84, 160], [-20, 26]),
        group('mouth', [mouth, stroke(INK, 4), fill('#7A2E3A')], { p: [140, 176] }),
        blush(),
        eye('eye-l', [118, 140], { pupil: look }),
        eye('eye-r', [162, 140], { pupil: look }),
        brows([[108, 118], [126, 115]], [[152, 115], [170, 118]]),
        specks(),
        ...cube(),
        ...legs(),
      ],
      op,
      { p: bob(op, 3) },
    ),
    shadowLayer(op),
  ]);
}

function happy() {
  const op = 40;
  const jumpY = kf([[0, [...FEET, 0]], [12, [FEET[0], FEET[1] - 34, 0]], [24, [...FEET, 0]], [op, [...FEET, 0]]]);
  const squash = kf([[0, [100, 100, 100]], [4, [96, 106, 100]], [24, [100, 100, 100]], [27, [108, 92, 100]], [33, [100, 100, 100]], [op, [100, 100, 100]]]);
  const bigSmile = path([[-20, -4, [0, 0], [0, 0]], [20, -4, [0, 0], [-2, 22]], [0, 16, [12, 0], [-12, 0]], [-20, -4, [2, 22], [0, 0]]], true);
  const wave = (a, b) => kf([[0, a], [10, b], [20, a], [30, b], [op, a]]);

  const star = (cx, cy, R, color, delay) => {
    const r = R * 0.35;
    const pts = [];
    for (let k = 0; k < 8; k++) {
      const ang = (Math.PI / 4) * k - Math.PI / 2;
      const rad = k % 2 === 0 ? R : r;
      pts.push([Math.cos(ang) * rad, Math.sin(ang) * rad]);
    }
    // Pops in and out once per loop, starting at `delay` (needs delay + 16 < op).
    const frames = [[delay, [0, 0]], [delay + 8, [110, 110]], [delay + 16, [0, 0]], [op, [0, 0]]];
    if (delay > 0) frames.unshift([0, [0, 0]]);
    return group('star', [path(pts, true), fill(color)], { p: [cx, cy], s: kf(frames) });
  };
  const confetti = (cx, cy, rot, color) =>
    group('confetti', [rect([0, 0], [10, 5], 1.5), fill(color)], { p: [cx, cy], r: kf([[0, rot], [op, rot + 180]]) });

  return animation('happy', op, [
    layer(
      'sparkles',
      0,
      [
        star(48, 70, 16, '#FCD34D', 0),
        star(246, 56, 13, '#FCD34D', 12),
        star(258, 150, 10, '#34D399', 22),
        star(40, 160, 9, '#34D399', 6),
        confetti(80, 40, 20, '#34D399'),
        confetti(220, 30, -30, '#22C55E'),
        confetti(30, 118, 60, '#10B981'),
        confetti(270, 105, 10, '#FCD34D'),
      ],
      op,
    ),
    bodyLayer(
      [
        arm('arm-l', [84, 150], [-24, -30], wave(-6, 14)),
        arm('arm-r', [210, 148], [24, -30], wave(6, -14)),
        group('mouth', [bigSmile, stroke(INK, 4), fill('#7A2E3A')], { p: [140, 172] }),
        group('tongue', [ellipse([140, 182], [16, 8]), fill('#F47C8C')]),
        blush(),
        happyEye('eye-l', [118, 142]),
        happyEye('eye-r', [162, 142]),
        specks(),
        ...cube(),
        ...legs('#FFFFFF', '#34D399'),
      ],
      op,
      { p: jumpY, s: squash },
    ),
    shadowLayer(op, kf([[0, [100, 100, 100]], [12, [65, 65, 100]], [24, [100, 100, 100]], [op, [100, 100, 100]]])),
  ]);
}

function okay() {
  const op = 72;
  const mouth = path([[-14, 0, [0, 0], [5, -5]], [0, 0, [-5, 5], [5, -5]], [14, 0, [-5, 5], [0, 0]]]);
  const shrugL = kf([[0, 0], [18, -18], [36, 0], [op, 0]]);
  const shrugR = kf([[0, 0], [18, 18], [36, 0], [op, 0]]);
  return animation('okay', op, [
    bodyLayer(
      [
        arm('arm-l', [84, 160], [-28, -4], shrugL),
        arm('arm-r', [210, 158], [28, -4], shrugR),
        group('mouth', [mouth, stroke(INK, 4.5)], { p: [140, 174] }),
        blush(),
        eye('eye-l', [118, 142], { pupil: [-3, 1], blink: blinkFrames(50) }),
        eye('eye-r', [162, 142], { pupil: [-3, 1], blink: blinkFrames(50) }),
        brows([[106, 120], [128, 120]], [[150, 116, [0, 0], [6, -5]], [172, 114, [-6, -2], [0, 0]]]),
        specks(),
        ...cube(),
        ...legs(),
      ],
      op,
      { r: kf([[0, -2.5], [op / 2, 2.5], [op, -2.5]]) },
    ),
    shadowLayer(op),
  ]);
}

function sad() {
  const op = 60;
  const sob = kf([[0, [100, 100, 100]], [8, [102, 97, 100]], [16, [100, 100, 100]], [24, [102, 97, 100]], [32, [100, 100, 100]], [op, [100, 100, 100]]]);
  const frown = (h) =>
    shape([[-16, 6, [0, 0], [0, 0]], [16, 6, [0, 0], [-4, -h]], [0, -8, [8, 0], [-8, 0]], [-16, 6, [4, -h], [0, 0]]], true);
  const mouth = pathAnim([[0, frown(10)], [8, frown(14)], [16, frown(10)], [24, frown(14)], [32, frown(10)], [op, frown(10)]]);
  const drop = (x, delay) =>
    group('drop', [ellipse([0, 0], [9, 12]), fill(TEAR)], {
      p: kf([[0, [x, 158]], [delay, [x, 158]], [delay + 22, [x + (x < 140 ? -6 : 6), 205]], [op, [x + (x < 140 ? -6 : 6), 205]]]),
      o: kf([[0, 0], [delay, 0], [delay + 2, 100], [delay + 18, 100], [delay + 22, 0], [op, 0]]),
    });
  const shake = (base) => kf([[0, base], [8, base + 4], [16, base], [24, base + 4], [32, base], [op, base]]);
  return animation('sad', op, [
    bodyLayer(
      [
        arm('arm-l', [84, 176], [26, -14], shake(0)),
        arm('arm-r', [206, 176], [-30, -14], shake(0)),
        drop(110, 4),
        drop(170, 20),
        group('tears', [path([[110, 154], [106, 196]]), path([[170, 154], [174, 196]]), stroke(TEAR, 8, 90)]),
        group('mouth', [mouth, stroke(INK, 4), fill('#7A2E3A')], { p: [140, 182] }),
        eye('eye-l', [118, 140], { pupil: [1, -4], size: [28, 32] }),
        eye('eye-r', [162, 140], { pupil: [-1, -4], size: [28, 32] }),
        brows([[104, 118], [126, 112]], [[154, 112], [176, 118]]),
        specks(),
        ...cube(),
        ...legs(),
      ],
      op,
      { s: sob, p: [FEET[0], FEET[1] + 2, 0] },
    ),
    shadowLayer(op),
  ]);
}

mkdirSync('assets/lottie', { recursive: true });
for (const [name, build] of Object.entries({ idle, scanning, happy, okay, sad })) {
  writeFileSync(`assets/lottie/${name}.json`, JSON.stringify(build()));
  console.log(`wrote assets/lottie/${name}.json`);
}
