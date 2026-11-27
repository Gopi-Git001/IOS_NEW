// Single source of truth for URLs and identity. Change these in one place.

/** Canonical site origin (domain owned in Vercel team ak-c306). Every canonical, OG URL, sitemap and JSON-LD id derives from this. */
export const SITE_URL = 'https://sugardepth.com';

/**
 * Where a "Scan a label" button goes on a normal visit: the Expo web scan screen (Vercel project
 * quickgob-web). Kept as a plain literal because astro.config.mjs loads this file with bare Node and
 * cannot resolve an import — see the note further down. `src/data/app-links.ts` holds the same values
 * from brand/app-links.json and a unit test asserts the two agree.
 */
export const APP_URL = 'https://app.sugardepth.com/scan';

export const SITE_NAME = 'Sugar Depth';
export const TAGLINE = 'Read the fine print.';
export const ORG = {
  name: 'Martian Dynamics LLC',
  locality: 'Leander',
  region: 'TX',
  country: 'US',
  email: 'support@sugardepth.com',
};

// The rules and registry versions these pages describe are not kept here: import POLICY_VERSION and REGISTRY_VERSION
// from './data/ingredients', which reads them from the generated registry data.
// Keep this file free of imports. astro.config.mjs loads it with plain Node; an import Node can't resolve by itself
// makes Astro fall back to Vite, which then reads the Expo app's tsconfig at the repo root and fails on Vercel,
// where only this folder's dependencies are installed.

/** Date the content was last reviewed against the rulebook (ISO). */
export const CONTENT_UPDATED = '2026-11-10';

/**
 * Homepage hero. "paper" is the light sugar-paper hero with the cycling verdict cards;
 * "classic" keeps the dark crystal hero. Flip this to compare the two.
 */
export const HERO_VARIANT: 'paper' | 'classic' = 'paper';

/**
 * Falling crystals on the home hero. The paper hero turns them off (they are a dark-band effect
 * and would fight the light background) without deleting them: switch back to true any time.
 * Only the home hero is affected; /how-it-works and /about keep their crystal bands.
 */
export const HERO_CRYSTALS = false;

/**
 * Crystals on the /how-it-works top band. That band is now light sugar-paper like the homepage
 * hero, so the crystals are off there too. The <CrystalSwarm /> component is untouched: flip this
 * to true to bring them back.
 */
export const HOW_IT_WORKS_CRYSTALS = false;

/**
 * "Sugar's other names" on the homepage. false (default) shows the new white alias cards; true
 * brings back the original dark flip-tile board with its swarm burst canvas. The old markup, CSS
 * (swarm.css) and script (src/lib/swarm.ts) are all kept, so this is a one-word switch.
 */
export const EXPLORE_SWARM_CARDS = false;

/**
 * "Sugar's other names" on the homepage. true (default) shows the two-row moving band
 * (components/AliasMarquee.astro); false brings back the static 8-card grid this replaced.
 * The grid markup and its CSS are kept, so this is a one-word switch.
 */
export const EXPLORE_MARQUEE = true;

export const abs = (path: string) => new URL(path, SITE_URL).href;
