// QuickGAB sugar rules. Pure functions: no network, no Deno APIs, so they run under Node tests too.
//
//   BAD   = artificial sweeteners, alcohol, or over 4 g added sugar
//   OKAY  = sugar alcohols, or 1–4 g added sugar
//   CLEAN = no added sugar and no sweeteners
//
// These rules always decide the verdict; no model output can override them.

export type Verdict = 'CLEAN' | 'OKAY' | 'BAD';

/** What Claude reads off the label (see LABEL_SCHEMA in scan-label). */
export type LabelReading = {
  is_food_label: boolean;
  natural_sugars: string[];
  added_sugars: string[];
  artificial_sweeteners: string[];
  sugar_alcohols: string[];
  /** Plant-based zero-calorie sweeteners such as stevia or monk fruit. */
  other_sweeteners: string[];
  contains_alcohol: boolean;
  /** Grams of added sugar per serving from the nutrition panel, or null if not visible. */
  added_sugar_grams: number | null;
};

/** The shape the app renders. Keep in sync with src/types.ts. */
export type ScanResult = {
  verdict: Verdict;
  headline: string;
  naturalSugars: string[];
  addedSugars: string[];
  sweeteners: string[];
  note?: string;
};

const ARTIFICIAL = ['aspartame', 'sucralose', 'acesulfame', 'saccharin', 'neotame', 'advantame', 'cyclamate', 'e950', 'e951', 'e952', 'e954', 'e955', 'e961', 'e962', 'e969'];
const SUGAR_ALCOHOLS = ['erythritol', 'xylitol', 'sorbitol', 'maltitol', 'mannitol', 'isomalt', 'lactitol', 'e420', 'e421', 'e953', 'e965', 'e966', 'e967', 'e968'];
const OTHER_SWEETENERS = ['stevia', 'steviol', 'rebaudioside', 'monk fruit', 'luo han guo', 'mogroside', 'allulose', 'thaumatin', 'e960'];

const matches = (item: string, words: string[]) => {
  const lower = item.toLowerCase();
  return words.some((w) => lower.includes(w));
};

const unique = (items: string[]) => {
  const seen = new Set<string>();
  return items
    .map((i) => i.trim())
    .filter((i) => i && !seen.has(i.toLowerCase()) && seen.add(i.toLowerCase()));
};

/** Moves anything misfiled as an added sugar into the right sweetener group. */
export function normalise(r: LabelReading): LabelReading {
  const artificial = [...r.artificial_sweeteners];
  const alcohols = [...r.sugar_alcohols];
  const other = [...r.other_sweeteners];
  const added: string[] = [];
  for (const item of r.added_sugars) {
    if (matches(item, ARTIFICIAL)) artificial.push(item);
    else if (matches(item, SUGAR_ALCOHOLS)) alcohols.push(item);
    else if (matches(item, OTHER_SWEETENERS)) other.push(item);
    else added.push(item);
  }
  const grams = r.added_sugar_grams;
  return {
    ...r,
    natural_sugars: unique(r.natural_sugars),
    added_sugars: unique(added),
    artificial_sweeteners: unique(artificial),
    sugar_alcohols: unique(alcohols),
    other_sweeteners: unique(other),
    added_sugar_grams: typeof grams === 'number' && Number.isFinite(grams) && grams >= 0 ? grams : null,
  };
}

const fmtGrams = (g: number) => `${Number.isInteger(g) ? g : g.toFixed(1)} g`;

export function decide(input: LabelReading): ScanResult {
  const r = normalise(input);
  const grams = r.added_sugar_grams;
  const hasAddedSugar = r.added_sugars.length > 0 || (grams !== null && grams > 0);

  const sweeteners = [
    ...r.artificial_sweeteners,
    ...r.sugar_alcohols.map((s) => `${s} (sugar alcohol)`),
    ...r.other_sweeteners,
  ];
  const addedSugars = grams !== null && grams > 0 && r.added_sugars.length > 0
    ? [...r.added_sugars, `${fmtGrams(grams)} added per serving`]
    : grams !== null && grams > 0
      ? [`${fmtGrams(grams)} added per serving`]
      : r.added_sugars;

  const base = { naturalSugars: r.natural_sugars, addedSugars, sweeteners };

  // BAD
  if (grams !== null && grams > 4) return { ...base, verdict: 'BAD', headline: 'Too much sugar' };
  if (r.artificial_sweeteners.length > 0) return { ...base, verdict: 'BAD', headline: 'Artificial sweeteners' };
  if (r.contains_alcohol) return { ...base, verdict: 'BAD', headline: 'Contains alcohol' };

  // OKAY
  if (hasAddedSugar) {
    const headline = grams === null ? 'Added sugar, amount not shown' : 'A little added sugar';
    return { ...base, verdict: 'OKAY', headline, note: grams === null ? 'Scan the nutrition panel to check grams' : undefined };
  }
  if (r.sugar_alcohols.length > 0) return { ...base, verdict: 'OKAY', headline: 'Contains sugar alcohols' };
  if (r.other_sweeteners.length > 0) return { ...base, verdict: 'OKAY', headline: 'Contains sweeteners' };

  // CLEAN
  return { ...base, verdict: 'CLEAN', headline: 'No added sugar', note: 'Great pick, no added sugar' };
}
