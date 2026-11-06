// Sugar Hunter sugar rules (CLEAN / BAD / UGLY). Pure functions: no network, no Deno APIs, so they run under Node tests too.
//
// Rules v2 (Nov 2026). No gram cutoff: any added sugar at all is UGLY.
//   UGLY  = any added sugar (incl. honey, syrups, fruit juice concentrate), any artificial sweetener,
//           erythritol or xylitol, or drinking alcohol
//   BAD   = no added sugar, but stevia, monk fruit, allulose or another sugar alcohol (sorbitol, maltitol...)
//   CLEAN = no added sugar and no sweetener of any kind (sugars naturally in fruit or milk are fine)
// Basis: the 2025-2030 Dietary Guidelines say no amount of added sugar or non-nutritive sweetener is
// recommended; erythritol and xylitol are linked to clotting and heart events in NIH-funded studies.
//
// Jev makes the fast call straight from the photo (see _shared/jev.ts). These rules are the
// backstop: they decide when Jev is unavailable or unsure, and they check Jev's call afterwards.

export type Verdict = 'CLEAN' | 'BAD' | 'UGLY';

/** What Claude reads off the label (see LABEL_SCHEMA in scan-label). */
export type LabelReading = {
  is_food_label: boolean;
  /** False when the ingredient text is too blurry, dark or cut off to read. */
  is_readable?: boolean;
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
/** Sugar alcohols with the strongest heart-risk signal; these make a product UGLY. */
const RISKY_SUGAR_ALCOHOLS = ['erythritol', 'xylitol', 'e967', 'e968'];
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

  const risky = r.sugar_alcohols.filter((s) => matches(s, RISKY_SUGAR_ALCOHOLS));
  const panelNote = grams === null ? 'Scan the nutrition panel to see the grams' : undefined;

  // UGLY
  if (hasAddedSugar) return { ...base, verdict: 'UGLY', headline: 'Added sugar', note: panelNote };
  if (r.artificial_sweeteners.length > 0) return { ...base, verdict: 'UGLY', headline: 'Artificial sweeteners' };
  if (risky.length > 0) return { ...base, verdict: 'UGLY', headline: `Contains ${risky[0].toLowerCase()}` };
  if (r.contains_alcohol) return { ...base, verdict: 'UGLY', headline: 'Contains alcohol' };

  // BAD
  if (r.sugar_alcohols.length > 0) return { ...base, verdict: 'BAD', headline: 'Contains sugar alcohols' };
  if (r.other_sweeteners.length > 0) {
    return { ...base, verdict: 'BAD', headline: 'Gentler sweetener', note: 'The gentlest option, but still a sweetener' };
  }

  // CLEAN
  return { ...base, verdict: 'CLEAN', headline: 'No added sugar', note: 'Great pick, no added sugar' };
}

/** Headline for a verdict when only Jev's call is known (the ingredient lists come later). */
export const quickHeadline: Record<Verdict, string> = {
  CLEAN: 'No added sugar',
  BAD: 'Contains sweeteners',
  UGLY: 'Added sugar or harsh sweeteners',
};
