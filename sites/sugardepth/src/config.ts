// Single source of truth for URLs and identity. Change these in one place.

/** Canonical site origin (domain owned in Vercel team ak-c306). Every canonical, OG URL, sitemap and JSON-LD id derives from this. */
export const SITE_URL = 'https://sugardepth.com';

/**
 * Where "Scan a label" buttons go. Today this is the existing Expo web build.
 * TODO: switch to https://app.sugardepth.com once that domain points at the scanner.
 */
export const APP_URL = 'https://quickgob-web.vercel.app';

export const SITE_NAME = 'Sugar Depth';
export const TAGLINE = 'Read the fine print.';
export const ORG = {
  name: 'Martian Dynamics LLC',
  locality: 'Leander',
  region: 'TX',
  country: 'US',
  email: 'akhil@martiandynamics.com',
};

/** Versions of the rulebook these pages describe (from RULES.md / policy.ts / ingredients.ts). */
export const POLICY_VERSION = 'rules-v2.1';
export const REGISTRY_VERSION = 'registry-2026.11.06';

/** Date the content was last reviewed against the rulebook (ISO). */
export const CONTENT_UPDATED = '2026-11-09';

export const abs = (path: string) => new URL(path, SITE_URL).href;
