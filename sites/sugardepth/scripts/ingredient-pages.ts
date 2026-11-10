// Builds the data behind /ingredients/<slug>, the ingredients index and /hidden-sugar-names from the scanner's
// registry (supabase/functions/_shared/ingredients.ts) and rules (policy.ts), so the site can't drift from them.
// Pure: no network, no file access. `npm run ingredients` (repo root) writes the result to
// src/data/ingredients.generated.json; tests/unit/ingredient-pages.test.ts fails when that file is out of date.
//
// Every verdict and rule id here comes from running policy.ts evaluate() on a one-ingredient label, never from
// a copy of the rule table. The wording stays inside what the registry says: the class, the US label treatment,
// the entry's note and the sources the registry cites. No health claims.
import { type Entry, type IngredientClass, juiceEntries, REGISTRY, REGISTRY_VERSION } from '../../../supabase/functions/_shared/ingredients.ts';
import { matchEntry, normalizeKey } from '../../../supabase/functions/_shared/normalize.ts';
import { evaluate, type LiteralLabel, MAX_NON_ALCOHOLIC_ABV, MAX_OKAY_ADDED_G, POLICY_VERSION, type ShownVerdict } from '../../../supabase/functions/_shared/policy.ts';

export type Outcome = { when: string; verdict: ShownVerdict; rule: string };
export type Group = 'added_sugar' | 'bad' | 'okay' | 'depends' | 'clean_sweet' | 'clean_plain';
export type Headline = { word: string; tone: 'bad' | 'okay' | 'clean' | 'mixed'; label: string };

export type IngredientPage = {
  id: string;
  slug: string;
  name: string;
  cls: IngredientClass;
  subtype?: 'artificial' | 'plant';
  labeling: Entry['labeling'];
  treatment: Entry['treatment'];
  group: Group;
  /** The class in plain words, for the facts panel. */
  classLabel: string;
  /** "Sugar Depth's registry files X under ..." */
  classSentence: string;
  labelingLabel: string;
  labelingSentence: string;
  verdict: Headline;
  outcomes: Outcome[];
  /** Registry aliases, exactly as the scanner matches them (lowercase). */
  aliases: string[];
  /** E / INS numbers, printed like "E955". */
  codes: string[];
  /** Wording the scanner matches by a small fixed grammar instead of an alias list (juice only). */
  patterns: { pattern: string; example: string }[];
  note?: string;
  /** Keys into the site's src/data/sources.ts. */
  sources: string[];
  /** Slugs of other entries in the same group. */
  related: string[];
  title: string;
  description: string;
  summary: string;
};

export type IngredientData = {
  policyVersion: string;
  registryVersion: string;
  maxOkayAddedG: number;
  /** Number of exact names the scanner treats as added sugar. */
  addedSugarAliasCount: number;
  pages: IngredientPage[];
};

/** Registry ids whose public URL isn't simply the slugged name. */
const SLUG_OVERRIDES: Record<string, string> = {
  juice_concentrate: 'juice-concentrate', // live URL since launch
  lactose_added: 'lactose',
  imo: 'isomaltooligosaccharides',
};

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const slugFor = (e: Pick<Entry, 'id' | 'name'>) => SLUG_OVERRIDES[e.id] ?? slugify(e.name);

/** Every entry that gets a page: the registry plus the two juice entries matched by grammar. */
export const allEntries = (): Entry[] => [...REGISTRY, juiceEntries.reconstituted, juiceEntries.single];

const PATTERNS: Record<string, { pattern: string; example: string }[]> = {
  juice_concentrate: [
    { pattern: '[fruit] juice concentrate', example: 'apple juice concentrate' },
    { pattern: 'concentrated [fruit] juice', example: 'concentrated white grape juice' },
  ],
  juice_from_concentrate: [{ pattern: '[fruit] juice from concentrate', example: 'apple juice from concentrate' }],
  single_strength_juice: [
    { pattern: '[fruit] juice', example: 'apple juice' },
    { pattern: '[fruit] juice not from concentrate', example: 'orange juice not from concentrate' },
  ],
};

/** Ingredients whose sugar counts as added only when they sweeten another food (policy.ts CONCENTRATES). */
const CONCENTRATES = new Set(['juice_concentrate', 'juice_from_concentrate', 'puree_concentrate']);

const CLASS_LABEL: Record<IngredientClass, string> = {
  added_sugar: 'Added sugar',
  non_sugar_sweetener: 'Non-sugar sweetener',
  sugar_alcohol: 'Sugar alcohol (polyol). Not drinking alcohol.',
  rare_sugar: 'Rare sugar',
  naturally_occurring_sugar: 'Naturally occurring sugar (comes with a whole food)',
  other_carbohydrate: 'Other carbohydrate. Not sugar.',
  context_dependent: 'Depends on how it is used',
  drinking_alcohol: 'Drinking alcohol',
  non_sweet: 'Common ingredient with no sweetening role',
};

/** Completes "Sugar Depth's registry files X under ...". Written to read right for singular and plural names. */
const CLASS_PHRASE: Record<IngredientClass, string> = {
  added_sugar: 'added sugars: sugars, syrups, honey and juice concentrates used to sweeten',
  non_sugar_sweetener: 'non-sugar sweeteners',
  sugar_alcohol: 'sugar alcohols (polyols), which are not drinking alcohol',
  rare_sugar: 'rare sugars',
  naturally_occurring_sugar: 'naturally occurring sugar: sugar that comes with a whole food such as milk or fruit',
  other_carbohydrate: 'other carbohydrates (starches, maltodextrin and fibers), which are not sugar',
  context_dependent: 'ingredients that depend on their form and on the rest of the product',
  drinking_alcohol: 'drinking alcohol: the ethanol in beer, wine and spirits',
  non_sweet: 'common ingredients with no sweetening role',
};

const LABELING: Record<Entry['labeling'], { label: string; sentence: string }> = {
  counted_as_added_sugar: { label: 'Counted as added sugar', sentence: 'US labels count it as added sugar, on the Added Sugars line of the Nutrition Facts panel.' },
  counted_as_total_sugar_only: { label: 'Counted as total sugar only, not as added sugar', sentence: 'US labels count its sugar in Total Sugars, but not as added sugar.' },
  not_counted_as_sugar: { label: 'Not counted as sugar', sentence: 'US labels do not count it as sugar.' },
  depends: { label: 'Depends on how it is used', sentence: 'How US labels count it depends on how it is used.' },
};

/** Mid-sentence form of a registry name: "Rice syrup" -> "rice syrup", "Acesulfame K" -> "acesulfame K". */
export const inline = (name: string) => (/^[A-Z][a-z]/.test(name) ? name[0].toLowerCase() + name.slice(1) : name);

/** Registry notes are written for developers; say the same thing without file names. */
export const publicNote = (note: string | undefined) =>
  note
    ?.replace('(policy.ts decides from the rest of the list)', '(Sugar Depth decides from the rest of the ingredient list)')
    .replace('(assumption, see open items)', "(an assumption in Sugar Depth's rules, not a regulatory class)");

const label = (ingredients_text: string, over: Partial<LiteralLabel> = {}): LiteralLabel => ({
  is_food_label: true,
  is_readable: true,
  ingredients_text,
  ingredients_complete: true,
  total_sugars_g: null,
  added_sugars_g: null,
  quantity_basis: 'unknown',
  serving_size_text: null,
  abv_text: null,
  ...over,
});

/** The wording a probe label uses for this entry: its first alias, or an example of its juice pattern. */
export const probeName = (e: Entry) => e.aliases[0] ?? PATTERNS[e.id]?.[0].example;

/** Runs one probe label through the real rules. A RETRY means the probe is broken, so it throws. */
function probe(e: Entry, when: string, text: string, over: Partial<LiteralLabel> = {}): Outcome {
  const r = evaluate(label(text, over));
  if (r.status !== 'decided') throw new Error(`Probe for ${e.id} ("${text}") gave ${r.verdict} (${r.ruleId})`);
  return { when, verdict: r.verdict as ShownVerdict, rule: r.ruleId };
}

/** What the rules do with this ingredient, as probe labels the policy actually evaluated. */
export function outcomesFor(e: Entry): Outcome[] {
  const name = probeName(e);
  if (!name) throw new Error(`No alias or pattern to probe ${e.id}`);
  const perServing = { quantity_basis: 'per_serving' as const };
  const sugarCases = (text: string, lead: string): Outcome[] => [
    probe(e, `${lead} and the panel shows more than ${MAX_OKAY_ADDED_G} g of added sugar per serving`, text, { ...perServing, added_sugars_g: MAX_OKAY_ADDED_G + 1 }),
    probe(e, `${lead} and the grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml`, text),
    probe(e, `${lead} and the panel shows ${MAX_OKAY_ADDED_G} g or less of added sugar per serving, including a printed 0 g`, text, { ...perServing, added_sugars_g: MAX_OKAY_ADDED_G }),
  ];
  if (CONCENTRATES.has(e.id)) {
    return [
      ...sugarCases(`oats, ${name}`, 'It sweetens another food,'),
      probe(e, 'The product is made only of fruit or vegetable juice or puree (water, acids, vitamins, flavors and similar extras are fine)', name),
    ];
  }
  if (e.treatment === 'added_sugar') return sugarCases(name, 'It is listed,');
  if (e.cls === 'drinking_alcohol') {
    return [
      probe(e, `It is listed and the label has no "${MAX_NON_ALCOHOLIC_ABV}% ABV or less" or non-alcoholic statement`, name),
      probe(e, `It is listed, but the label says non-alcoholic or ${MAX_NON_ALCOHOLIC_ABV}% ABV or less`, name, { abv_text: 'Non-alcoholic' }),
    ];
  }
  if (e.treatment === 'bad') return [probe(e, 'It is listed anywhere in the ingredients', name)];
  if (e.treatment === 'okay') return [probe(e, 'It is listed, and nothing on the label earns a stricter verdict', name)];
  if (e.treatment === 'clean_ok') return [probe(e, 'It is on a complete ingredient list with no added sugar, sweetener or alcohol', name)];
  throw new Error(`No probe for ${e.id} (${e.treatment})`);
}

export function groupFor(e: Entry): Group {
  if (e.treatment === 'needs_context') return 'depends';
  if (e.treatment === 'clean_ok') return e.cls !== 'non_sweet' || e.note ? 'clean_sweet' : 'clean_plain';
  return e.treatment;
}

export function headlineFor(e: Entry): Headline {
  switch (e.treatment) {
    case 'added_sugar': return { word: 'BAD or OKAY', tone: 'mixed', label: 'Added sugar: the grams per serving decide' };
    case 'bad': return { word: 'BAD', tone: 'bad', label: 'BAD' };
    case 'okay': return { word: 'OKAY', tone: 'okay', label: 'OKAY' };
    case 'clean_ok': return { word: 'CLEAN', tone: 'clean', label: 'Allowed in CLEAN' };
    case 'needs_context': return { word: 'Depends', tone: 'mixed', label: 'Depends on the rest of the label' };
  }
}

function classLabelFor(e: Entry) {
  if (e.cls === 'non_sugar_sweetener') return `Non-sugar sweetener (${e.subtype === 'plant' ? 'plant-derived' : 'artificial'})`;
  return CLASS_LABEL[e.cls];
}

function classPhraseFor(e: Entry) {
  if (e.cls === 'non_sugar_sweetener') return e.subtype === 'plant' ? 'non-sugar sweeteners, plant-derived' : 'non-sugar sweeteners, artificial';
  return CLASS_PHRASE[e.cls];
}

export function sourcesFor(e: Entry): string[] {
  // The FDA definition of added sugars is what every "counted / not counted" line rests on.
  const keys = ['addedSugarsRule'];
  if (CONCENTRATES.has(e.id) || ['lactose_added', 'milk', 'fruit', 'fruit_puree', 'single_strength_juice'].includes(e.id)) keys.push('addedSugarsQA');
  if (e.id === 'allulose') keys.push('allulose');
  if (e.cls === 'rare_sugar') keys.push('rareSugars');
  if (e.id === 'maltodextrin') keys.push('maltodextrin');
  if (e.id === 'resistant_maltodextrin') keys.push('fiber');
  if (e.codes?.length) keys.push('euAdditives');
  return keys;
}

const names = (n: number) => (n === 1 ? '1 label name' : `${n} label names`);

/** Longest generated meta description, in characters. */
export const MAX_DESCRIPTION = 180;

const listOf = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs.join(''));

function copyFor(e: Entry, codes: string[]): Pick<IngredientPage, 'title' | 'description' | 'summary'> {
  const code = codes.length ? ` (${codes[0]})` : '';
  const n = e.aliases.length;
  const brand = 'Sugar Depth';
  // What it is and what it gets, as a phrase that follows "<Name> on food labels: ".
  let what: string;
  let title: string;
  let summary: string;
  switch (groupFor(e)) {
    case 'added_sugar':
      what = e.cls === 'rare_sugar' ? 'a rare sugar that US labels count as added sugar' : 'added sugar';
      title = `${e.name} on food labels: added sugar${n > 1 ? ` under ${n} names` : ''}`;
      summary = `${e.cls === 'rare_sugar' ? 'A rare sugar that US labels count as added sugar' : 'Added sugar'}. ${brand} knows ${names(n)} for it, and the grams of added sugar per serving decide between OKAY and BAD.`;
      break;
    case 'bad':
      if (e.cls === 'drinking_alcohol') {
        what = `drinking alcohol, BAD on ${brand} above ${MAX_NON_ALCOHOLIC_ABV}% ABV`;
        title = `${e.name} on food and drink labels: BAD on ${brand} above ${MAX_NON_ALCOHOLIC_ABV}% ABV`;
        summary = `Drinking alcohol. BAD on ${brand} unless the label says non-alcoholic or ${MAX_NON_ALCOHOLIC_ABV}% ABV or less.`;
      } else {
        what = `an artificial sweetener, BAD on ${brand}`;
        title = `${e.name}${code} on food labels: an artificial sweetener, BAD on ${brand}`;
        summary = `An artificial sweetener. Not counted as sugar on US labels, and BAD on ${brand}.`;
      }
      break;
    case 'okay': {
      const kind = e.cls === 'sugar_alcohol' ? 'a sugar alcohol' : e.cls === 'rare_sugar' ? 'a rare sugar' : 'a plant sweetener';
      what = `${kind}, OKAY on ${brand}`;
      title = `${e.name}${code} on food labels: ${kind}, OKAY on ${brand}`;
      summary = `${kind[0].toUpperCase()}${kind.slice(1)}${e.cls === 'sugar_alcohol' ? ', not drinking alcohol' : ''}. Not counted as sugar on US labels, and OKAY on ${brand}.`;
      break;
    }
    case 'depends':
      what = 'added sugar when it sweetens another food, natural sugar in a product made only of fruit or juice';
      title = `${e.name} on food labels: when it counts as added sugar`;
      summary = 'Added sugar when it sweetens another food. Natural sugar in a product made only of fruit or juice.';
      break;
    default: {
      const kind = e.cls === 'naturally_occurring_sugar' ? 'natural sugar, not added sugar' : e.cls === 'other_carbohydrate' ? 'a carbohydrate, not sugar' : 'no sweetening role';
      what = `${kind}, allowed in CLEAN on ${brand}`;
      title = `${e.name} on food labels: ${kind}, allowed in CLEAN`;
      summary = `${kind[0].toUpperCase()}${kind.slice(1)}. ${brand} ${n ? `knows ${names(n)} for it and ` : ''}allows it in CLEAN.`;
    }
  }
  // Kept near search-snippet length: up to two other names, dropped when they would run long.
  const tail = n > 2 ? `All ${n} label names and the rule that applies.` : 'The US label treatment and the rule that applies.';
  const describe = (others: string[]) => `${e.name} on food labels: ${what}.${others.length ? ` Also listed as ${listOf(others)}.` : ''} ${tail}`;
  const others = e.aliases.filter((x) => x !== e.name.toLowerCase());
  const description = [2, 1, 0].map((k) => describe(others.slice(0, k))).find((d, i) => d.length <= MAX_DESCRIPTION || i === 2)!;
  return { title, description, summary };
}

export function buildIngredientData(): IngredientData {
  const entries = allEntries();
  const pages = entries.map((e): IngredientPage => {
    const codes = (e.codes ?? []).map((c) => c.replace(/^e/, 'E'));
    const patterns = PATTERNS[e.id] ?? [];
    for (const p of patterns) {
      const hit = matchEntry(normalizeKey(p.example)).entry;
      if (hit?.id !== e.id) throw new Error(`Pattern example "${p.example}" resolves to ${hit?.id ?? 'nothing'}, not ${e.id}`);
    }
    const group = groupFor(e);
    const note = publicNote(e.note);
    return {
      id: e.id,
      slug: slugFor(e),
      name: e.name,
      cls: e.cls,
      ...(e.subtype ? { subtype: e.subtype } : {}),
      labeling: e.labeling,
      treatment: e.treatment,
      group,
      classLabel: classLabelFor(e),
      classSentence: `Sugar Depth's registry files ${inline(e.name)} under ${classPhraseFor(e)}.`,
      labelingLabel: LABELING[e.labeling].label,
      labelingSentence: LABELING[e.labeling].sentence,
      verdict: headlineFor(e),
      outcomes: outcomesFor(e),
      aliases: [...e.aliases],
      codes,
      patterns,
      ...(note ? { note } : {}),
      sources: sourcesFor(e),
      related: [],
      ...copyFor(e, codes),
    };
  });
  // Related: up to six neighbours from the same group, starting after this entry so links spread evenly.
  for (const p of pages) {
    const peers = pages.filter((o) => o.group === p.group).map((o) => o.slug);
    const at = peers.indexOf(p.slug);
    p.related = [...peers.slice(at + 1), ...peers.slice(0, at)].slice(0, 6);
  }
  const slugs = new Set<string>();
  for (const p of pages) {
    if (slugs.has(p.slug)) throw new Error(`Two registry entries share the slug "${p.slug}"`);
    slugs.add(p.slug);
  }
  return {
    policyVersion: POLICY_VERSION,
    registryVersion: REGISTRY_VERSION,
    maxOkayAddedG: MAX_OKAY_ADDED_G,
    addedSugarAliasCount: pages.filter((p) => p.treatment === 'added_sugar').reduce((n, p) => n + p.aliases.length, 0),
    pages,
  };
}

export const serialize = (data: IngredientData) => `${JSON.stringify(data, null, 1)}\n`;
