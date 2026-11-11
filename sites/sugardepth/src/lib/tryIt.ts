// The home page "try it" widget. It stands in for stage 1 of the scanner (reading a photo) and nothing else:
// pasted text becomes the literal label the shared rules expect, then the scanner's own modules
// (supabase/functions/_shared: normalize.ts, ingredients.ts, policy.ts) parse, classify and decide.
// No rule lives in this file. Pure functions, no DOM and no network, so they run at build time, in the
// browser and under Node tests.
import { baseKey, normalizeKey } from '../../../../supabase/functions/_shared/normalize.ts';
import {
  classify,
  evaluate,
  type Evaluation,
  type LiteralLabel,
  type ShownVerdict,
} from '../../../../supabase/functions/_shared/policy.ts';

/** Longest paste the widget reads. The textarea has the same limit. */
export const MAX_PASTE_CHARS = 4000;

export type Sample = {
  id: string;
  name: string;
  /** What the front of the pack says. */
  claim: string;
  ingredients: string;
  /** The "Added Sugars" line of the sample's nutrition panel, in grams per serving. */
  addedSugarsG: number;
};

/** Made-up labels of the health-halo kind. Not real products. At most four (the no-JavaScript styles count them). */
export const SAMPLES: Sample[] = [
  {
    id: 'yogurt',
    name: 'Flavored Greek yogurt',
    claim: 'High protein, 0% milkfat',
    ingredients:
      'Cultured Nonfat Milk, Cane Sugar, Strawberries, Water, Natural Flavors, Fruit Pectin, Locust Bean Gum, Lemon Juice, Fruit and Vegetable Juice (for Color)',
    addedSugarsG: 11,
  },
  {
    id: 'hydration',
    name: 'Zero-sugar hydration stick',
    claim: 'Zero sugar, electrolytes',
    ingredients:
      'Citric Acid, Sodium Citrate, Potassium Citrate, Natural Flavors, Salt, Magnesium Citrate, Stevia Leaf Extract, Vitamin C (Ascorbic Acid), Vegetable Juice Color',
    addedSugarsG: 0,
  },
  {
    id: 'granola-bar',
    name: 'Kids organic granola bar',
    claim: 'Organic, whole grain, made with honey',
    ingredients:
      'Organic Rolled Oats, Organic Brown Rice Syrup, Organic Cane Sugar, Organic Chocolate Chips (Organic Cane Sugar, Organic Unsweetened Chocolate, Organic Cocoa Butter), Organic Sunflower Oil, Organic Honey, Organic Crisp Rice (Organic Rice Flour, Organic Cane Sugar, Sea Salt), Sea Salt, Organic Vanilla Extract',
    addedSugarsG: 7,
  },
  {
    id: 'peanut-butter',
    name: 'Plain peanut butter',
    claim: 'Two ingredients',
    ingredients: 'Dry Roasted Peanuts, Salt',
    addedSugarsG: 0,
  },
];

const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;
const LIST_BULLET = /^\s*(?:[-\u2013\u2014\u2022\u00B7*]|\d+[.)])\s+/;

/**
 * Pasted text as one ingredient list. Web pages often paste with invisible characters, or with one ingredient
 * per line and no commas; both are turned into the comma list a label prints. Wording is never changed.
 */
export function toIngredientText(pasted: string): string {
  const text = pasted.replace(ZERO_WIDTH, '').replace(/\r\n?/g, '\n').slice(0, MAX_PASTE_CHARS).trim();
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1 && !/[,;]/.test(text)) return lines.map((line) => line.replace(LIST_BULLET, '')).join(', ');
  return text;
}

/** The optional "added sugars per serving" box: a number of grams, or null when empty or not a number. */
export function parseGrams(value: string | null | undefined): number | null {
  const text = (value ?? '').trim().replace(',', '.').replace(/\s*(?:g|grams?)$/i, '');
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  return Number(text);
}

/** The literal label for a typed list: complete and readable, with the grams as a per-serving figure when given. */
export function labelFromText(ingredients: string, addedSugarsG: number | null): LiteralLabel {
  return {
    is_food_label: true,
    is_readable: true,
    ingredients_text: ingredients || null,
    ingredients_complete: true,
    total_sugars_g: null,
    added_sugars_g: addedSugarsG,
    quantity_basis: addedSugarsG === null ? 'unknown' : 'per_serving',
    serving_size_text: null,
    abv_text: null,
  };
}

/**
 * One ingredient as printed, in label order. `within` is the compound it is listed inside ("Chocolate Chips"),
 * `tag` its class when the registry has something to say about it, `decided` whether it set the verdict.
 */
export type Item = { name: string; within?: string; tag?: string; decided: boolean; unknown: boolean };

export type TryResult =
  /** Nothing was pasted. */
  | { kind: 'empty' }
  /** Not one pasted item is in the registry, so it is probably not an ingredient list. The scanner's photo reader makes this call there. */
  | { kind: 'unrecognised' }
  /** The rules declined to give a verdict. */
  | { kind: 'retry'; why: string }
  | {
      kind: 'verdict';
      verdict: ShownVerdict;
      ruleId: string;
      why: string;
      notes: string[];
      items: Item[];
      addedSugarsG: number | null;
      policyVersion: string;
      registryVersion: string;
    };

const CLASS_TAG: Record<keyof Evaluation['found'], string> = {
  added_sugar: 'Added sugar',
  non_sugar_sweetener: 'Sweetener',
  sugar_alcohol: 'Sugar alcohol',
  rare_sugar: 'Rare sugar',
  naturally_occurring_sugar: 'Natural sugar',
  other_carbohydrate: 'Not sugar',
  context_dependent: 'Depends on use',
  drinking_alcohol: 'Alcohol',
};

/** Pasted text and optional grams in, the scanner's verdict out. */
export function scanText(pasted: string, addedSugarsG: number | null = null): TryResult {
  const text = toIngredientText(pasted);
  if (!text) return { kind: 'empty' };
  const resolved = classify(text).all;
  if (!resolved.some((r) => r.entry)) return { kind: 'unrecognised' };

  const ev = evaluate(labelFromText(text, addedSugarsG));
  if (ev.verdict === 'RETRY') return { kind: 'retry', why: ev.explanation };

  // The rules file each sweet-relevant ingredient under a class once per name; look every printed item up there.
  const nameOf = (id: string, key: string) => `${id}|${baseKey(key)}`;
  const tags = new Map<string, string>();
  for (const [cls, list] of Object.entries(ev.found) as [keyof Evaluation['found'], Evaluation['found'][keyof Evaluation['found']]][]) {
    for (const e of list) {
      const tag = e.subtype === 'artificial' ? 'Artificial sweetener' : e.subtype === 'plant' ? 'Plant sweetener' : CLASS_TAG[cls];
      tags.set(nameOf(e.id, normalizeKey(e.literal)), tag);
    }
  }
  const decided = new Set(ev.triggers.map((e) => nameOf(e.id, normalizeKey(e.literal))));

  const items: Item[] = resolved.map((r) => {
    const printed = { name: r.literal, ...(r.path.length ? { within: r.path[r.path.length - 1] } : {}) };
    if (!r.entry) {
      const unknown = r.via === 'none';
      return { ...printed, tag: unknown ? (r.sweetSignal ? 'May sweeten' : 'Not in registry') : undefined, decided: false, unknown };
    }
    const name = nameOf(r.entry.id, r.key);
    return { ...printed, tag: tags.get(name), decided: decided.has(name), unknown: false };
  });

  const notes = [...ev.warnings];
  if (ev.ruleId === 'X2-added-sugar-no-grams' && addedSugarsG === null) {
    notes.push('No grams were entered. Add the Added Sugars figure from the Nutrition Facts panel to grade it by amount.');
  }
  return {
    kind: 'verdict',
    verdict: ev.verdict,
    ruleId: ev.ruleId,
    why: ev.explanation,
    notes,
    items,
    addedSugarsG,
    policyVersion: ev.policyVersion,
    registryVersion: ev.registryVersion,
  };
}

// ---- Markup: one function for the build and the browser, so a sample and a pasted list look the same. ----

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (text: string) => text.replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

/** The site's CSS still names the amber tone "bad" and the rose tone "ugly" (brand/tokens.json), as the app's theme.ts notes. */
const SITE_TONE: Record<ShownVerdict, 'clean' | 'bad' | 'ugly'> = { CLEAN: 'clean', OKAY: 'bad', BAD: 'ugly' };

const grams = (g: number) => `${g} g added sugars per serving`;

/** The result panel as HTML. Every pasted character is escaped. */
export function renderResult(result: TryResult, label: string): string {
  if (result.kind !== 'verdict') {
    const why =
      result.kind === 'empty'
        ? 'Paste an ingredient list first.'
        : result.kind === 'unrecognised'
          ? 'None of that matches an ingredient the rules know, so there is no verdict. Paste the ingredient list as printed on the package, with commas between the ingredients.'
          : result.why;
    return `<div class="sheet facts tryit-facts"><p class="facts-title">No verdict</p><hr class="rule-10" /><p class="facts-why">${esc(why)}</p><hr class="rule-4" /></div>`;
  }
  const tone = SITE_TONE[result.verdict];
  const rows = result.items
    .map((item) => {
      const cls = item.decided ? ` class="hit ${tone}"` : item.tag && !item.unknown ? ' class="hit"' : item.unknown ? ' class="unknown"' : '';
      const tag = item.tag ? ` <span class="tag">${esc(item.tag)}</span>` : '';
      const within = item.within ? ` <span class="within">in ${esc(item.within)}</span>` : '';
      return `<li${cls}><span class="name">${esc(item.name)}</span>${within}${tag}</li>`;
    })
    .join('');
  const notes = result.notes.map((note) => `<p class="facts-foot">${esc(note)}</p>`).join('');
  return (
    // The rule id stays in the markup for tests and support, as an attribute. It is not shown to the reader.
    `<div class="sheet facts tryit-facts tone-${tone}" data-verdict="${result.verdict}" data-rule="${esc(result.ruleId)}">` +
    `<p class="facts-title" aria-hidden="true">Verdict Facts</p><hr class="rule-10" />` +
    `<div class="facts-sub"><span>${esc(label)}</span><span>${result.addedSugarsG === null ? 'added sugar grams not given' : grams(result.addedSugarsG)}</span></div><hr class="rule-5" />` +
    `<div class="facts-verdict"><p class="facts-word ${tone}"><span class="sr-only">Verdict: </span>${result.verdict}</p>` +
    `<div class="mini-slab" aria-hidden="true"><span>Verdict</span><b>${result.verdict}</b></div></div>` +
    `<p class="facts-why">${esc(result.why)}</p>${notes}<hr class="rule-5" />` +
    `<p class="tryit-count">${result.items.length} ${result.items.length === 1 ? 'ingredient' : 'ingredients'} read, in label order</p>` +
    `<ul class="tryit-items">${rows}</ul><hr class="rule-4" /></div>`
  );
}
