import { normalizeResult, VERDICT_SCHEME } from './lib/verdicts';
import type { ScanResult } from './types';

// Demo mode (no Supabase settings in .env, development builds only): fake results, shown in turn on
// each scan. Pure (no React Native imports) so it runs under Node tests.

/** How long the fake scan "thinks" before the verdict appears. */
export const DEMO_DELAY_MS = 1600;

// Written in the current (v3) names; normalizeResult keeps them in step with verdicts.ts.
const raw: ScanResult[] = [
  {
    verdict: 'CLEAN',
    headline: 'No added sugar',
    naturalSugars: ['Lactose', 'Fructose'],
    addedSugars: [],
    sweeteners: [],
    note: 'Great pick, no added sugar',
  },
  {
    verdict: 'OKAY',
    headline: 'Gentler sweetener',
    naturalSugars: ['Fructose'],
    addedSugars: [],
    sweeteners: ['Stevia leaf extract'],
    note: 'The gentlest option, but still a sweetener',
  },
  {
    verdict: 'BAD',
    headline: 'Too much added sugar',
    naturalSugars: [],
    addedSugars: ['Sucrose', 'Glucose syrup', 'Fruit juice concentrate', '12 g added per serving'],
    sweeteners: ['Aspartame'],
    sugarStacking: { distinct: 3, stacked: true, firstPosition: 2, firstNested: false, ingredientCount: 9 },
  },
];

export const placeholderResults: ScanResult[] = raw.map((r) => normalizeResult(r, VERDICT_SCHEME) ?? r);

/** The n-th fake result (0-based): CLEAN, OKAY, BAD, CLEAN, … */
export const placeholderAt = (n: number): ScanResult =>
  placeholderResults[((n % placeholderResults.length) + placeholderResults.length) % placeholderResults.length];

export type AppMode = 'live' | 'demo' | 'not-configured';

/**
 * Live with Supabase settings. Without them, development (Expo Go) runs the demo; a release build
 * (App Store, web export) shows a "not configured" screen and never fake verdicts.
 */
export function appMode(isDev: boolean, configured: boolean): AppMode {
  if (configured) return 'live';
  return isDev ? 'demo' : 'not-configured';
}
