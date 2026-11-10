import type { ScanResult } from './types';

// Phase 1 only: fake results, shown in turn on each scan. Replaced by the backend in a later phase.
export const placeholderResults: ScanResult[] = [
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
