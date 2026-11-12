// The crystal swarm's art for phones, drawn with React Native Skia: a port of the sprites in CrystalSwarm.web.tsx
// (same shapes, gradients, sugar grain and blur levels) and of its per-frame paint. CrystalSwarmSkia.tsx shows it.
// No React or React Native here, so it can also be rendered headlessly with CanvasKit to check the look.
import { BlendMode, ClipOp, PaintStyle, Skia, StrokeJoin, TileMode, vec, type SkCanvas, type SkImage, type SkPicture } from '@shopify/react-native-skia';
import { KINDS, lerp, seeded, type Swarm } from '../lib/swarm';
import { CELL, SPRITE, SPRITE_PAD, swarmFrame } from '../lib/swarmFrame';

const BLURS = [0, 2.2, 5.5]; // same depth blur as the web

// ---------- sprites ----------

type Stops = [number, string][];
type Point = [number, number];

/** Clear sugar glass with a cool edge, for the dark sign-in backdrop (the web's GLASS palette). */
const GLASS = {
  right: [[0, 'rgba(176,192,222,0.62)'], [0.6, 'rgba(120,138,178,0.42)'], [1, 'rgba(98,190,196,0.40)']] as Stops,
  left: [[0, 'rgba(236,241,252,0.80)'], [1, 'rgba(180,196,226,0.58)']] as Stops,
  top: [[0, 'rgba(255,255,255,0.97)'], [1, 'rgba(222,230,246,0.88)']] as Stops,
  shard: [[0, 'rgba(240,245,255,0.82)'], [0.5, 'rgba(170,188,224,0.40)'], [1, 'rgba(120,200,206,0.42)']] as Stops,
  facet: 'rgba(255,255,255,0.38)',
  edge: 'rgba(255,255,255,0.85)',
  seam: 'rgba(255,255,255,0.65)',
};

function poly(pts: Point[], close = true) {
  return Skia.PathBuilder.Make()
    .addPoly(pts.map(([x, y]) => vec(x, y)), close)
    .build();
}

function paint() {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  return p;
}

function fillGradient(g: SkCanvas, pts: Point[], x0: number, y0: number, x1: number, y1: number, stops: Stops) {
  const p = paint();
  p.setShader(Skia.Shader.MakeLinearGradient(vec(x0, y0), vec(x1, y1), stops.map((s) => Skia.Color(s[1])), stops.map((s) => s[0]), TileMode.Clamp));
  g.drawPath(poly(pts), p);
}

function fillColor(g: SkCanvas, pts: Point[], color: string) {
  const p = paint();
  p.setColor(Skia.Color(color));
  g.drawPath(poly(pts), p);
}

function stroke(g: SkCanvas, pts: Point[], color: string, width: number, close = true) {
  const p = paint();
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeJoin(StrokeJoin.Round);
  p.setStrokeWidth(width);
  p.setColor(Skia.Color(color));
  g.drawPath(poly(pts, close), p);
}

/** Tiny sugar grains sprinkled inside a face. Uses the random numbers in the same order as the web. */
function grain(g: SkCanvas, pts: Point[], n: number, alpha: number, rnd: () => number) {
  g.save();
  g.clipPath(poly(pts), ClipOp.Intersect, true);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const p = Skia.Paint();
  for (let i = 0; i < n; i++) {
    p.setColor(Skia.Color(`rgba(255,255,255,${(alpha * (0.4 + rnd() * 0.6)).toFixed(3)})`));
    const r = 0.6 + rnd() * 1.3;
    const x = lerp(minX, maxX, rnd());
    const y = lerp(minY, maxY, rnd());
    g.drawRect(Skia.XYWHRect(x, y, r, r), p);
  }
  g.restore();
}

/** A soft white hot spot, painted inside a face. */
function spot(g: SkCanvas, pts: Point[], x: number, y: number, radius: number, alpha: number) {
  const p = paint();
  p.setShader(Skia.Shader.MakeRadialGradient(vec(x, y), radius, [Skia.Color(`rgba(255,255,255,${alpha})`), Skia.Color('rgba(255,255,255,0)')], [0, 1], TileMode.Clamp));
  g.drawPath(poly(pts), p);
}

/** A sugar cube seen from a corner: three glossy faces, bright edges and a hot spot on top. */
function drawCube(g: SkCanvas, variant: number, rnd: () => number) {
  const e = SPRITE * (0.36 + variant * 0.02);
  const k = 0.866;
  const cx = SPRITE / 2 + SPRITE_PAD;
  const cy = SPRITE / 2 + SPRITE_PAD + e * 0.05;
  const P = (x: number, y: number): Point => [cx + x, cy + y];
  const top = [P(0, -e), P(k * e, -e / 2), P(0, 0), P(-k * e, -e / 2)];
  const left = [P(-k * e, -e / 2), P(0, 0), P(0, e), P(-k * e, e / 2)];
  const right = [P(0, 0), P(k * e, -e / 2), P(k * e, e / 2), P(0, e)];
  const outline = [P(0, -e), P(k * e, -e / 2), P(k * e, e / 2), P(0, e), P(-k * e, e / 2), P(-k * e, -e / 2)];
  fillGradient(g, right, cx, cy - e / 2, cx + k * e, cy + e, GLASS.right);
  fillGradient(g, left, cx - k * e, cy - e / 2, cx, cy + e, GLASS.left);
  fillGradient(g, top, cx - k * e, cy - e, cx + k * e, cy, GLASS.top);
  grain(g, top, 70, 0.9, rnd);
  grain(g, left, 50, 0.55, rnd);
  grain(g, right, 40, 0.35, rnd);
  stroke(g, outline, GLASS.edge, 1.6);
  stroke(g, [P(-k * e, -e / 2), P(0, 0), P(k * e, -e / 2)], GLASS.seam, 1.1, false);
  stroke(g, [P(0, 0), P(0, e)], GLASS.seam, 1.1, false);
  spot(g, top, cx - e * 0.25, cy - e * 0.62, e * 0.45, 0.95);
}

/** A long splinter of sugar glass with one lit side. */
function drawShard(g: SkCanvas, variant: number, rnd: () => number) {
  const cx = SPRITE / 2 + SPRITE_PAD;
  const cy = SPRITE / 2 + SPRITE_PAD;
  const L = SPRITE * (0.4 + rnd() * 0.06);
  const W = SPRITE * (0.13 + variant * 0.03);
  const tipA: Point = [cx, cy - L];
  const tipB: Point = [cx + (rnd() - 0.5) * 8, cy + L * (0.8 + rnd() * 0.15)];
  const r1: Point = [cx + W, cy - L * 0.35];
  const r2: Point = [cx + W * (0.8 + rnd() * 0.3), cy + L * 0.45];
  const l1: Point = [cx - W * (0.9 + rnd() * 0.2), cy - L * 0.28];
  const l2: Point = [cx - W * 0.85, cy + L * 0.5];
  const spine: Point = [cx + W * 0.15, cy - L * 0.2];
  const spine2: Point = [cx + W * 0.05, cy + L * 0.4];
  const body = [tipA, r1, r2, tipB, l2, l1];
  fillGradient(g, body, cx - W, cy, cx + W, cy, GLASS.shard);
  fillColor(g, [tipA, spine, spine2, tipB, l2, l1], GLASS.facet);
  grain(g, body, 30, 0.5, rnd);
  stroke(g, body, GLASS.edge, 1.4);
  stroke(g, [tipA, spine, spine2, tipB], GLASS.edge, 1.2, false);
  spot(g, body, cx - W * 0.2, cy - L * 0.45, W * 1.2, 0.9);
}

function draw(size: number, paintInto: (g: SkCanvas) => void): SkImage | null {
  const surface = Skia.Surface.Make(size, size);
  if (!surface) return null;
  paintInto(surface.getCanvas());
  surface.flush();
  return surface.makeImageSnapshot();
}

/** Every kind drawn once, plus pre-blurred copies for depth, so a frame is only cheap image draws. */
function buildSprites(): SkImage[][] | null {
  const rnd = seeded(7);
  const sprites: SkImage[][] = [];
  for (let kind = 0; kind < KINDS; kind++) {
    const base = draw(CELL, (g) => (kind < 4 ? drawCube(g, kind, rnd) : drawShard(g, kind - 4, rnd)));
    if (!base) return null;
    const set = [base];
    for (const radius of BLURS.slice(1)) {
      const soft = draw(CELL, (g) => {
        const p = Skia.Paint();
        p.setImageFilter(Skia.ImageFilter.MakeBlur(radius, radius, TileMode.Decal, null));
        g.drawImage(base, 0, 0, p);
      });
      if (!soft) return null;
      set.push(soft);
    }
    sprites.push(set);
  }
  return sprites;
}

/** A four-point sparkle. */
function buildGlint() {
  return draw(64, (g) => {
    const p = paint();
    p.setShader(
      Skia.Shader.MakeRadialGradient(vec(32, 32), 30, ['rgba(255,255,255,1)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0)'].map((c) => Skia.Color(c)), [0, 0.15, 1], TileMode.Clamp),
    );
    const star = Skia.PathBuilder.Make().moveTo(32, 2).quadTo(34, 30, 62, 32).quadTo(34, 34, 32, 62).quadTo(30, 34, 2, 32).quadTo(30, 30, 32, 2).close().build();
    g.drawPath(star, p);
    g.drawCircle(32, 32, 6, p);
  });
}

// Built on first use, never at startup.
let art: { sprites: SkImage[][]; glint: SkImage } | null | undefined;
function crystalArt() {
  if (art === undefined) {
    const sprites = buildSprites();
    const glint = buildGlint();
    art = sprites && glint ? { sprites, glint } : null;
  }
  return art;
}

/** One frame of the swarm as a Skia picture; null if the sprites couldn't be drawn. */
export function paintSwarm(swarm: Swarm): SkPicture | null {
  const a = crystalArt();
  if (!a) return null;
  const { crystals, glints } = swarmFrame(swarm);
  const recorder = Skia.PictureRecorder();
  const g = recorder.beginRecording(Skia.XYWHRect(0, 0, swarm.view.width, swarm.view.height));
  const p = Skia.Paint();
  for (const c of crystals) {
    g.save();
    g.translate(c.x, c.y);
    g.rotate(c.degrees, 0, 0);
    g.scale(c.sx, c.sy);
    p.setAlphaf(c.alpha);
    g.drawImage(a.sprites[c.kind][c.blur], -CELL / 2, -CELL / 2, p);
    g.restore();
  }
  if (glints.length) {
    const light = Skia.Paint();
    light.setBlendMode(BlendMode.Plus); // the web's 'lighter'
    const src = Skia.XYWHRect(0, 0, 64, 64);
    for (const gl of glints) {
      light.setAlphaf(gl.alpha);
      g.drawImageRect(a.glint, src, Skia.XYWHRect(gl.x - gl.size / 2, gl.y - gl.size / 2, gl.size, gl.size), light);
    }
  }
  return recorder.finishRecordingAsPicture();
}
