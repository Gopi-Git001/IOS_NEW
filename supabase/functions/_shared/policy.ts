// Stages 3-4: classification summary and the single ordered verdict function (Rules v3).
// Deterministic: the same literal label always gives the same output. No model judgment here.
//
// Rules v3, approved by the user (Nov 9, 2026). See RULES.md for the table.
//   BAD   more than 4 g added sugar per serving, added sugar with no per-serving grams, an artificial
//         sweetener, or drinking alcohol above 0.5% ABV
//   OKAY  4 g or less added sugar per serving, a sugar alcohol or allulose, stevia / monk fruit /
//         thaumatin, an unknown ingredient that may sweeten, or 2+ ingredients the registry doesn't know
//   CLEAN complete ingredient list with no added sugar, no sweetener and no alcohol
//   RETRY not a food label, unreadable, no ingredient list, or a cut-off list with nothing usable on it
//
// Order (first match wins):
//   R1-R2  not a label / unreadable                          -> RETRY
//   X1-X4  a confirmed BAD trigger                           -> BAD (a cut-off list can only hide more, never less)
//   R3     no ingredient list                                -> RETRY
//   O1-O3  a little added sugar, sugar alcohol, plant sweetener -> OKAY (seen on the photo, so it stands on a cut-off list too)
//   R4     cut-off list, nothing usable seen                  -> RETRY
//   O4-O5  unknown sweetener / 2+ unrecognised ingredients   -> OKAY
//   C1     complete list, nothing sweet                       -> CLEAN
import { type Entry, type IngredientClass, REGISTRY_VERSION } from './ingredients.ts';
import { baseKey, parseIngredients, type Resolved, resolveAll, translationsFrom } from './normalize.ts';

export const POLICY_VERSION = 'rules-v3';

export type Verdict = 'CLEAN' | 'OKAY' | 'BAD' | 'RETRY';
/** The verdicts a result panel can show; RETRY asks for another photo instead. */
export type ShownVerdict = Exclude<Verdict, 'RETRY'>;

/** Above this many grams of added sugar per serving the product is BAD. */
export const MAX_OKAY_ADDED_G = 4;
/** Above this ABV a drink counts as alcohol. */
export const MAX_NON_ALCOHOLIC_ABV = 0.5;
/** With this many ingredients the registry doesn't know, the product can't be called CLEAN. */
export const MAX_UNKNOWN_FOR_CLEAN = 2;

export type IngredientName = { printed: string; english: string };

export type QuantityBasis = 'per_serving' | 'per_100g' | 'per_100ml' | 'unknown';

/** Stage 1 output: what the label literally says. The extraction model fills this and nothing else. */
export type LiteralLabel = {
  is_food_label: boolean;
  is_readable: boolean;
  /** The ingredient list exactly as printed, or null if no ingredient list is visible. */
  ingredients_text: string | null;
  /** For a non-English list, each ingredient's printed name with its English name; null when the list is in English. */
  ingredients_english?: IngredientName[] | null;
  /** False when the ingredient list runs off the photo or part of it can't be read. */
  ingredients_complete: boolean;
  /** Numbers exactly as printed on the nutrition panel; null when not visible. Never estimated. */
  total_sugars_g: number | null;
  added_sugars_g: number | null;
  quantity_basis: QuantityBasis;
  serving_size_text: string | null;
  /** Alcohol content or claim as printed (e.g. "5% ABV", "<0.5% ABV", "Non-alcoholic"), or null. */
  abv_text: string | null;
};

export type Evidence = {
  literal: string;
  /** English name for a non-English printed name, when the reader gave one. */
  english?: string;
  path: string[];
  id: string;
  name: string;
  cls: IngredientClass;
  subtype?: 'artificial' | 'plant';
  treatment: Entry['treatment'];
  labeling: Entry['labeling'];
  note?: string;
};

export type Evaluation = {
  status: 'decided' | 'retry';
  verdict: Verdict;
  policyVersion: string;
  registryVersion: string;
  ruleId: string;
  /** Ingredients that triggered the rule. */
  triggers: Evidence[];
  /** Every classified sweet-relevant ingredient, one per printed name ("Organic Cane Sugar" and "Cane Sugar" are one; "Sugar" and "Brown Sugar Syrup" are two). */
  found: Record<'added_sugar' | 'non_sugar_sweetener' | 'sugar_alcohol' | 'rare_sugar' | 'naturally_occurring_sugar' | 'other_carbohydrate' | 'context_dependent' | 'drinking_alcohol', Evidence[]>;
  /** Every ingredient the registry doesn't know. */
  unresolved: string[];
  /** Unknown ingredients whose wording suggests they may sweeten (logged so the registry can grow). */
  unknownSweeteners: string[];
  quantity: { totalSugarsG: number | null; addedSugarsG: number | null; basis: QuantityBasis; servingSize: string | null };
  missing: string[];
  warnings: string[];
  explanation: string;
};

const SWEET_CLASSES = [
  'added_sugar', 'non_sugar_sweetener', 'sugar_alcohol', 'rare_sugar', 'naturally_occurring_sugar',
  'other_carbohydrate', 'context_dependent', 'drinking_alcohol',
] as const;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

const toEvidence = (r: Resolved): Evidence => ({
  literal: r.literal, ...(r.english ? { english: r.english } : {}), path: r.path, id: r.entry!.id, name: r.entry!.name, cls: r.entry!.cls,
  subtype: r.entry!.subtype, treatment: r.entry!.treatment, labeling: r.entry!.labeling, note: r.entry!.note,
});

const names = (ev: Evidence[]) => ev.map((e) => e.literal).join(', ');

const CONCENTRATES = new Set(['juice_concentrate', 'juice_from_concentrate', 'puree_concentrate']);
const FRUIT_AND_JUICE = new Set([...CONCENTRATES, 'single_strength_juice', 'fruit', 'fruit_puree', 'vegetable']);
const JUICE_EXTRAS = new Set(['water', 'acids', 'minerals_vitamins', 'preservatives', 'colors', 'gums', 'salt']);

/**
 * A product made only of fruit / vegetable juice or puree (plus water, flavors, acids, vitamins and the like).
 * Its concentrates aren't sweetening another food, so they aren't added sugar.
 */
function isJuiceProduct(all: Resolved[]) {
  const fits = (r: Resolved) =>
    r.via === 'additive_code' ||
    (r.entry !== null && (FRUIT_AND_JUICE.has(r.entry.id) || JUICE_EXTRAS.has(r.entry.id) || (r.entry.id === 'flavors' && /flavou?r/.test(r.key))));
  return all.length > 0 && all.every(fits) && all.some((r) => r.entry !== null && FRUIT_AND_JUICE.has(r.entry.id));
}

/** Stages 2-3 only: parse and classify, no verdict. Exported for tests and debugging. */
export function classify(text: string, english?: IngredientName[] | null) {
  const resolved = resolveAll(parseIngredients(text), [], translationsFrom(english));
  const juiceProduct = isJuiceProduct(resolved);
  const found = Object.fromEntries(SWEET_CLASSES.map((c) => [c, [] as Evidence[]])) as Evaluation['found'];
  const seen = new Set<string>();
  for (const r of resolved) {
    if (!r.entry || r.entry.cls === 'non_sweet') continue;
    const name = `${r.entry.id}|${baseKey(r.key)}`;
    if (seen.has(name)) continue;
    seen.add(name);
    const ev = toEvidence(r);
    if (CONCENTRATES.has(ev.id)) {
      found[juiceProduct ? 'naturally_occurring_sugar' : 'added_sugar'].push({ ...ev, treatment: juiceProduct ? 'clean_ok' : 'added_sugar' });
    } else {
      found[ev.cls as keyof Evaluation['found']].push(ev);
    }
  }
  const unknown = resolved.filter((r) => !r.entry && r.via === 'none');
  return {
    found,
    juiceProduct,
    sweetUnknowns: unknown.filter((r) => r.sweetSignal).map((r) => r.literal),
    otherUnknowns: unknown.filter((r) => !r.sweetSignal).map((r) => r.literal),
    all: resolved,
  };
}

const NO_ALCOHOL_CLAIM =
  /non[-\s]?alcoholic|alcohol[-\s]?free|\bno alcohol\b|de-?alcoholi[sz]ed|<\s*0?[.,]5|less than 0?[.,]5|0?[.,]5\s*%?\s*(?:abv|alc\.?\s*\/?\s*vol\.?|alcohol by volume)?\s*or less/i;

/** True when the printed alcohol text means a drink above 0.5% ABV. "<0.5%", "0.0%" and "non-alcoholic" are not alcohol. */
export function isAlcoholic(abvText: string | null | undefined): boolean {
  const text = abvText?.trim();
  if (!text) return false;
  if (NO_ALCOHOL_CLAIM.test(text)) return false;
  const pct = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pct) return Number(pct[1].replace(',', '.')) > MAX_NON_ALCOHOLIC_ABV;
  return true;
}

/** True when the printed alcohol text says the drink is 0.5% ABV or less. */
export const claimsNoAlcohol = (abvText: string | null | undefined) => {
  const text = abvText?.trim();
  return Boolean(text) && !isAlcoholic(text);
};

/** The one ordered verdict function. */
export function evaluate(label: LiteralLabel): Evaluation {
  const quantity = {
    totalSugarsG: num(label.total_sugars_g),
    addedSugarsG: num(label.added_sugars_g),
    basis: (['per_serving', 'per_100g', 'per_100ml'] as const).includes(label.quantity_basis as never) ? label.quantity_basis : 'unknown' as QuantityBasis,
    servingSize: label.serving_size_text?.trim() || null,
  };
  const text = label.ingredients_text?.trim() || '';
  const c = text ? classify(text, label.ingredients_english) : null;
  const found = c?.found ?? (Object.fromEntries(SWEET_CLASSES.map((k) => [k, []])) as unknown as Evaluation['found']);
  const missing: string[] = [];
  const warnings: string[] = [];
  if (!text) missing.push('ingredient_list');
  else if (!label.ingredients_complete) missing.push('ingredient_list_incomplete');
  if (quantity.addedSugarsG === null) missing.push('added_sugars_grams');
  if (quantity.totalSugarsG === null) missing.push('total_sugars_grams');
  if (quantity.basis === 'unknown' && (quantity.addedSugarsG !== null || quantity.totalSugarsG !== null)) missing.push('quantity_basis');

  const unknownSweeteners = c?.sweetUnknowns ?? [];
  const base = {
    policyVersion: POLICY_VERSION, registryVersion: REGISTRY_VERSION, found, quantity, missing, warnings,
    unresolved: [...unknownSweeteners, ...(c?.otherUnknowns ?? [])], unknownSweeteners,
  };
  const retry = (ruleId: string, explanation: string): Evaluation =>
    ({ ...base, status: 'retry', verdict: 'RETRY', ruleId, triggers: [], explanation });
  const decided = (verdict: ShownVerdict, ruleId: string, triggers: Evidence[], explanation: string): Evaluation =>
    ({ ...base, status: 'decided', verdict, ruleId, triggers, explanation });

  // R1-R2: can't evaluate at all.
  if (!label.is_food_label) return retry('R1-not-food', "This doesn't look like a food label.");
  if (!label.is_readable) return retry('R2-unreadable', "The ingredient text isn't clear enough to read.");

  // Classification facts used below.
  const addedSugars = [...found.added_sugar, ...found.rare_sugar.filter((e) => e.treatment === 'added_sugar')];
  const artificial = found.non_sugar_sweetener.filter((e) => e.subtype === 'artificial');
  const noAlcoholClaim = claimsNoAlcohol(label.abv_text);
  const alcohol = noAlcoholClaim ? [] : found.drinking_alcohol;
  const alcoholic = isAlcoholic(label.abv_text) || alcohol.length > 0;
  const panelAdded = quantity.addedSugarsG;
  // US "Added Sugars" lines are per serving; an unlabeled basis is read the same way. Per 100 g / 100 ml is not per serving.
  const servingAdded = panelAdded !== null && (quantity.basis === 'per_serving' || quantity.basis === 'unknown') ? panelAdded : null;
  const hasAdded = addedSugars.length > 0 || (panelAdded !== null && panelAdded > 0);
  const per = quantity.basis === 'per_100g' ? ' per 100 g' : quantity.basis === 'per_100ml' ? ' per 100 ml' : ' per serving';

  if (addedSugars.length && panelAdded === 0) {
    warnings.push('The panel shows 0 g added sugars, but an added sugar is listed. US labels may round amounts under 0.5 g down to 0.');
  }
  if (!addedSugars.length && panelAdded !== null && panelAdded > 0 && text && label.ingredients_complete) {
    warnings.push(`The panel shows ${panelAdded} g added sugars, but no added sugar was identified in the ingredient list.`);
  }

  // X1-X4: confirmed BAD triggers. A cut-off list can only hide more, so these stand even if incomplete.
  if (hasAdded && servingAdded !== null && servingAdded > MAX_OKAY_ADDED_G) {
    return decided('BAD', 'X1-added-sugar-over-4g', addedSugars, `${servingAdded} g added sugar per serving${addedSugars.length ? ` (${names(addedSugars)})` : ''}.`);
  }
  if (hasAdded && servingAdded === null) {
    return decided('BAD', 'X2-added-sugar-no-grams', addedSugars, addedSugars.length
      ? `Contains added sugar (${names(addedSugars)}) and the grams per serving can't be read.`
      : `The nutrition panel shows ${panelAdded} g added sugars${per}, but not per serving.`);
  }
  if (artificial.length) return decided('BAD', 'X3-artificial-sweetener', artificial, `Contains an artificial sweetener: ${names(artificial)}.`);
  if (alcoholic) {
    return decided('BAD', 'X4-alcohol', alcohol, alcohol.length ? `Contains drinking alcohol: ${names(alcohol)}.` : `Contains drinking alcohol (${label.abv_text!.trim()}).`);
  }

  // R3: nothing BAD confirmed and no list to look at.
  if (!text) return retry('R3-no-ingredient-list', 'No ingredient list is visible, so sweeteners can\'t be ruled out.');

  // O1-O3: OKAY. What is printed on the photo counts even when part of the list is cut off.
  if (hasAdded) return decided('OKAY', 'O1-added-sugar-up-to-4g', addedSugars, `${servingAdded} g added sugar per serving${addedSugars.length ? ` (${names(addedSugars)})` : ''}.`);
  const softRare = found.rare_sugar.filter((e) => e.treatment === 'okay');
  if (found.sugar_alcohol.length || softRare.length) {
    const soft = [...found.sugar_alcohol, ...softRare];
    return decided('OKAY', 'O2-sugar-alcohol', soft, `No added sugar, but sweetened with ${names(soft)}.`);
  }
  const plant = found.non_sugar_sweetener.filter((e) => e.subtype === 'plant');
  if (plant.length) return decided('OKAY', 'O3-plant-sweetener', plant, `No added sugar, but sweetened with ${names(plant)}.`);

  // R4: a cut-off list with nothing usable on it can't rule anything out.
  if (!label.ingredients_complete) return retry('R4-incomplete-list', 'Part of the ingredient list is cut off or unreadable.');

  // O4-O5: OKAY because the rules can't vouch for every ingredient.
  if (unknownSweeteners.length) return decided('OKAY', 'O4-unknown-sweetener', [], `Not sure what ${unknownSweeteners.join(', ')} is; it may be a sweetener.`);
  if (base.unresolved.length >= MAX_UNKNOWN_FOR_CLEAN) {
    return decided('OKAY', 'O5-unrecognised-ingredients', [], `Couldn't check ${base.unresolved.length} ingredients: ${base.unresolved.join(', ')}.`);
  }

  // C1: CLEAN.
  return decided('CLEAN', 'C1-clean', [], found.naturally_occurring_sugar.length
    ? `No added sugar or sweetener. Sugar here comes with ${names(found.naturally_occurring_sugar)}.`
    : 'No added sugar or sweetener in the ingredient list.');
}
