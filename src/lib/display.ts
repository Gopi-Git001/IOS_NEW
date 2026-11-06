// Pure helpers for what the app shows. No React Native imports, so they run under Node tests.
import type { ScanResult } from '../types';

// Plant-based sweeteners. Same list as OTHER_SWEETENERS in supabase/functions/_shared/rules.ts; keep in sync.
const PLANT_SWEETENERS = ['stevia', 'steviol', 'rebaudioside', 'monk fruit', 'luo han guo', 'mogroside', 'allulose', 'thaumatin', 'e960'];

const isPlantSweetener = (item: string) => PLANT_SWEETENERS.some((w) => item.toLowerCase().includes(w));

/**
 * The server rates plant sweeteners (stevia, monk fruit…) as BAD. That is strict mode.
 * With strict mode off, a product whose only issue is plant sweeteners is shown as CLEAN.
 */
export function applyStrictMode(result: ScanResult, strict: boolean): ScanResult {
  const onlyPlantSweeteners =
    result.verdict === 'BAD' &&
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

export type HistoryEntry = { id: string; date: string; result: ScanResult };

/** Newest first, at most 50. Stores the server's result, so the strict-mode setting applies when shown. */
export function addToHistory(history: HistoryEntry[], result: ScanResult, now: Date): HistoryEntry[] {
  const entry = { id: `${now.getTime()}-${history.length}`, date: now.toISOString(), result };
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
