// The crystal swarm and the verdict burst are drawn on a browser canvas (CrystalSwarm.web.tsx).
// Phones get nothing here: no canvas, no animation loop, so the native build and the camera stay untouched.
import type { CrystalBurstProps, CrystalSwarmProps } from '../lib/swarm';

/** Sugar cubes and shards drifting behind the sign-in screen. Web only. */
export function CrystalSwarm(_props: CrystalSwarmProps) {
  return null;
}

/** A one-second spray of verdict-coloured crystals from the result sheet's edge. Web only. */
export function CrystalBurst(_props: CrystalBurstProps) {
  return null;
}
