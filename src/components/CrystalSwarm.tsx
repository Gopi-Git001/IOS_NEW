// Phones (Expo Go and native builds). Browsers use CrystalSwarm.web.tsx, which draws on an HTML canvas.
import type { CrystalBurstProps } from '../lib/swarm';

/** Sugar cubes and shards drifting behind the sign-in screen, drawn with React Native Skia. */
export { CrystalSwarmSkia as CrystalSwarm } from './CrystalSwarmSkia';

/** A one-second spray of verdict-coloured crystals from the result sheet's edge. Web only; phones get nothing. */
export function CrystalBurst(_props: CrystalBurstProps) {
  return null;
}
