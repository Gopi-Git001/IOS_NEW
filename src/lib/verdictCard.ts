import type { ScanResult, Verdict } from '../types';

export const CARD_INGREDIENT_LIMIT = 4;
export type CardIngredient = { name: string; kind: 'ADDED SUGAR' | 'SWEETENER' };
export type VerdictCardData = {
  brand: 'Sugar Depth';
  verdict: Verdict;
  headline: string;
  ingredients: CardIngredient[];
  moreCount: number;
  emptyMessage: string;
  scanDate: string;
  dateKey: string;
  website: 'sugardepth.com';
};

const text = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * An explicit public-field allow-list, not a screenshot of the result screen.
 * Never pass a label photo, profile, account or history entry to the renderer.
 * RETRY is not a verdict and must never produce a shareable card.
 */
export function buildVerdictCardData(result: ScanResult | { verdict: 'RETRY' }, scannedAt: Date): VerdictCardData | null {
  if (!['CLEAN', 'OKAY', 'BAD'].includes(result.verdict) || result.verdict === 'RETRY') return null;
  const seen = new Set<string>();
  const ingredients: CardIngredient[] = [];
  for (const [items, kind] of [[result.addedSugars, 'ADDED SUGAR'], [result.sweeteners, 'SWEETENER']] as const) {
    for (const item of items) {
      const name = text(item);
      // Structured amount/hint rows are not ingredient names; E/INS codes remain valid.
      if (!name || /\bper\s+(?:serving|100\s*(?:g|ml))\b/i.test(name) || /^\d+(?:\.\d+)?\s*g\b/i.test(name)) continue;
      const key = name.toLocaleLowerCase('en');
      if (seen.has(key)) continue;
      seen.add(key);
      ingredients.push({ name, kind });
    }
  }
  const dateKey = [scannedAt.getFullYear(), String(scannedAt.getMonth() + 1).padStart(2, '0'), String(scannedAt.getDate()).padStart(2, '0')].join('-');
  return {
    brand: 'Sugar Depth',
    verdict: result.verdict,
    headline: text(result.headline),
    ingredients: ingredients.slice(0, CARD_INGREDIENT_LIMIT),
    moreCount: Math.max(0, ingredients.length - CARD_INGREDIENT_LIMIT),
    emptyMessage: result.verdict === 'CLEAN' ? 'None listed in this scan.' : 'No ingredient names available.',
    scanDate: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(scannedAt),
    dateKey,
    website: 'sugardepth.com',
  };
}
