// Pure helpers for what the app shows. No React Native imports, so they run under Node tests.
import type { ScanResult } from '../types';
import { VERDICT_SCHEME } from './verdicts';

// Plant-based sweeteners (OTHER_SWEETENERS in supabase/functions/_shared/rules.ts, minus allulose, which is a rare sugar).
const PLANT_SWEETENERS = ['stevia', 'steviol', 'rebaudioside', 'monk fruit', 'luo han guo', 'mogroside', 'thaumatin', 'e960'];

const isPlantSweetener = (item: string) => PLANT_SWEETENERS.some((w) => item.toLowerCase().includes(w));

/**
 * The server rates plant sweeteners (stevia, monk fruit…) as OKAY. That is strict mode.
 * With strict mode off, a product whose only issue is plant sweeteners is shown as CLEAN.
 */
export function applyStrictMode(result: ScanResult, strict: boolean): ScanResult {
  const onlyPlantSweeteners =
    result.verdict === 'OKAY' &&
    result.addedSugars.length === 0 &&
    result.sweeteners.length > 0 &&
    result.sweeteners.every(isPlantSweetener);
  return strict || !onlyPlantSweeteners ? result : { ...result, verdict: 'CLEAN' };
}

/** "+1 •••• 4821" from Supabase's "14155554821" (digits only, country code first). */
export function maskPhone(phone: string | undefined) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 8) return 'Not available';
  const country = digits.length > 10 ? digits.slice(0, digits.length - 10) : '';
  return `${country ? `+${country} ` : ''}•••• ${digits.slice(-4)}`;
}

export const HISTORY_LIMIT = 50;

/** scheme marks entries saved with the CLEAN / OKAY / BAD names (see verdicts.ts). */
export type HistoryEntry = { id: string; date: string; result: ScanResult; scheme?: string };

/** Newest first, at most 50. Stores the server's result, so the strict-mode setting applies when shown. */
export function addToHistory(history: HistoryEntry[], result: ScanResult, now: Date): HistoryEntry[] {
  const entry = { id: `${now.getTime()}-${history.length}`, date: now.toISOString(), result, scheme: VERDICT_SCHEME };
  return [entry, ...history].slice(0, HISTORY_LIMIT);
}

/** The first few ingredient names found, for a one-line summary. */
export function ingredientSummary(result: ScanResult, max = 3) {
  const names = [...result.addedSugars, ...result.sweeteners, ...result.naturalSugars];
  if (names.length === 0) return 'No sugars or sweeteners found';
  const shown = names.slice(0, max).join(', ');
  return names.length > max ? `${shown} +${names.length - max}` : shown;
}

/**
 * Ingredient names for the result panel: drops amounts and hints that aren't names (anything with a digit,
 * a standalone "g", "per serving", or over 40 characters) and repeats (ignoring case; the first spelling wins).
 */
export function ingredientNames(items: string[]) {
  const seen = new Set<string>();
  return items
    .map((item) => item.trim())
    .filter((item) => item && !/\d/.test(item) && !/\bg\b/i.test(item) && !/per serving/i.test(item) && item.length <= 40)
    .filter((item) => !seen.has(item.toLowerCase()) && Boolean(seen.add(item.toLowerCase())));
}

/** "Sam Lee" → "SL", "sam" → "S"; empty when there's no name (show a person icon instead). */
export function initials(name: string | null | undefined) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => [...w][0].toUpperCase()).join('');
}

/** Whole-number percentage of `part` in `total` (0 when there are no scans). */
export const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

/**
 * The one-line reason under the verdict, e.g. "Too much sugar · 6 g added per serving".
 * The grams come from the server's "N g added per serving" entry, which the name lists leave out.
 */
export function reasonLine(result: ScanResult) {
  const grams = result.addedSugars.map((s) => s.match(/^(\d+(?:\.\d+)?) g added per serving$/i)).find(Boolean);
  return grams ? `${result.headline} · ${grams[1]} g added per serving` : result.headline;
}

const wholeFrom1 = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1;

/**
 * The "Sugar stacking" badge and the one line beside it: "3 different added sugars, first at ingredient 2 of 14",
 * or just "First sugar at ingredient 2 of 14" when there is one. Null when the server sent no place or one that
 * doesn't add up, so nothing is shown. A sub-ingredient in brackets reads "inside ingredient 1 of 3".
 * Display only: it never changes the verdict.
 */
export function sugarStackingLine(result: ScanResult): { badge: string | null; line: string } | null {
  const s = result.sugarStacking;
  if (!s || !wholeFrom1(s.distinct) || !wholeFrom1(s.firstPosition) || !wholeFrom1(s.ingredientCount) || s.firstPosition > s.ingredientCount) return null;
  const place = `${s.firstNested === true ? 'inside' : 'at'} ingredient ${s.firstPosition} of ${s.ingredientCount}`;
  const stacked = s.stacked === true && s.distinct >= 2;
  return stacked
    ? { badge: 'Sugar stacking', line: `${s.distinct} different added sugars, first ${place}` }
    : { badge: null, line: `First sugar ${place}` };
}
