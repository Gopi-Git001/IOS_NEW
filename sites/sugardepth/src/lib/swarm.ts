// Crystal swarm: glossy sugar cubes and crystal shards drawn on a plain 2D canvas (components/CrystalSwarm.astro).
// No libraries, no network requests, no storage. One module drives every band on a page:
//   [data-swarm="hero"]    the home hero: crystals circle the headline, scatter from the pointer, gather while it
//                          is held and pop apart on release;
//   [data-swarm="accent"]  page heads: the same crystals, far fewer, slower, pointer scatter only;
//   [data-tiles]           the alias tiles: a flip to "That's sugar." throws a short burst of crystals.
// Text always wins: crystals behind the copy are dimmed, in-focus ones are kept out of it, and burst crystals are
// never drawn over a tile's words. Everything stops while the tab is hidden or the band is off screen, and
// prefers-reduced-motion gets one still frame and no bursts.

type Rect = { x0: number; y0: number; x1: number; y1: number };
type Mode = 'hero' | 'accent';

const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const coarseMQ = matchMedia('(pointer: coarse)');
const hoverFineMQ = matchMedia('(hover: hover) and (pointer: fine)');

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
/** Small seeded generator, so the still frame and the sprites are the same on every load. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ---------- sprites: four cubes and four shards, each sharp and at two blur depths ---------- */
const S = 96; // drawn size of a crystal in its cell
const PAD = 16; // room for the blur
const CELL = S + PAD * 2;
const BLURS = [0, 2.2, 5.5];
const KINDS = 8; // 0-3 cubes, 4-7 shards
type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
function poly(g: Ctx, pts: Pt[]) {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
}
/** Tiny sugar grains inside a face. */
function grain(g: Ctx, rnd: () => number, pts: Pt[], n: number, alpha: number) {
  g.save();
  poly(g, pts);
  g.clip();
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const p of pts) {
    minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]);
    miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]);
  }
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(255,255,255,${(alpha * (0.4 + rnd() * 0.6)).toFixed(3)})`;
    const r = 0.6 + rnd() * 1.3;
    g.fillRect(lerp(minx, maxx, rnd()), lerp(miny, maxy, rnd()), r, r);
  }
  g.restore();
}
/** A sugar cube seen from a corner: three glassy faces, bright edges, one soft highlight. */
function drawCube(g: Ctx, rnd: () => number, variant: number) {
  const e = S * (0.36 + variant * 0.02), k = 0.866;
  const cx = S / 2 + PAD, cy = S / 2 + PAD + e * 0.05;
  const P = (x: number, y: number): Pt => [cx + x, cy + y];
  const top = [P(0, -e), P(k * e, -e / 2), P(0, 0), P(-k * e, -e / 2)];
  const left = [P(-k * e, -e / 2), P(0, 0), P(0, e), P(-k * e, e / 2)];
  const right = [P(0, 0), P(k * e, -e / 2), P(k * e, e / 2), P(0, e)];
  let gr = g.createLinearGradient(cx, cy - e / 2, cx + k * e, cy + e);
  gr.addColorStop(0, 'rgba(176,192,222,0.62)'); gr.addColorStop(0.6, 'rgba(120,138,178,0.42)'); gr.addColorStop(1, 'rgba(98,190,196,0.40)');
  poly(g, right); g.fillStyle = gr; g.fill();
  gr = g.createLinearGradient(cx - k * e, cy - e / 2, cx, cy + e);
  gr.addColorStop(0, 'rgba(236,241,252,0.80)'); gr.addColorStop(1, 'rgba(180,196,226,0.58)');
  poly(g, left); g.fillStyle = gr; g.fill();
  gr = g.createLinearGradient(cx - k * e, cy - e, cx + k * e, cy);
  gr.addColorStop(0, 'rgba(255,255,255,0.97)'); gr.addColorStop(1, 'rgba(222,230,246,0.88)');
  poly(g, top); g.fillStyle = gr; g.fill();
  grain(g, rnd, top, 70, 0.9); grain(g, rnd, left, 50, 0.55); grain(g, rnd, right, 40, 0.35);
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.6;
  poly(g, [P(0, -e), P(k * e, -e / 2), P(k * e, e / 2), P(0, e), P(-k * e, e / 2), P(-k * e, -e / 2)]); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(cx - k * e, cy - e / 2); g.lineTo(cx, cy); g.lineTo(cx + k * e, cy - e / 2); g.moveTo(cx, cy); g.lineTo(cx, cy + e); g.stroke();
  const sp = g.createRadialGradient(cx - e * 0.25, cy - e * 0.62, 0, cx - e * 0.25, cy - e * 0.62, e * 0.45);
  sp.addColorStop(0, 'rgba(255,255,255,0.95)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sp; poly(g, top); g.fill();
}
/** A long splinter of sugar glass: one outline, one lit side. A shard, never a cut gem. */
function drawShard(g: Ctx, rnd: () => number, variant: number) {
  const cx = S / 2 + PAD, cy = S / 2 + PAD;
  const L = S * (0.4 + rnd() * 0.06), W = S * (0.13 + variant * 0.03);
  const tipA: Pt = [cx, cy - L], tipB: Pt = [cx + (rnd() - 0.5) * 8, cy + L * (0.8 + rnd() * 0.15)];
  const r1: Pt = [cx + W, cy - L * 0.35], r2: Pt = [cx + W * (0.8 + rnd() * 0.3), cy + L * 0.45];
  const l1: Pt = [cx - W * (0.9 + rnd() * 0.2), cy - L * 0.28], l2: Pt = [cx - W * 0.85, cy + L * 0.5];
  const spine: Pt = [cx + W * 0.15, cy - L * 0.2], spine2: Pt = [cx + W * 0.05, cy + L * 0.4];
  const outline = [tipA, r1, r2, tipB, l2, l1];
  const gr = g.createLinearGradient(cx - W, cy, cx + W, cy);
  gr.addColorStop(0, 'rgba(240,245,255,0.82)'); gr.addColorStop(0.5, 'rgba(170,188,224,0.40)'); gr.addColorStop(1, 'rgba(120,200,206,0.42)');
  poly(g, outline); g.fillStyle = gr; g.fill();
  poly(g, [tipA, spine, spine2, tipB, l2, l1]); g.fillStyle = 'rgba(255,255,255,0.38)'; g.fill();
  grain(g, rnd, outline, 30, 0.5);
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.4;
  poly(g, outline); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(tipA[0], tipA[1]); g.lineTo(spine[0], spine[1]); g.lineTo(spine2[0], spine2[1]); g.lineTo(tipB[0], tipB[1]); g.stroke();
  const sp = g.createRadialGradient(cx - W * 0.2, cy - L * 0.45, 0, cx - W * 0.2, cy - L * 0.45, W * 1.2);
  sp.addColorStop(0, 'rgba(255,255,255,0.9)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sp; poly(g, outline); g.fill();
}

let sprites: HTMLCanvasElement[][] | null = null; // sprites[kind][blur level]
let glint: HTMLCanvasElement | null = null;
function buildSprites() {
  if (sprites) return;
  const rnd = seeded(11);
  const built: HTMLCanvasElement[][] = [];
  for (let k = 0; k < KINDS; k++) {
    const base = makeCanvas(CELL, CELL);
    const g = base.getContext('2d')!;
    if (k < 4) drawCube(g, rnd, k); else drawShard(g, rnd, k - 4);
    const set = [base];
    for (let b = 1; b < BLURS.length; b++) {
      const bc = makeCanvas(CELL, CELL);
      const bg = bc.getContext('2d')!;
      if (typeof bg.filter === 'string') {
        bg.filter = `blur(${BLURS[b]}px)`;
        bg.drawImage(base, 0, 0);
      } else {
        // No canvas filter (older Safari): fake the blur with a ring of faint copies.
        bg.globalAlpha = 0.2;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          bg.drawImage(base, Math.cos(a) * BLURS[b], Math.sin(a) * BLURS[b]);
        }
        bg.globalAlpha = 0.3;
        bg.drawImage(base, 0, 0);
      }
      set.push(bc);
    }
    built.push(set);
  }
  sprites = built;
  // A four-point glint.
  glint = makeCanvas(64, 64);
  const g = glint.getContext('2d')!;
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.15, 'rgba(255,255,255,0.6)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg;
  g.beginPath(); g.moveTo(32, 2); g.quadraticCurveTo(34, 30, 62, 32); g.quadraticCurveTo(34, 34, 32, 62); g.quadraticCurveTo(30, 34, 2, 32); g.quadraticCurveTo(30, 30, 32, 2); g.fill();
  g.beginPath(); g.arc(32, 32, 6, 0, Math.PI * 2); g.fill();
}

/* ---------- measuring the copy ---------- */
/** The box around the visible words (and buttons) inside `root`, relative to `origin`. Tight to the text lines. */
function copyBox(root: Element, origin: DOMRect, lines: Rect[]): Rect | null {
  const box: Rect = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const add = (r: DOMRect) => {
    if (r.width < 1 || r.height < 1) return;
    const l: Rect = { x0: r.left - origin.left, y0: r.top - origin.top, x1: r.right - origin.left, y1: r.bottom - origin.top };
    lines.push(l); // every line of text, for the mask
    box.x0 = Math.min(box.x0, l.x0); box.x1 = Math.max(box.x1, l.x1);
    box.y0 = Math.min(box.y0, l.y0); box.y1 = Math.max(box.y1, l.y1);
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue || !node.nodeValue.trim() || node.parentElement?.closest('.sr-only')) continue;
    range.selectNodeContents(node);
    for (const r of Array.from(range.getClientRects())) add(r);
  }
  root.querySelectorAll('.btn').forEach((b) => add(b.getBoundingClientRect()));
  return box.x0 < box.x1 ? box : null;
}
function boundsOf(el: Element, origin: DOMRect): Rect | null {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return null;
  return { x0: r.left - origin.left, y0: r.top - origin.top, x1: r.right - origin.left, y1: r.bottom - origin.top };
}

/* ---------- the swarm in one band ---------- */
interface Particle {
  kind: number; z: number; size: number; blur: number; alpha: number;
  theta: number; omega: number; ring: number; lane: number;
  bobA: number; bobF: number; bobP: number;
  rot: number; vrot: number; tumble: number; vtumble: number;
  falling: boolean; fallV: number; swayA: number; swayF: number; homeX: number;
  x: number; y: number; vx: number; vy: number;
  glintP: number; glintF: number;
}
const DIM = 0.12; // how much of a crystal is left where it crosses a line of copy
const CALM = 0.5; // a crystal inside the copy block, between the lines, is turned down this far
const NARROW = 760; // below this the copy fills the band's width (the phone layout in interactive.css)
const MAX_PIXELS = 2_600_000; // canvas backing-store budget

interface SwarmState { mode: Mode; count: number; running: boolean; level: number; dpr: number; frames: number; sample: () => number[] }
const states: SwarmState[] = [];

function createSwarm(band: HTMLElement, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const mode: Mode = band.dataset.swarm === 'accent' ? 'accent' : 'hero';
  const hero = mode === 'hero';
  const copyEl = band.querySelector('[data-swarm-copy]');
  const state: SwarmState = { mode, count: 0, running: false, level: 0, dpr: 1, frames: 0, sample: () => parts.flatMap((p) => [p.x, p.y, p.z]) };
  states.push(state);

  let W = 0, H = 0, DPR = 1, narrow = false;
  let box: Rect | null = null; // the copy: crystals behind it are dimmed
  let core: Rect | null = null; // in-focus crystals are kept out of this part of it
  let dims: Rect[] = []; // blocks that calm what is behind them
  // Every line of copy as two paths, one a little larger than the other. After the crystals are drawn both are
  // cut out of them (two fills a frame), so no crystal is ever brighter than DIM behind a word, wherever its
  // centre is, and the cut has a soft step instead of a hard edge.
  let maskIn: Path2D | null = null, maskOut: Path2D | null = null;
  const orbit = { cx: 0, cy: 0, rx0: 1, rx1: 1, ry0: 1, ry1: 1, n: 2 };
  let rnd = seeded(7);
  let parts: Particle[] = [];
  const out = { x: 0, y: 0 };

  function measure() {
    const hr = band.getBoundingClientRect();
    W = hr.width; H = hr.height;
    narrow = W < NARROW;
    const cap = state.level > 0 ? 1 : Math.min(window.devicePixelRatio || 1, narrow ? 1.75 : 2);
    DPR = Math.max(1, Math.min(cap, Math.sqrt(MAX_PIXELS / Math.max(1, W * H))));
    state.dpr = DPR;
    const cw = Math.round(W * DPR), ch = Math.round(H * DPR);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const lines: Rect[] = [];
    box = copyEl ? copyBox(copyEl, hr, lines) : null;
    dims = [];
    if (box) {
      box = { x0: box.x0 - 8, y0: box.y0 - 6, x1: box.x1 + 8, y1: box.y1 + 6 };
      dims.push(box);
      // On a phone the copy is as wide as the band. Leaving its outer edges out of the keep-clear box lets
      // crystals travel down the gutters, so they go all the way round the headline, not just above and below.
      const inset = narrow ? 22 : 0;
      core = { x0: box.x0 - 6 + inset, y0: box.y0 - 4, x1: box.x1 + 6 - inset, y1: box.y1 + 4 };
    } else core = null;
    band.querySelectorAll('[data-swarm-dim]').forEach((el) => { const r = boundsOf(el, hr); if (r) { dims.push(r); lines.push(r); } });
    drawMask(lines);

    // The path the crystals circle on: a rounded box around the copy (an ellipse when `n` is 2).
    const b = box ?? { x0: W * 0.3, y0: H * 0.3, x1: W * 0.7, y1: H * 0.7 };
    const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
    orbit.cy = (b.y0 + b.y1) / 2;
    const roomY = H / 2;
    if (narrow) {
      orbit.cx = W / 2; orbit.n = 8;
      orbit.rx0 = W / 2 - 17; orbit.rx1 = W / 2 + 3;
      orbit.ry0 = bh / 2 + 12; orbit.ry1 = Math.max(orbit.ry0 + 14, roomY + 2);
    } else {
      orbit.cx = (b.x0 + b.x1) / 2; orbit.n = 2.6;
      orbit.rx0 = bw / 2 + 36; orbit.rx1 = Math.max(orbit.rx0 * 1.9, Math.min(W * 0.46, orbit.rx0 * 2.5));
      orbit.ry0 = bh / 2 + 28; orbit.ry1 = Math.max(orbit.ry0 + 44, roomY + 26);
    }
  }

  function drawMask(lines: Rect[]) {
    maskIn = maskOut = null;
    if (!lines.length || typeof Path2D !== 'function') return;
    maskIn = new Path2D(); maskOut = new Path2D();
    const add = (path: Path2D, l: Rect, air: number) => {
      const x = l.x0 - air, y = l.y0 - air, w = l.x1 - l.x0 + air * 2, h = l.y1 - l.y0 + air * 2;
      if (typeof path.roundRect === 'function') path.roundRect(x, y, w, h, air + 2); else path.rect(x, y, w, h);
    };
    for (const l of lines) { add(maskIn, l, 5); add(maskOut, l, 11); }
  }

  function count() {
    const area = W * H;
    if (!hero) return clamp(Math.round(area / 13000), 14, 44);
    if (narrow || coarseMQ.matches) return clamp(Math.round(area / 1400), 110, 180);
    return clamp(Math.round(area / 2400), 180, 380);
  }
  function target(p: Particle, time: number) {
    const c = Math.cos(p.theta), s = Math.sin(p.theta);
    const rx = lerp(orbit.rx0, orbit.rx1, p.lane), ry = lerp(orbit.ry0, orbit.ry1, p.ring);
    const rho = Math.pow(Math.pow(Math.abs(c) / rx, orbit.n) + Math.pow(Math.abs(s) / ry, orbit.n), -1 / orbit.n);
    out.x = orbit.cx + c * rho;
    out.y = orbit.cy + s * rho + Math.sin(time * p.bobF + p.bobP) * p.bobA;
  }
  function makeParticle(): Particle {
    const z = Math.pow(rnd(), 0.75); // depth: more far than near
    const falling = rnd() < (hero ? (narrow ? 0.2 : 0.28) : 0.45);
    const maxSize = hero ? (narrow ? 40 : 50) : narrow ? 30 : 38;
    const pace = hero ? 1 : 0.7;
    const ring = clamp(Math.pow(rnd(), 1.4) + (1 - z) * 0.12, 0, 1.1);
    const p: Particle = {
      kind: (rnd() < 0.55 ? 0 : 4) + ((rnd() * 4) | 0),
      z,
      size: lerp(9, maxSize, z * z * 0.85 + z * 0.15) * (0.8 + rnd() * 0.4),
      blur: z > 0.9 ? 2 : z > 0.8 ? 1 : z < 0.18 ? 2 : z < 0.36 ? 1 : 0,
      alpha: (z > 0.86 ? 0.7 : lerp(0.4, 1, clamp(z / 0.6, 0, 1))) * (hero ? 1 : 0.85),
      theta: rnd() * Math.PI * 2,
      omega: (0.1 + rnd() * 0.16) * (0.6 + z * 0.9) * (rnd() < 0.86 ? 1 : -1) * pace * (narrow ? 1.25 : 1),
      ring,
      // On a phone the side lanes are the two gutters: bigger crystals ride further out, half off the edge.
      lane: narrow ? clamp(0.1 + 0.7 * z + rnd() * 0.3, 0, 1) : ring,
      bobA: (narrow ? 3 : 6) + rnd() * (narrow ? 9 : 22), bobF: 0.4 + rnd() * 0.9, bobP: rnd() * 6.28,
      rot: rnd() * 6.28, vrot: (rnd() - 0.5) * 1.6,
      tumble: rnd() * 6.28, vtumble: (0.4 + rnd() * 1.4) * (rnd() < 0.5 ? -1 : 1),
      falling,
      fallV: lerp(14, 60, z) * (0.7 + rnd() * 0.6) * pace,
      swayA: 10 + rnd() * 30, swayF: 0.3 + rnd() * 0.6,
      homeX: rnd(), x: 0, y: 0, vx: 0, vy: 0,
      glintP: rnd() * 6.28, glintF: 0.25 + rnd() * 0.5,
    };
    if (falling) { p.x = p.homeX * W; p.y = rnd() * H; }
    else { target(p, 0); p.x = out.x; p.y = out.y; }
    return p;
  }
  function populate() {
    rnd = seeded(7);
    parts = [];
    let n = count();
    if (state.level >= 2) n = Math.round(n * 0.66);
    if (state.level >= 3) n = Math.round(n * 0.6);
    for (let i = 0; i < n; i++) parts.push(makeParticle());
    parts.sort((a, b) => a.z - b.z);
    state.count = parts.length;
  }

  /* ---------- pointer ---------- */
  const ptr = { x: -9999, y: -9999, active: false, down: false, downAt: 0, gather: false, px: 0, py: 0 };
  const toBand = (e: PointerEvent) => { const r = band.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; };
  function burstAt(x: number, y: number, power: number) {
    const R = 260;
    for (const p of parts) {
      const dx = p.x - x, dy = p.y - y, d2 = dx * dx + dy * dy;
      if (d2 >= R * R) continue;
      const d = Math.sqrt(d2) + 0.001, f = (1 - d / R) * 900 * power * (0.5 + p.z);
      p.vx += (dx / d) * f; p.vy += (dy / d) * f;
      p.vrot += (rnd() - 0.5) * 6; p.vtumble += (rnd() - 0.5) * 6;
    }
  }
  function listen() {
    band.addEventListener('pointermove', (e) => {
      if (!hero && e.pointerType !== 'mouse') return;
      toBand(e); ptr.active = true;
      ptr.px = ptr.x / W - 0.5; ptr.py = ptr.y / H - 0.5;
    }, { passive: true });
    band.addEventListener('pointerleave', () => { ptr.active = false; ptr.down = false; ptr.gather = false; }, { passive: true });
    if (!hero) return;
    band.addEventListener('pointerdown', (e) => {
      // Links, buttons and the slab's switch keep their own job.
      if ((e.target as Element).closest?.('a,button,input,label,summary,textarea,select')) return;
      toBand(e); ptr.active = true; ptr.down = true; ptr.downAt = performance.now();
    }, { passive: true });
    band.addEventListener('pointerup', (e) => {
      if (!ptr.down) return;
      const held = performance.now() - ptr.downAt;
      ptr.down = false;
      if (ptr.gather) burstAt(ptr.x, ptr.y, 0.55); // let go of a gathered clump: it pops
      else if (held < 260) burstAt(ptr.x, ptr.y, 1); // a tap or click scatters
      ptr.gather = false;
      if (e.pointerType !== 'mouse') ptr.active = false;
    }, { passive: true });
    band.addEventListener('pointercancel', () => { ptr.down = false; ptr.gather = false; ptr.active = false; }, { passive: true });
  }

  /* ---------- simulation ---------- */
  let time = 0;
  function step(dt: number) {
    time += dt;
    if (ptr.down && !ptr.gather && performance.now() - ptr.downAt > 260) ptr.gather = true;
    const damp = Math.pow(0.06, dt);
    const repel = hero ? 7000 : 3200;
    for (const p of parts) {
      let ax = 0, ay = 0;
      p.theta += p.omega * dt;
      if (p.falling) {
        // Drift down with a sway; wrap to the top.
        const tx = p.homeX * W + Math.sin(time * p.swayF + p.bobP) * p.swayA;
        ax += (tx - p.x) * 1.2;
        ay += (p.fallV - p.vy) * 1.5;
        if (p.y > H + 60) { p.y = -60; p.homeX = rnd(); p.x = p.homeX * W; p.vy = p.fallV; p.vx = 0; }
        if (p.y < -120) p.y = H + 50;
      } else {
        target(p, time);
        ax += (out.x - p.x) * 2.4; ay += (out.y - p.y) * 2.4;
      }
      // Keep in-focus crystals out of the copy, so it stays readable.
      if (core && p.z > 0.32 && p.x > core.x0 && p.x < core.x1 && p.y > core.y0 && p.y < core.y1) {
        const dl = p.x - core.x0, dr = core.x1 - p.x, dtp = p.y - core.y0, db = core.y1 - p.y;
        const m = Math.min(dl, dr, dtp, db), push = 900 + 1400 * p.z;
        if (m === dl) ax -= push; else if (m === dr) ax += push; else if (m === dtp) ay -= push; else ay += push;
      }
      if (ptr.active) {
        const dx = p.x - ptr.x, dy = p.y - ptr.y, d2 = dx * dx + dy * dy;
        if (ptr.gather) {
          const d = Math.sqrt(d2) + 1;
          const pull = Math.min(2600, 380000 / (d + 60)) * (0.4 + p.z);
          ax -= (dx / d) * pull * 0.9; ay -= (dy / d) * pull * 0.9;
          ax += (-dy / d) * pull * 0.55; ay += (dx / d) * pull * 0.55; // swirl round the pointer
          if (d < 34) { ax += (dx / d) * 1800; ay += (dy / d) * 1800; }
        } else {
          const R = 120 + 90 * p.z;
          if (d2 < R * R) {
            const d1 = Math.sqrt(d2) + 0.001;
            let f = 1 - d1 / R;
            f = f * f * repel * (0.45 + p.z);
            ax += (dx / d1) * f; ay += (dy / d1) * f;
            p.vrot += (dx > 0 ? 1 : -1) * f * 0.0006;
          }
        }
      }
      p.vx = (p.vx + ax * dt) * damp; p.vy = (p.vy + ay * dt) * damp;
      p.x += p.vx * dt; p.y += p.vy * dt;
      // Spin settles back toward its resting speed.
      p.vrot += ((p.vrot > 0 ? 0.5 : -0.5) - p.vrot) * 0.6 * dt;
      p.vtumble += ((p.vtumble > 0 ? 0.9 : -0.9) - p.vtumble) * 0.5 * dt;
      p.rot += p.vrot * dt; p.tumble += p.vtumble * dt;
    }
  }

  /** 1 in the open, down to CALM as the crystal slides in among the copy. (The mask does the rest.) */
  function dimAt(x: number, y: number, rad: number) {
    let f = 1;
    for (const r of dims) {
      const pen = Math.min(x - (r.x0 - rad), r.x1 + rad - x, y - (r.y0 - rad), r.y1 + rad - y);
      if (pen <= 0) continue;
      f = Math.min(f, 1 - (1 - CALM) * Math.min(1, pen / (rad + 8)));
    }
    return f;
  }
  const glints: number[] = [];
  function render() {
    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    const still = reduceMQ.matches;
    const parX = still ? 0 : ptr.px * -26, parY = still ? 0 : ptr.py * -18;
    const showGlints = state.level < 3;
    glints.length = 0;
    for (const p of parts) {
      const x = p.x + parX * (p.z - 0.4), y = p.y + parY * (p.z - 0.4);
      if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue;
      const s = p.size / S;
      const flip = Math.cos(p.tumble); // a fake 3D tumble round one axis
      const sx = s * (0.3 + 0.7 * Math.abs(flip));
      const c = Math.cos(p.rot), sn = Math.sin(p.rot);
      const a = p.alpha * dimAt(x, y, p.size * 0.5);
      ctx!.globalAlpha = a * (0.82 + 0.18 * flip * flip); // the highlight sweeps as a face turns to the light
      ctx!.setTransform(DPR * c * sx, DPR * sn * sx, -DPR * sn * s, DPR * c * s, DPR * x, DPR * y);
      ctx!.drawImage(sprites![p.kind][p.blur], -CELL / 2, -CELL / 2);
      if (showGlints && p.blur === 0 && p.z > 0.45) {
        const gl = Math.sin(time * p.glintF * 6.28 + p.glintP) * Math.abs(flip);
        if (gl > 0.93) glints.push(x, y - p.size * 0.28, ((gl - 0.93) / 0.07) * a, p.size);
      }
    }
    if (glints.length) {
      ctx!.globalCompositeOperation = 'lighter';
      for (let j = 0; j < glints.length; j += 4) {
        const gs = glints[j + 3] * 0.9;
        ctx!.globalAlpha = glints[j + 2];
        ctx!.setTransform(DPR, 0, 0, DPR, DPR * glints[j], DPR * glints[j + 1]);
        ctx!.drawImage(glint!, -gs / 2, -gs / 2, gs, gs);
      }
      ctx!.globalCompositeOperation = 'source-over';
    }
    if (maskIn && maskOut) {
      // Cut the copy out of everything drawn so far: half at the outer step, down to DIM at the inner one.
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx!.globalCompositeOperation = 'destination-out';
      ctx!.fillStyle = '#000';
      ctx!.globalAlpha = 0.5; ctx!.fill(maskOut, 'nonzero');
      ctx!.globalAlpha = 1 - DIM / 0.5; ctx!.fill(maskIn, 'nonzero');
      ctx!.globalCompositeOperation = 'source-over';
    }
    ctx!.globalAlpha = 1;
  }

  /* ---------- loop, quality, lifecycle ---------- */
  let visible = true, last = 0, startedAt = 0, raf = 0;
  let slow = 0, frames = 0, lastF = 0, windowAt = 0;
  /** A device that can't hold about 45 frames a second gets a coarser canvas, then fewer crystals. */
  function adapt(now: number) {
    const f = now - (lastF || now);
    lastF = now;
    if (now - startedAt < 600) return; // page-load hiccups don't count
    if (!windowAt) windowAt = now;
    if (f > 0 && f < 200) { frames++; if (f > 22) slow++; }
    // Judge every 90 frames, or every second and a half on a device too slow to get that far.
    if (frames < 90 && (now - windowAt < 1500 || frames < 12)) return;
    // A third of the frames late is about 45 a second on a 60 Hz screen.
    if (slow * 3 > frames && state.level < 3) {
      state.level++;
      if (state.level === 1 && DPR <= 1) state.level = 2; // nothing to gain from the canvas: go straight to fewer
      if (state.level === 1) { DPR = 1; state.dpr = 1; canvas.width = Math.round(W); canvas.height = Math.round(H); }
      else if (state.level === 2) parts = parts.filter((_, i) => i % 3 !== 0);
      else parts = parts.filter((_, i) => i % 5 < 3);
      state.count = parts.length;
    }
    frames = 0; slow = 0; windowAt = now;
  }
  function frame(now: number) {
    if (!state.running) return;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    adapt(now);
    step(dt);
    render();
    state.frames++;
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (state.running || reduceMQ.matches || !visible || document.hidden || W < 1 || H < 1) return;
    state.running = true;
    last = startedAt = performance.now(); lastF = 0; frames = 0; slow = 0; windowAt = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    state.running = false;
    cancelAnimationFrame(raf);
  }
  /** Reduced motion: let the scene settle once, then draw one frame and leave it. */
  function renderStill() {
    ptr.active = false; ptr.px = 0; ptr.py = 0;
    for (let i = 0; i < 90; i++) step(1 / 30);
    render();
  }
  function relayout(first: boolean) {
    const oldW = W, oldH = H;
    measure();
    if (W < 1 || H < 1) return;
    if (first || !parts.length || Math.abs(oldW - W) > 80) populate(); // a real layout change: reseed
    else if (oldH > 0 && oldH !== H) for (const p of parts) if (p.falling) p.y *= H / oldH;
    if (reduceMQ.matches) renderStill();
    else if (state.running) render(); // the canvas was just resized: don't leave it blank until the next frame
    else start();
  }

  relayout(true);
  listen();
  let timer = 0;
  const later = () => { clearTimeout(timer); timer = window.setTimeout(() => relayout(false), 120); };
  window.addEventListener('resize', later, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(later).observe(band);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) start(); else stop();
    }).observe(band);
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reduceMQ.addEventListener?.('change', () => { if (reduceMQ.matches) { stop(); renderStill(); } else start(); });
  document.fonts?.ready.then(() => relayout(false)); // the copy's box moves once the fonts are in
}

/* ---------- alias tiles: flip to "That's sugar." with a burst of crystals ---------- */
interface Bit {
  x: number; y: number; vx: number; vy: number; rot: number; vrot: number; tumble: number; vt: number;
  size: number; kind: number; life: number; max: number; own: number;
}
const FX_MARGIN = 140; // how far the burst canvas reaches past the tile grid (see .tiles-fx in swarm.css)
// For QA: the crystals drawn in the last burst frame as x, y, radius (burst-canvas px), and a frame counter.
const burstDebug = { drawn: [] as number[], frames: 0 };

function initTiles(stage: HTMLElement) {
  const list = stage.querySelector<HTMLElement>('.tiles');
  const fxCanvas = stage.querySelector<HTMLCanvasElement>('[data-tiles-fx]');
  const status = document.querySelector<HTMLElement>('[data-tiles-status]');
  if (!list) return;
  const tiles = Array.from(list.querySelectorAll<HTMLButtonElement>('.tile'));
  const band = stage.closest<HTMLElement>('.swarm-band') ?? stage;
  const fx = fxCanvas?.getContext('2d') ?? null;
  const rnd = seeded(23);
  let bits: Bit[] = [];
  let fxRunning = false, fxLast = 0, fxD = 1, fxW = 0, fxH = 0;
  let tileRects: Rect[] = []; // each tile, in burst-canvas coordinates
  let textRects: Rect[] = []; // every word on a tile (both faces) and the copy beside the tiles

  /** Where the words are. Layout offsets, not screen boxes, so a face that is mid-turn measures the same. */
  function measureBurst() {
    if (!fxCanvas) return;
    const sr = stage.getBoundingClientRect();
    const ox = sr.left - FX_MARGIN, oy = sr.top - FX_MARGIN;
    fxW = sr.width + FX_MARGIN * 2; fxH = sr.height + FX_MARGIN * 2;
    fxD = Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2_000_000 / (fxW * fxH))));
    const w = Math.round(fxW * fxD), h = Math.round(fxH * fxD);
    if (fxCanvas.width !== w || fxCanvas.height !== h) { fxCanvas.width = w; fxCanvas.height = h; }
    tileRects = []; textRects = [];
    for (const tile of tiles) {
      const tr = tile.getBoundingClientRect();
      const t: Rect = { x0: tr.left - ox, y0: tr.top - oy, x1: tr.right - ox, y1: tr.bottom - oy };
      tileRects.push(t);
      tile.querySelectorAll<HTMLElement>('.tile-alias, .tile-tag, .tile-reveal').forEach((el) => {
        const face = el.closest<HTMLElement>('.tile-face');
        const fl = face ? face.offsetLeft : 0, ft = face ? face.offsetTop : 0;
        textRects.push({ x0: t.x0 + fl + el.offsetLeft, y0: t.y0 + ft + el.offsetTop, x1: t.x0 + fl + el.offsetLeft + el.offsetWidth, y1: t.y0 + ft + el.offsetTop + el.offsetHeight });
      });
    }
    band.querySelectorAll('[data-burst-clear]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) textRects.push({ x0: r.left - ox, y0: r.top - oy, x1: r.right - ox, y1: r.bottom - oy });
    });
  }
  /** 0 while a crystal would touch the rect, back to 1 once it is `fade` px clear of it. */
  function clearOf(r: Rect, x: number, y: number, rad: number, fade: number) {
    const dx = Math.max(r.x0 - x, 0, x - r.x1), dy = Math.max(r.y0 - y, 0, y - r.y1);
    const gap = Math.sqrt(dx * dx + dy * dy) - rad;
    return gap <= 0 ? 0 : Math.min(1, gap / fade);
  }
  function tileBurst(index: number) {
    if (!fx || !fxCanvas || reduceMQ.matches) return;
    buildSprites();
    measureBurst();
    const t = tileRects[index];
    const cx = (t.x0 + t.x1) / 2, cy = (t.y0 + t.y1) / 2, hw = (t.x1 - t.x0) / 2, hh = (t.y1 - t.y0) / 2;
    const n = coarseMQ.matches ? 30 : 36; // a few more than look necessary: the ones behind a label are hidden
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, sp = 200 + rnd() * 420;
      const c = Math.cos(a), s = Math.sin(a);
      // Start on the tile's edge, so each crystal comes out from behind the tile that turned.
      const k = Math.min(hw / (Math.abs(c) + 1e-6), hh / (Math.abs(s) + 1e-6));
      bits.push({
        x: cx + c * k, y: cy + s * k, vx: c * sp, vy: s * sp - 220,
        rot: rnd() * 6.28, vrot: (rnd() - 0.5) * 10, tumble: rnd() * 6.28, vt: (rnd() - 0.5) * 10,
        size: 10 + rnd() * 22, kind: (rnd() * KINDS) | 0, life: 0, max: 0.9 + rnd() * 0.6, own: index,
      });
    }
    if (bits.length > 240) bits.splice(0, bits.length - 240);
    if (!fxRunning) { fxRunning = true; fxLast = performance.now(); requestAnimationFrame(fxFrame); }
  }
  function fxFrame(now: number) {
    const dt = Math.min((now - fxLast) / 1000, 1 / 30);
    fxLast = now;
    fx!.setTransform(1, 0, 0, 1, 0, 0);
    fx!.clearRect(0, 0, fxCanvas!.width, fxCanvas!.height);
    burstDebug.drawn.length = 0;
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.life += dt;
      if (b.life > b.max) { bits.splice(i, 1); continue; }
      b.vy += 900 * dt; b.vx *= Math.pow(0.4, dt);
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vrot * dt; b.tumble += b.vt * dt;
      const t = b.life / b.max;
      let a = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      const rad = b.size * 0.5 + 3; // the sprite's reach, and a little more
      // Never over words: a crystal passes behind its own tile and behind every label, and fades out near the
      // edge of the canvas.
      a *= clearOf(tileRects[b.own], b.x, b.y, rad, 12);
      for (let j = 0; j < textRects.length && a > 0; j++) a *= clearOf(textRects[j], b.x, b.y, rad, 12);
      a *= clamp(Math.min(b.x, fxW - b.x, b.y, fxH - b.y) / 36, 0, 1);
      if (a <= 0) continue;
      burstDebug.drawn.push(b.x, b.y, rad);
      const s = b.size / S, sx = s * (0.3 + 0.7 * Math.abs(Math.cos(b.tumble)));
      const c = Math.cos(b.rot), sn = Math.sin(b.rot);
      fx!.globalAlpha = a;
      fx!.setTransform(fxD * c * sx, fxD * sn * sx, -fxD * sn * s, fxD * c * s, fxD * b.x, fxD * b.y);
      fx!.drawImage(sprites![b.kind][0], -CELL / 2, -CELL / 2);
    }
    fx!.globalAlpha = 1;
    burstDebug.frames++;
    if (bits.length) requestAnimationFrame(fxFrame);
    else { fxRunning = false; fx!.setTransform(1, 0, 0, 1, 0, 0); fx!.clearRect(0, 0, fxCanvas!.width, fxCanvas!.height); }
  }

  list.setAttribute('data-ready', '');
  tiles.forEach((tile, index) => {
    const back = tile.querySelector('.tile-back');
    const alias = tile.querySelector('.tile-alias')?.textContent ?? '';
    const reveal = tile.querySelector('.tile-reveal')?.textContent ?? '';
    // The button's name stays the alias; the answer is announced when the tile turns.
    back?.setAttribute('aria-hidden', 'true');
    let byHover = false;
    const set = (on: boolean) => {
      if ((tile.getAttribute('aria-pressed') === 'true') === on) return;
      tile.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (status) status.textContent = on ? `${alias}. ${reveal}` : '';
      if (on) tileBurst(index);
    };
    // A resting mouse turns the tile and leaving turns it back...
    tile.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !hoverFineMQ.matches || tile.getAttribute('aria-pressed') === 'true') return;
      byHover = true;
      set(true);
    });
    tile.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse' || !byHover) return;
      byHover = false;
      set(false);
    });
    // ...and a click, a tap, Enter or Space always toggles it, so a click on a turned tile turns it back.
    tile.addEventListener('click', () => {
      byHover = false;
      set(tile.getAttribute('aria-pressed') !== 'true');
    });
  });
}

/* ---------- boot ---------- */
function boot() {
  const bands = Array.from(document.querySelectorAll<HTMLElement>('[data-swarm]'));
  for (const band of bands) {
    const canvas = band.querySelector<HTMLCanvasElement>('[data-swarm-canvas]');
    if (!canvas) continue;
    buildSprites();
    createSwarm(band, canvas);
  }
  document.querySelectorAll<HTMLElement>('[data-tiles]').forEach(initTiles);
  // A read-only handle for QA: how many crystals, whether the loop is running, the quality level.
  (window as unknown as { __sdSwarm: unknown }).__sdSwarm = { bands: states, burst: burstDebug };
}
boot();
