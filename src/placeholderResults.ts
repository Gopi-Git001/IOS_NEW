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
    headline: 'A little added sugar',
    naturalSugars: ['Fructose'],
    addedSugars: ['Honey (3 g)'],
    sweeteners: [],
    note: 'Fine now and then',
  },
  {
    verdict: 'BAD',
    headline: 'Too much sugar',
    naturalSugars: ['Fruit juice concentrate'],
    addedSugars: ['Sucrose', 'Glucose syrup'],
    sweeteners: ['Aspartame'],
  },
];
