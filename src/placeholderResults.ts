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
    verdict: 'BAD',
    headline: 'A little added sugar',
    naturalSugars: ['Fructose'],
    addedSugars: ['Honey'],
    sweeteners: [],
    note: 'Fine now and then',
  },
  {
    verdict: 'UGLY',
    headline: 'Too much sugar',
    naturalSugars: [],
    addedSugars: ['Sucrose', 'Glucose syrup', 'Fruit juice concentrate', '12 g added per serving'],
    sweeteners: ['Aspartame'],
  },
];
