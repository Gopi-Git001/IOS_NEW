// Stages 3-4: classification summary and the single ordered verdict function (Rules v2).
// Deterministic: the same literal label always gives the same output. No model judgment here.
//
// Rules v2, approved by the user (Nov 6, 2026, re-confirmed the same day):
//   UGLY  any added sugar of any type (no gram cutoff), any artificial sweetener, erythritol or
//         xylitol, or drinking alcohol
//   BAD   no UGLY trigger, but stevia, monk fruit, thaumatin, allulose, or another sugar alcohol
//   CLEAN complete ingredient list with nothing sweet added (sugar that comes with milk or fruit is fine)
//   There is no GOOD tier in v2.
//
// Order (first match wins):
//   A1-A2  not a label / unreadable                         -> unresolved, retake
//   U1-U5  a confirmed UGLY trigger                          -> UGLY (a cut-off list can only hide more, never less)
//   A3-A5  no list, cut-off list, or an unknown that may sweeten -> unresolved
//   A6     an ingredient whose treatment needs context        -> unresolved
//   B1-B3  sugar alcohol / plant sweetener / allulose        -> BAD
//   C1     complete list, nothing sweet                       -> CLEAN
import { type Entry, type IngredientClass, REGISTRY_VERSION } from './ingredients.ts';
import { parseIngredients, type Resolved, resolveAll } from './normalize.ts';

export const POLICY_VERSION = 'rules-v2.1';

export type Verdict = 'CLEAN' | 'BAD' | 'UGLY';

export type QuantityBasis = 'per_serving' | 'per_100g' | 'per_100ml' | 'unknown';

/** Stage 1 output: what the label literally says. The extraction model fills this and nothing else. */
export type LiteralLabel = {
  is_food_label: boolean;
  is_readable: boolean;
  /** The ingredient list exactly as printed, or null if no ingredient list is visible. */
  ingredients_text: string | null;
  /** False when the ingredient list runs off the photo or part of it can't be read. */
  ingredients_complete: boolean;
  /** Numbers exactly as printed on the nutrition panel; null when not visible. Never estimated. */
  total_sugars_g: number | null;
  added_sugars_g: number | null;
  quantity_basis: QuantityBasis;
  serving_size_text: string | null;
  /** Alcohol by volume as printed (e.g. "5% ABV"), or null. */
  abv_text: string | null;
};

export type Evidence = {
  literal: string;
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
  status: 'decided' | 'unresolved';
  verdict: Verdict | null;
  /** True when a clearer or wider photo could resolve it. */
  retake: boolean;
  policyVersion: string;
  registryVersion: string;
  ruleId: string;
  /** Ingredients that triggered the rule. */
  triggers: Evidence[];
  /** Every classified sweet-relevant ingredient, deduplicated by registry id (first printed form wins). */
  found: Record<'added_sugar' | 'non_sugar_sweetener' | 'sugar_alcohol' | 'rare_sugar' | 'naturally_occurring_sugar' | 'other_carbohydrate' | 'context_dependent' | 'drinking_alcohol', Evidence[]>;
  unresolved: string[];
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
  literal: r.literal, path: r.path, id: r.entry!.id, name: r.entry!.name, cls: r.entry!.cls,
  subtype: r.entry!.subtype, treatment: r.entry!.treatment, labeling: r.entry!.labeling, note: r.entry!.note,
});

const names = (ev: Evidence[]) => ev.map((e) => e.literal).join(', ');

/** Stages 2-3 only: parse and classify, no verdict. Exported for tests and debugging. */
export function classify(text: string) {
  const resolved = resolveAll(parseIngredients(text));
  const found = Object.fromEntries(SWEET_CLASSES.map((c) => [c, [] as Evidence[]])) as Evaluation['found'];
  const seen = new Set<string>();
  for (const r of resolved) {
    if (!r.entry || r.entry.cls === 'non_sweet') continue;
    if (seen.has(r.entry.id)) continue;
    seen.add(r.entry.id);
    found[r.entry.cls as keyof Evaluation['found']].push(toEvidence(r));
  }
  const unknown = resolved.filter((r) => !r.entry && r.via === 'none');
  return {
    found,
    sweetUnknowns: unknown.filter((r) => r.sweetSignal).map((r) => r.literal),
    otherUnknowns: unknown.filter((r) => !r.sweetSignal).map((r) => r.literal),
    all: resolved,
  };
}

/** The one ordered verdict function. */
export function evaluate(label: LiteralLabel): Evaluation {
  const quantity = {
    totalSugarsG: num(label.total_sugars_g),
    addedSugarsG: num(label.added_sugars_g),
    basis: (['per_serving', 'per_100g', 'per_100ml'] as const).includes(label.quantity_basis as never) ? label.quantity_basis : 'unknown' as QuantityBasis,
    servingSize: label.serving_size_text?.trim() || null,
  };
  const text = label.ingredients_text?.trim() || '';
  const c = text ? classify(text) : null;
  const found = c?.found ?? (Object.fromEntries(SWEET_CLASSES.map((k) => [k, []])) as unknown as Evaluation['found']);
  const missing: string[] = [];
  const warnings: string[] = [];
  if (!text) missing.push('ingredient_list');
  else if (!label.ingredients_complete) missing.push('ingredient_list_incomplete');
  if (quantity.addedSugarsG === null) missing.push('added_sugars_grams');
  if (quantity.totalSugarsG === null) missing.push('total_sugars_grams');
  if (quantity.basis === 'unknown' && (quantity.addedSugarsG !== null || quantity.totalSugarsG !== null)) missing.push('quantity_basis');

  const base = {
    policyVersion: POLICY_VERSION, registryVersion: REGISTRY_VERSION, found, quantity, missing, warnings,
    unresolved: [...(c?.sweetUnknowns ?? []), ...(c?.otherUnknowns ?? [])],
  };
  const unresolved = (ruleId: string, retake: boolean, explanation: string): Evaluation =>
    ({ ...base, status: 'unresolved', verdict: null, retake, ruleId, triggers: [], explanation });
  const decided = (verdict: Verdict, ruleId: string, triggers: Evidence[], explanation: string): Evaluation =>
    ({ ...base, status: 'decided', verdict, retake: false, ruleId, triggers, explanation });

  // A1-A2: can't evaluate at all.
  if (!label.is_food_label) return unresolved('A1-not-a-label', true, "This doesn't look like a food label.");
  if (!label.is_readable) return unresolved('A2-unreadable', true, "The ingredient text isn't clear enough to read.");

  // Classification facts used below.
  const addedSugars = [...found.added_sugar, ...found.rare_sugar.filter((e) => e.treatment === 'ugly')];
  const artificial = found.non_sugar_sweetener.filter((e) => e.subtype === 'artificial');
  const riskyPolyols = found.sugar_alcohol.filter((e) => e.treatment === 'ugly');
  const alcohol = found.drinking_alcohol;
  const panelAdded = quantity.addedSugarsG;

  if (addedSugars.length && panelAdded === 0) {
    warnings.push('The panel shows 0 g added sugars, but an added sugar is listed. US labels may round amounts under 0.5 g down to 0.');
  }

  // U1-U5: confirmed UGLY triggers. A cut-off list can only hide more, so these stand even if incomplete.
  if (addedSugars.length) return decided('UGLY', 'U1-added-sugar', addedSugars, `Contains added sugar: ${names(addedSugars)}.`);
  if (panelAdded !== null && panelAdded > 0) {
    if (text && label.ingredients_complete) {
      warnings.push(`The panel shows ${panelAdded} g added sugars, but no added sugar was identified in the ingredient list.`);
    }
    return decided('UGLY', 'U2-panel-added-sugar', [], `The nutrition panel shows ${panelAdded} g added sugars${quantity.basis === 'per_100g' ? ' per 100 g' : quantity.basis === 'per_100ml' ? ' per 100 ml' : quantity.basis === 'per_serving' ? ' per serving' : ''}.`);
  }
  if (artificial.length) return decided('UGLY', 'U3-artificial-sweetener', artificial, `Contains an artificial sweetener: ${names(artificial)}.`);
  if (riskyPolyols.length) return decided('UGLY', 'U4-erythritol-xylitol', riskyPolyols, `Contains ${names(riskyPolyols)}, a sugar alcohol QuickGOB rates UGLY.`);
  if (alcohol.length || label.abv_text?.trim()) {
    return decided('UGLY', 'U5-drinking-alcohol', alcohol, alcohol.length ? `Contains drinking alcohol: ${names(alcohol)}.` : `Contains drinking alcohol (${label.abv_text!.trim()}).`);
  }

  // A3-A6: nothing UGLY confirmed, but we can't rule it out.
  if (!text) return unresolved('A3-no-ingredient-list', true, 'No ingredient list is visible, so sweeteners can\'t be ruled out.');
  if (!label.ingredients_complete) return unresolved('A4-incomplete-list', true, 'Part of the ingredient list is cut off or unreadable.');
  if (c!.sweetUnknowns.length) return unresolved('A5-unknown-ingredient', false, `Not sure what ${c!.sweetUnknowns.join(', ')} is, so this can't be rated yet.`);
  if (found.context_dependent.length) return unresolved('A6-needs-context', false, `${names(found.context_dependent)} may or may not count as added sugar; the label doesn't say which.`);

  // B1-B3: BAD.
  if (found.sugar_alcohol.length) return decided('BAD', 'B1-sugar-alcohol', found.sugar_alcohol, `No added sugar, but contains a sugar alcohol: ${names(found.sugar_alcohol)}.`);
  const plant = found.non_sugar_sweetener.filter((e) => e.subtype === 'plant');
  if (plant.length) return decided('BAD', 'B2-plant-sweetener', plant, `No added sugar, but sweetened with ${names(plant)}.`);
  const softRare = found.rare_sugar.filter((e) => e.treatment === 'bad');
  if (softRare.length) return decided('BAD', 'B3-allulose', softRare, `No added sugar, but sweetened with ${names(softRare)}.`);

  // C1: CLEAN.
  return decided('CLEAN', 'C1-nothing-sweet-added', [], found.naturally_occurring_sugar.length
    ? `No added sugar or sweetener. Sugar here comes with ${names(found.naturally_occurring_sugar)}.`
    : 'No added sugar or sweetener in the ingredient list.');
}
