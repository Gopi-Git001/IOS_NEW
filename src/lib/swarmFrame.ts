// What to draw for one frame of the crystal swarm, as plain numbers. The phone version (CrystalSwarmSkia.tsx)
// draws from this. It mirrors paintSwarm in CrystalSwarm.web.tsx, so phones and browsers move and fade alike.
import { quietDim, type Rect, type Swarm } from './swarm';

/** Sprite size (px), the room around it for blur, and the full cell each sprite is drawn in. Same as the web. */
export const SPRITE = 96;
export const SPRITE_PAD = 16;
export const CELL = SPRITE + SPRITE_PAD * 2;

/** One crystal: sprite kind and blur level, where it sits, its turn (degrees), its squash and its opacity. */
export type CrystalDraw = { kind: number; blur: 0 | 1 | 2; x: number; y: number; degrees: number; sx: number; sy: number; alpha: number };
/** A sparkle on a sharp, near crystal as its face turns to the light. */
export type GlintDraw = { x: number; y: number; alpha: number; size: number };

/** Crystals more than this far off screen are skipped. */
const OFFSCREEN = 80;

export function swarmFrame(swarm: Swarm): { crystals: CrystalDraw[]; glints: GlintDraw[] } {
  const { width: W, height: H } = swarm.view;
  const crystals: CrystalDraw[] = [];
  const glints: GlintDraw[] = [];
  for (const p of swarm.parts) {
    if (p.x < -OFFSCREEN || p.x > W + OFFSCREEN || p.y < -OFFSCREEN || p.y > H + OFFSCREEN) continue;
    const s = p.size / SPRITE;
    const flip = Math.cos(p.tumble); // fake 3D tumble around one axis
    const a = p.alpha * quietDim(p.x, p.y, swarm.quiet);
    crystals.push({
      kind: p.kind,
      blur: p.blur,
      x: p.x,
      y: p.y,
      degrees: (p.rot * 180) / Math.PI,
      sx: s * (0.3 + 0.7 * Math.abs(flip)),
      sy: s,
      alpha: a * (0.82 + 0.18 * flip * flip), // the face brightens as it turns to the light
    });
    if (p.blur === 0 && p.z > 0.45) {
      const gl = Math.sin(swarm.time * p.glintF * 6.28 + p.glintP) * Math.abs(flip);
      if (gl > 0.93) glints.push({ x: p.x, y: p.y - p.size * 0.28, alpha: ((gl - 0.93) / 0.07) * a, size: p.size * 0.9 });
    }
  }
  return { crystals, glints };
}

/** A box measured on screen, moved into the swarm's own coordinates. Null when it has no size yet. */
export function relativeBox(box: Rect | null, host: Rect): Rect | null {
  if (!box || !box.width || !box.height) return null;
  return { x: box.x - host.x, y: box.y - host.y, width: box.width, height: box.height };
}
