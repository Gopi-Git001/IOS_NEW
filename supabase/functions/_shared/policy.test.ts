// Run with: npm run test:rules
// Table-driven tests for the staged rules pipeline (registry -> normalize -> classify -> policy).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REGISTRY } from './ingredients.ts';
import { codeOf, matchEntry, normalizeKey, parseIngredients } from './normalize.ts';
import { classify, evaluate, type LiteralLabel, POLICY_VERSION } from './policy.ts';

const label = (ingredients_text: string | null, over: Partial<LiteralLabel> = {}): LiteralLabel => ({
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

type Case = { name: string; label: LiteralLabel; verdict: 'CLEAN' | 'BAD' | 'UGLY' | null; rule: string; triggers?: string[] };

const CASES: Case[] = [
  // Pure plant sweeteners (Rules v2: BAD, no GOOD tier)
  { name: 'pure stevia', label: label('Carbonated Water, Natural Flavor, Stevia Leaf Extract'), verdict: 'BAD', rule: 'B2-plant-sweetener', triggers: ['stevia'] },
  { name: 'pure monk fruit', label: label('Water, Citric Acid, Monk Fruit Extract'), verdict: 'BAD', rule: 'B2-plant-sweetener', triggers: ['monk_fruit'] },
  { name: 'stevia and monk fruit', label: label('Water, Stevia, Luo Han Guo Extract'), verdict: 'BAD', rule: 'B2-plant-sweetener', triggers: ['stevia', 'monk_fruit'] },
  { name: 'steviol glycosides by code', label: label('Water, Citric Acid, E960'), verdict: 'BAD', rule: 'B2-plant-sweetener', triggers: ['stevia'] },
  { name: 'thaumatin', label: label('Water, Thaumatin'), verdict: 'BAD', rule: 'B2-plant-sweetener', triggers: ['thaumatin'] },
  // Stevia does not override anything worse
  { name: 'stevia plus dextrose', label: label('Dextrose, Stevia Leaf Extract, Silica'.replace(', Silica', '')), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['dextrose'] },
  { name: 'monk fruit plus erythritol', label: label('Erythritol, Monk Fruit Extract'), verdict: 'UGLY', rule: 'U4-erythritol-xylitol', triggers: ['erythritol'] },
  { name: 'stevia plus sucralose', label: label('Water, Stevia, Sucralose'), verdict: 'UGLY', rule: 'U3-artificial-sweetener', triggers: ['sucralose'] },
  // Added sugar with 0, positive or unknown grams
  { name: 'added sugar, 0 g on panel', label: label('Oats, Sugar, Salt', { added_sugars_g: 0, quantity_basis: 'per_serving' }), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['sugar'] },
  { name: 'added sugar, 6 g on panel', label: label('Oats, Cane Sugar, Salt', { added_sugars_g: 6, quantity_basis: 'per_serving' }), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['sugar'] },
  { name: 'added sugar, grams unknown', label: label('Oats, Honey, Salt'), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['honey'] },
  { name: 'panel added sugar, none listed', label: label('Oats, Salt', { added_sugars_g: 2, quantity_basis: 'per_serving' }), verdict: 'UGLY', rule: 'U2-panel-added-sugar', triggers: [] },
  { name: 'panel added sugar, no ingredient list', label: label(null, { added_sugars_g: 12, quantity_basis: 'per_100g' }), verdict: 'UGLY', rule: 'U2-panel-added-sugar', triggers: [] },
  // Every artificial sweetener
  ...['Sucralose', 'Aspartame', 'Acesulfame Potassium', 'Ace-K', 'Saccharin', 'Sodium Saccharin', 'Cyclamate', 'Neotame', 'Advantame', 'Neohesperidin DC', 'E 955', 'INS 951', 'E-950'].map((s) => ({
    name: `artificial: ${s}`, label: label(`Water, ${s}`), verdict: 'UGLY' as const, rule: 'U3-artificial-sweetener',
  })),
  // Every sugar alcohol
  { name: 'erythritol', label: label('Almond Flour, Erythritol'), verdict: 'UGLY', rule: 'U4-erythritol-xylitol', triggers: ['erythritol'] },
  { name: 'xylitol by code', label: label('Gum Base, E967'), verdict: 'UGLY', rule: 'U4-erythritol-xylitol', triggers: ['xylitol'] },
  ...['Sorbitol', 'Maltitol', 'Maltitol Syrup', 'Mannitol', 'Isomalt', 'Lactitol', 'Polyglycitol Syrup', 'E420', 'E965'].map((s) => ({
    name: `sugar alcohol: ${s}`, label: label(`Gum Base, ${s}`), verdict: 'BAD' as const, rule: 'B1-sugar-alcohol',
  })),
  // Rare sugars
  { name: 'allulose', label: label('Almonds, Allulose, Salt'), verdict: 'BAD', rule: 'B3-allulose', triggers: ['allulose'] },
  { name: 'tagatose (FDA counts as sugar)', label: label('Cocoa, Tagatose'), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['tagatose'] },
  { name: 'isomaltulose', label: label('Water, Isomaltulose'), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['isomaltulose'] },
  // Maltodextrin vs resistant maltodextrin
  { name: 'maltodextrin alone is not sugar', label: label('Maltodextrin, Natural Flavors, Salt'), verdict: 'CLEAN', rule: 'C1-nothing-sweet-added' },
  { name: 'resistant maltodextrin is fiber', label: label('Water, Resistant Maltodextrin, Citric Acid'), verdict: 'CLEAN', rule: 'C1-nothing-sweet-added' },
  { name: 'maltodextrin plus sucralose', label: label('Maltodextrin, Sucralose'), verdict: 'UGLY', rule: 'U3-artificial-sweetener', triggers: ['sucralose'] },
  // Fruit context
  { name: 'whole and dried fruit', label: label('Dates, Almonds, Cocoa'), verdict: 'CLEAN', rule: 'C1-nothing-sweet-added' },
  { name: 'fruit puree', label: label('Banana Puree, Apple Puree, Ascorbic Acid'), verdict: 'CLEAN', rule: 'C1-nothing-sweet-added' },
  { name: 'single-strength juice', label: label('Apple Juice, Ascorbic Acid'), verdict: 'CLEAN', rule: 'C1-nothing-sweet-added' },
  { name: 'juice concentrate is added sugar', label: label('Oats, Apple Juice Concentrate, Cinnamon'), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['juice_concentrate'] },
  { name: 'concentrated grape juice', label: label('Oats, Concentrated White Grape Juice'), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['juice_concentrate'] },
  { name: 'juice from concentrate needs context', label: label('Orange Juice From Concentrate'), verdict: null, rule: 'A6-needs-context' },
  { name: 'puree concentrate needs context', label: label('Oats, Strawberry Puree Concentrate'), verdict: null, rule: 'A6-needs-context' },
  // Lactose
  { name: 'lactose in milk is natural', label: label('Cultured Pasteurized Milk, Live and Active Cultures'), verdict: 'CLEAN', rule: 'C1-nothing-sweet-added' },
  { name: 'added lactose', label: label('Potato Flakes, Lactose, Salt'), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['lactose_added'] },
  // Nested blends, aliases, codes, duplicates
  { name: 'stevia blend hides erythritol', label: label('Water, Stevia Blend (Erythritol, Stevia Leaf Extract [Reb A]), Natural Flavors'), verdict: 'UGLY', rule: 'U4-erythritol-xylitol', triggers: ['erythritol'] },
  { name: 'monk fruit blend', label: label('Monk Fruit Sweetener (Erythritol, Monk Fruit Extract)'), verdict: 'UGLY', rule: 'U4-erythritol-xylitol', triggers: ['erythritol'] },
  { name: 'chocolate chips hide sugar', label: label('Almonds, Chocolate Chips (Unsweetened Chocolate, Cane Sugar, Cocoa Butter), Sea Salt'), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['sugar'] },
  { name: 'sweetener with child', label: label('Water, Sweetener (Sucralose)'), verdict: 'UGLY', rule: 'U3-artificial-sweetener', triggers: ['sucralose'] },
  { name: 'organic modifier stripped', label: label('Organic Oats, Organic Coconut Sugar'), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['sugar'] },
  { name: 'and/or split', label: label('Wheat Flour, Sugar and/or Dextrose'), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['sugar', 'dextrose'] },
  { name: 'contains 2% or less lead-in', label: label('Water, Contains 2% or less of: Citric Acid, Stevia'), verdict: 'BAD', rule: 'B2-plant-sweetener', triggers: ['stevia'] },
  { name: 'duplicates merge', label: label('Sugar, Oats, Sugar, SUGAR.'), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['sugar'] },
  { name: 'non-sweetener E-number', label: label('Water, E330, Salt'), verdict: 'CLEAN', rule: 'C1-nothing-sweet-added' },
  { name: 'qualifier child', label: label('Sugar (Cane), Salt'), verdict: 'UGLY', rule: 'U1-added-sugar', triggers: ['sugar'] },
  // Unresolved
  { name: 'unknown sweet-sounding ingredient', label: label('Water, Yacon Syrup'), verdict: null, rule: 'A5-unknown-ingredient' },
  { name: 'bare "sweetener"', label: label('Water, Sweetener, Citric Acid'), verdict: null, rule: 'A5-unknown-ingredient' },
  { name: 'unknown sweetener E-number in range', label: label('Water, E963'), verdict: null, rule: 'A5-unknown-ingredient' },
  { name: 'unknown non-sweet ingredient does not block CLEAN', label: label('Water, Spirulina'), verdict: 'CLEAN', rule: 'C1-nothing-sweet-added' },
  // Incomplete and missing
  { name: 'incomplete list, nothing sweet seen', label: label('Water, Salt', { ingredients_complete: false }), verdict: null, rule: 'A4-incomplete-list' },
  { name: 'incomplete list, stevia seen', label: label('Water, Stevia', { ingredients_complete: false }), verdict: null, rule: 'A4-incomplete-list' },
  { name: 'incomplete list, sugar seen', label: label('Water, Sugar', { ingredients_complete: false }), verdict: 'UGLY', rule: 'U1-added-sugar' },
  { name: 'no ingredient list, 0 g added', label: label(null, { added_sugars_g: 0, quantity_basis: 'per_serving' }), verdict: null, rule: 'A3-no-ingredient-list' },
  { name: 'not a label', label: label(null, { is_food_label: false }), verdict: null, rule: 'A1-not-a-label' },
  { name: 'unreadable', label: label('Sugar', { is_readable: false }), verdict: null, rule: 'A2-unreadable' },
  // Contradictory
  { name: 'panel 0 g but sugar listed', label: label('Sugar, Water', { added_sugars_g: 0, quantity_basis: 'per_serving' }), verdict: 'UGLY', rule: 'U1-added-sugar' },
  { name: 'panel 3 g but nothing listed', label: label('Water, Salt', { added_sugars_g: 3, quantity_basis: 'per_serving' }), verdict: 'UGLY', rule: 'U2-panel-added-sugar' },
  // Drinking alcohol (Rules v2) vs sugar alcohol
  { name: 'beer', label: label('Water, Barley, Hops, Yeast', { abv_text: '5% ABV' }), verdict: 'UGLY', rule: 'U5-drinking-alcohol' },
  { name: 'wine as ingredient', label: label('Tomatoes, Red Wine, Salt'), verdict: 'UGLY', rule: 'U5-drinking-alcohol' },
  { name: 'wine vinegar is not alcohol', label: label('Tomatoes, Red Wine Vinegar, Salt'), verdict: 'CLEAN', rule: 'C1-nothing-sweet-added' },
  // Plain CLEAN
  { name: 'plain clean', label: label('Water, Sea Salt, Lemon'), verdict: 'CLEAN', rule: 'C1-nothing-sweet-added' },
  // Boundaries: any amount counts; tiny positive panel value
  { name: 'boundary 0.1 g added', label: label('Water, Salt', { added_sugars_g: 0.1, quantity_basis: 'per_serving' }), verdict: 'UGLY', rule: 'U2-panel-added-sugar' },
  { name: 'boundary negative grams ignored', label: label('Water, Salt', { added_sugars_g: -2 as number }), verdict: 'CLEAN', rule: 'C1-nothing-sweet-added' },
];

for (const c of CASES) {
  test(`policy: ${c.name}`, () => {
    const ev = evaluate(c.label);
    assert.equal(ev.verdict, c.verdict, `${c.name}: verdict (${ev.ruleId}: ${ev.explanation})`);
    assert.equal(ev.ruleId, c.rule, `${c.name}: rule`);
    assert.equal(ev.status, c.verdict ? 'decided' : 'unresolved');
    assert.equal(ev.policyVersion, POLICY_VERSION);
    if (c.triggers) assert.deepEqual(ev.triggers.map((t) => t.id).sort(), [...c.triggers].sort(), `${c.name}: triggers`);
    // Explanations must agree with the classification: each trigger's literal text appears in it.
    for (const t of ev.triggers) assert.ok(ev.explanation.includes(t.literal), `${c.name}: explanation names ${t.literal}`);
    // Determinism.
    assert.deepEqual(evaluate(c.label), ev);
  });
}

test('registry: aliases and codes are unique and lowercase-normalized', () => {
  const seen = new Map<string, string>();
  for (const e of REGISTRY) {
    for (const a of e.aliases) {
      assert.equal(a, normalizeKey(a), `alias "${a}" is normalized`);
      assert.ok(!seen.has(a), `alias "${a}" in ${seen.get(a)} and ${e.id}`);
      seen.set(a, e.id);
    }
  }
});

test('registry: no entry is both sugar and sweetener; identities match expectations', () => {
  const cls = (k: string) => matchEntry(normalizeKey(k)).entry?.cls ?? null;
  assert.equal(cls('Sucralose'), 'non_sugar_sweetener'); // not added sugar
  assert.equal(cls('Erythritol'), 'sugar_alcohol'); // not drinking alcohol
  assert.equal(cls('Allulose'), 'rare_sugar'); // not ignored, not treated as sugar
  assert.equal(cls('Maltodextrin'), 'other_carbohydrate');
  assert.equal(cls('Resistant Maltodextrin'), 'other_carbohydrate');
  assert.notEqual(matchEntry('maltodextrin').entry?.id, matchEntry('resistant maltodextrin').entry?.id);
  assert.equal(cls('Lactose'), 'added_sugar');
  assert.equal(cls('Whole Milk'), 'naturally_occurring_sugar');
  assert.equal(cls('Banana Puree'), 'naturally_occurring_sugar');
  assert.equal(cls('Strawberry Puree Concentrate'), 'context_dependent');
});

test('normalize: no substring matching', () => {
  assert.equal(matchEntry('sugar alcohol').entry, null);
  assert.equal(matchEntry('sugar snap peas').entry, null);
  assert.equal(matchEntry('maltodextrin powder').entry, null);
  assert.equal(matchEntry('stevia-ish flavor').entry, null);
});

test('normalize: case, punctuation, codes and footnotes', () => {
  assert.equal(normalizeKey('  CANE  SUGAR*. '), 'cane sugar');
  assert.equal(normalizeKey('Crème'), 'creme');
  assert.equal(codeOf('e 955'), 'e955');
  assert.equal(codeOf('ins-960a'), 'e960a');
  assert.equal(codeOf('sugar'), null);
});

test('parse: keeps printed text, nests brackets, splits lists', () => {
  const items = parseIngredients('Ingredients: Water, Stevia Blend (Erythritol, Stevia Leaf Extract [Reb A]), Salt.');
  assert.deepEqual(items.map((i) => i.literal), ['Water', 'Stevia Blend', 'Salt']);
  assert.deepEqual(items[1].children.map((i) => i.literal), ['Erythritol', 'Stevia Leaf Extract']);
  assert.deepEqual(items[1].children[1].children.map((i) => i.literal), ['Reb A']);
  // "Mono and Diglycerides" stays whole; "Salt and Pepper" style splits only when both parts are known.
  assert.deepEqual(parseIngredients('Mono and Diglycerides').map((i) => i.literal), ['Mono and Diglycerides']);
  assert.deepEqual(parseIngredients('Sugar and Salt').map((i) => i.literal), ['Sugar', 'Salt']);
});

test('quantities: kept separate, basis kept, missing stays null', () => {
  const ev = evaluate(label('Oats, Sugar', { total_sugars_g: 9, added_sugars_g: 6, quantity_basis: 'per_serving', serving_size_text: '1 cup (40g)' }));
  assert.deepEqual(ev.quantity, { totalSugarsG: 9, addedSugarsG: 6, basis: 'per_serving', servingSize: '1 cup (40g)' });
  const unknown = evaluate(label('Oats, Sugar'));
  assert.equal(unknown.quantity.addedSugarsG, null);
  assert.ok(unknown.missing.includes('added_sugars_grams'));
  assert.ok(unknown.missing.includes('total_sugars_grams'));
  const noBasis = evaluate(label('Oats, Sugar', { added_sugars_g: 4 }));
  assert.ok(noBasis.missing.includes('quantity_basis'));
});

test('warnings: rounding note and contradiction are exposed', () => {
  assert.match(evaluate(label('Sugar', { added_sugars_g: 0, quantity_basis: 'per_serving' })).warnings[0], /round/);
  assert.match(evaluate(label('Water', { added_sugars_g: 3, quantity_basis: 'per_serving' })).warnings[0], /no added sugar was identified/);
});

test('unknown non-sweet ingredients are reported, not hidden', () => {
  const ev = evaluate(label('Water, Spirulina'));
  assert.deepEqual(ev.unresolved, ['Spirulina']);
});

test('classify keeps the printed text and blend path', () => {
  const c = classify('Stevia Blend (Erythritol, Stevia Leaf Extract)');
  assert.equal(c.found.sugar_alcohol[0].literal, 'Erythritol');
  assert.deepEqual(c.found.sugar_alcohol[0].path, ['Stevia Blend']);
});
