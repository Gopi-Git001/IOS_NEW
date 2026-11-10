// Run with: npm run test:rules
// Table-driven tests for the staged rules pipeline (registry -> normalize -> classify -> policy).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REGISTRY } from './ingredients.ts';
import { codeOf, matchEntry, normalizeKey, parseIngredients } from './normalize.ts';
import { classify, evaluate, isAlcoholic, type LiteralLabel, POLICY_VERSION } from './policy.ts';

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

type Case = { name: string; label: LiteralLabel; verdict: 'CLEAN' | 'OKAY' | 'BAD' | 'RETRY'; rule: string; triggers?: string[] };

const perServing = (g: number): Partial<LiteralLabel> => ({ added_sugars_g: g, quantity_basis: 'per_serving' });

const CASES: Case[] = [
  // Pure plant sweeteners (Rules v3: OKAY)
  { name: 'pure stevia', label: label('Carbonated Water, Natural Flavor, Stevia Leaf Extract'), verdict: 'OKAY', rule: 'O3-plant-sweetener', triggers: ['stevia'] },
  { name: 'pure monk fruit', label: label('Water, Citric Acid, Monk Fruit Extract'), verdict: 'OKAY', rule: 'O3-plant-sweetener', triggers: ['monk_fruit'] },
  { name: 'stevia and monk fruit', label: label('Water, Stevia, Luo Han Guo Extract'), verdict: 'OKAY', rule: 'O3-plant-sweetener', triggers: ['stevia', 'monk_fruit'] },
  { name: 'steviol glycosides by code', label: label('Water, Citric Acid, E960'), verdict: 'OKAY', rule: 'O3-plant-sweetener', triggers: ['stevia'] },
  { name: 'thaumatin', label: label('Water, Thaumatin'), verdict: 'OKAY', rule: 'O3-plant-sweetener', triggers: ['thaumatin'] },
  // Stevia does not override anything worse
  { name: 'stevia plus dextrose, no grams', label: label('Dextrose, Stevia Leaf Extract'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['dextrose'] },
  { name: 'monk fruit plus erythritol', label: label('Erythritol, Monk Fruit Extract'), verdict: 'OKAY', rule: 'O2-sugar-alcohol', triggers: ['erythritol'] },
  { name: 'stevia plus sucralose', label: label('Water, Stevia, Sucralose'), verdict: 'BAD', rule: 'X3-artificial-sweetener', triggers: ['sucralose'] },
  // Added sugar graded by grams per serving
  { name: 'added sugar, 0 g on panel', label: label('Oats, Sugar, Salt', perServing(0)), verdict: 'OKAY', rule: 'O1-added-sugar-up-to-4g', triggers: ['sugar'] },
  { name: 'added sugar, 2 g on panel', label: label('Oats, Cane Sugar, Salt', perServing(2)), verdict: 'OKAY', rule: 'O1-added-sugar-up-to-4g', triggers: ['sugar'] },
  { name: 'added sugar, 4 g on panel', label: label('Oats, Cane Sugar, Salt', perServing(4)), verdict: 'OKAY', rule: 'O1-added-sugar-up-to-4g', triggers: ['sugar'] },
  { name: 'added sugar, 4.1 g on panel', label: label('Oats, Cane Sugar, Salt', perServing(4.1)), verdict: 'BAD', rule: 'X1-added-sugar-over-4g', triggers: ['sugar'] },
  { name: 'added sugar, 4.5 g on panel', label: label('Oats, Cane Sugar, Salt', perServing(4.5)), verdict: 'BAD', rule: 'X1-added-sugar-over-4g', triggers: ['sugar'] },
  { name: 'added sugar, 6 g on panel', label: label('Oats, Cane Sugar, Salt', perServing(6)), verdict: 'BAD', rule: 'X1-added-sugar-over-4g', triggers: ['sugar'] },
  { name: 'added sugar, grams unknown', label: label('Oats, Honey, Salt'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['honey'] },
  { name: 'added sugar, grams with no basis read as per serving', label: label('Oats, Honey', { added_sugars_g: 3 }), verdict: 'OKAY', rule: 'O1-added-sugar-up-to-4g', triggers: ['honey'] },
  { name: 'added sugar, only per 100 g grams', label: label('Oats, Sugar', { added_sugars_g: 3, quantity_basis: 'per_100g' }), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['sugar'] },
  { name: 'added sugar, only per 100 ml grams', label: label('Water, Sugar', { added_sugars_g: 3, quantity_basis: 'per_100ml' }), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['sugar'] },
  { name: 'panel added sugar, none listed', label: label('Oats, Salt', perServing(2)), verdict: 'OKAY', rule: 'O1-added-sugar-up-to-4g', triggers: [] },
  { name: 'panel added sugar, no ingredient list', label: label(null, { added_sugars_g: 12, quantity_basis: 'per_100g' }), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: [] },
  // Every artificial sweetener
  ...['Sucralose', 'Aspartame', 'Acesulfame Potassium', 'Ace-K', 'Saccharin', 'Sodium Saccharin', 'Cyclamate', 'Neotame', 'Advantame', 'Neohesperidin DC', 'E 955', 'INS 951', 'E-950'].map((s) => ({
    name: `artificial: ${s}`, label: label(`Water, ${s}`), verdict: 'BAD' as const, rule: 'X3-artificial-sweetener',
  })),
  // Every sugar alcohol (Rules v3: OKAY, erythritol and xylitol included)
  { name: 'erythritol', label: label('Almond Flour, Erythritol'), verdict: 'OKAY', rule: 'O2-sugar-alcohol', triggers: ['erythritol'] },
  { name: 'xylitol by code', label: label('Gum Base, E967'), verdict: 'OKAY', rule: 'O2-sugar-alcohol', triggers: ['xylitol'] },
  ...['Sorbitol', 'Maltitol', 'Maltitol Syrup', 'Mannitol', 'Isomalt', 'Lactitol', 'Polyglycitol Syrup', 'E420', 'E965'].map((s) => ({
    name: `sugar alcohol: ${s}`, label: label(`Gum Base, ${s}`), verdict: 'OKAY' as const, rule: 'O2-sugar-alcohol',
  })),
  // Rare sugars
  { name: 'allulose', label: label('Almonds, Allulose, Salt'), verdict: 'OKAY', rule: 'O2-sugar-alcohol', triggers: ['allulose'] },
  { name: 'tagatose (FDA counts as sugar)', label: label('Cocoa, Tagatose'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['tagatose'] },
  { name: 'isomaltulose', label: label('Water, Isomaltulose'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['isomaltulose'] },
  // Maltodextrin vs resistant maltodextrin
  { name: 'maltodextrin alone is not sugar', label: label('Maltodextrin, Natural Flavors, Salt'), verdict: 'CLEAN', rule: 'C1-clean' },
  { name: 'resistant maltodextrin is fiber', label: label('Water, Resistant Maltodextrin, Citric Acid'), verdict: 'CLEAN', rule: 'C1-clean' },
  { name: 'maltodextrin plus sucralose', label: label('Maltodextrin, Sucralose'), verdict: 'BAD', rule: 'X3-artificial-sweetener', triggers: ['sucralose'] },
  // Fruit context
  { name: 'whole and dried fruit', label: label('Dates, Almonds, Cocoa'), verdict: 'CLEAN', rule: 'C1-clean' },
  { name: 'fruit puree', label: label('Banana Puree, Apple Puree, Ascorbic Acid'), verdict: 'CLEAN', rule: 'C1-clean' },
  { name: 'single-strength juice', label: label('Apple Juice, Ascorbic Acid'), verdict: 'CLEAN', rule: 'C1-clean' },
  { name: 'juice concentrate sweetening oats is added sugar', label: label('Oats, Apple Juice Concentrate, Cinnamon'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['juice_concentrate'] },
  { name: 'concentrated grape juice sweetening oats', label: label('Oats, Concentrated White Grape Juice'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['juice_concentrate'] },
  { name: 'juice concentrate sweetening tea', label: label('Brewed Green Tea, Apple Juice Concentrate'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['juice_concentrate'] },
  { name: 'puree concentrate sweetening oats', label: label('Oats, Strawberry Puree Concentrate'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['puree_concentrate'] },
  { name: '100% juice from concentrate', label: label('Orange Juice From Concentrate'), verdict: 'CLEAN', rule: 'C1-clean' },
  { name: '100% juice: water and concentrate', label: label('Filtered Water, Apple Juice Concentrate, Ascorbic Acid (Vitamin C)'), verdict: 'CLEAN', rule: 'C1-clean' },
  { name: '100% juice blend with flavor', label: label('Water, Grape Juice Concentrate, Pear Juice Concentrate, Natural Flavors, Citric Acid'), verdict: 'CLEAN', rule: 'C1-clean' },
  { name: 'juice concentrate plus sugar', label: label('Water, Apple Juice Concentrate, Sugar'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['juice_concentrate', 'sugar'] },
  // Lactose
  { name: 'lactose in milk is natural', label: label('Cultured Pasteurized Milk, Live and Active Cultures'), verdict: 'CLEAN', rule: 'C1-clean' },
  { name: 'added lactose', label: label('Potato Flakes, Lactose, Salt'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['lactose_added'] },
  // Nested blends, aliases, codes, duplicates
  { name: 'stevia blend hides erythritol', label: label('Water, Stevia Blend (Erythritol, Stevia Leaf Extract [Reb A]), Natural Flavors'), verdict: 'OKAY', rule: 'O2-sugar-alcohol', triggers: ['erythritol'] },
  { name: 'monk fruit blend', label: label('Monk Fruit Sweetener (Erythritol, Monk Fruit Extract)'), verdict: 'OKAY', rule: 'O2-sugar-alcohol', triggers: ['erythritol'] },
  { name: 'chocolate chips hide sugar', label: label('Almonds, Chocolate Chips (Unsweetened Chocolate, Cane Sugar, Cocoa Butter), Sea Salt'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['sugar'] },
  { name: 'sweetener with child', label: label('Water, Sweetener (Sucralose)'), verdict: 'BAD', rule: 'X3-artificial-sweetener', triggers: ['sucralose'] },
  { name: 'organic modifier stripped', label: label('Organic Oats, Organic Coconut Sugar'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['sugar'] },
  { name: 'and/or split', label: label('Wheat Flour, Sugar and/or Dextrose'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['sugar', 'dextrose'] },
  { name: 'contains 2% or less lead-in', label: label('Water, Contains 2% or less of: Citric Acid, Stevia'), verdict: 'OKAY', rule: 'O3-plant-sweetener', triggers: ['stevia'] },
  { name: 'duplicates merge', label: label('Sugar, Oats, Sugar, SUGAR.'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['sugar'] },
  { name: 'non-sweetener E-number', label: label('Water, E330, Salt'), verdict: 'CLEAN', rule: 'C1-clean' },
  { name: 'qualifier child', label: label('Sugar (Cane), Salt'), verdict: 'BAD', rule: 'X2-added-sugar-no-grams', triggers: ['sugar'] },
  // Unknown ingredients that may sweeten: OKAY, and logged
  { name: 'unknown sweet-sounding ingredient', label: label('Water, Yacon Syrup'), verdict: 'OKAY', rule: 'O4-unknown-sweetener' },
  { name: 'bare "sweetener"', label: label('Water, Sweetener, Citric Acid'), verdict: 'OKAY', rule: 'O4-unknown-sweetener' },
  { name: 'unknown sweetener E-number in range', label: label('Water, E963'), verdict: 'OKAY', rule: 'O4-unknown-sweetener' },
  { name: 'unknown sweetener never softens a worse one', label: label('Water, Yacon Syrup, Sucralose'), verdict: 'BAD', rule: 'X3-artificial-sweetener', triggers: ['sucralose'] },
  { name: 'unknown non-sweet ingredient does not block CLEAN', label: label('Water, Spirulina'), verdict: 'CLEAN', rule: 'C1-clean' },
  // RETRY: incomplete and missing
  { name: 'incomplete list, nothing sweet seen', label: label('Water, Salt', { ingredients_complete: false }), verdict: 'RETRY', rule: 'R4-incomplete-list' },
  { name: 'incomplete list, stevia seen', label: label('Water, Stevia', { ingredients_complete: false }), verdict: 'RETRY', rule: 'R4-incomplete-list' },
  { name: 'incomplete list, sugar seen', label: label('Water, Sugar', { ingredients_complete: false }), verdict: 'BAD', rule: 'X2-added-sugar-no-grams' },
  { name: 'no ingredient list, 0 g added', label: label(null, perServing(0)), verdict: 'RETRY', rule: 'R3-no-ingredient-list' },
  { name: 'not a label', label: label(null, { is_food_label: false }), verdict: 'RETRY', rule: 'R1-not-food' },
  { name: 'unreadable', label: label('Sugar', { is_readable: false }), verdict: 'RETRY', rule: 'R2-unreadable' },
  // Contradictory
  { name: 'panel 0 g but sugar listed', label: label('Sugar, Water', perServing(0)), verdict: 'OKAY', rule: 'O1-added-sugar-up-to-4g' },
  { name: 'panel 3 g but nothing listed', label: label('Water, Salt', perServing(3)), verdict: 'OKAY', rule: 'O1-added-sugar-up-to-4g' },
  // Drinking alcohol above 0.5% ABV vs sugar alcohol and "non-alcoholic" claims
  { name: 'beer', label: label('Water, Barley, Hops, Yeast', { abv_text: '5% ABV' }), verdict: 'BAD', rule: 'X4-alcohol' },
  { name: 'wine as ingredient', label: label('Tomatoes, Red Wine, Salt'), verdict: 'BAD', rule: 'X4-alcohol', triggers: ['drinking_alcohol'] },
  { name: 'wine vinegar is not alcohol', label: label('Tomatoes, Red Wine Vinegar, Salt'), verdict: 'CLEAN', rule: 'C1-clean' },
  ...['<0.5% ABV', '< 0.5% alc/vol', 'Less than 0.5% alcohol by volume', '0.0%', '0.0% ABV', '0.5% ABV or less', 'Alc. 0.5% vol', 'Non-alcoholic', 'Non-Alcoholic Brew', 'Alcohol-free', 'Alcohol free'].map((abv) => ({
    name: `not alcohol: "${abv}"`, label: label('Water, Barley, Hops, Yeast', { abv_text: abv }), verdict: 'CLEAN' as const, rule: 'C1-clean',
  })),
  // Malted barley is the brewing grain, not sugar; malt syrup and malt extract are added sugar.
  { name: 'non-alcoholic beer with malted barley', label: label('Water, Malted Barley, Hops, Yeast', { abv_text: '<0.5% ABV' }), verdict: 'CLEAN', rule: 'C1-clean' },
  { name: 'non-alcoholic beer with barley malt', label: label('Water, Barley Malt, Hops, Yeast', { abv_text: '0.0%' }), verdict: 'CLEAN', rule: 'C1-clean' },
  { name: 'beer with malted barley is still alcohol', label: label('Water, Malted Barley, Hops, Yeast', { abv_text: '5% ABV' }), verdict: 'BAD', rule: 'X4-alcohol' },
  ...['Malt Syrup', 'Malt Extract', 'Barley Malt Syrup', 'Barley Malt Extract'].map((s) => ({
    name: `${s} is added sugar`, label: label(`Oats, ${s}, Salt`), verdict: 'BAD' as const, rule: 'X2-added-sugar-no-grams', triggers: ['malt_syrup'],
  })),
  { name: 'malt extract at 2 g per serving', label: label('Oats, Malt Extract, Salt', perServing(2)), verdict: 'OKAY', rule: 'O1-added-sugar-up-to-4g', triggers: ['malt_syrup'] },
  { name: 'beer listed with a <0.5% claim', label: label('Dealcoholized Beer (Water, Barley, Hops), Beer', { abv_text: '<0.5% ABV' }), verdict: 'CLEAN', rule: 'C1-clean' },
  { name: '0.6% ABV is alcohol', label: label('Water, Barley, Hops', { abv_text: '0.6% ABV' }), verdict: 'BAD', rule: 'X4-alcohol' },
  { name: 'European comma decimal', label: label('Water, Barley, Hops', { abv_text: '4,5 % vol' }), verdict: 'BAD', rule: 'X4-alcohol' },
  { name: '"contains alcohol" with no number', label: label('Water, Barley, Hops', { abv_text: 'Contains alcohol' }), verdict: 'BAD', rule: 'X4-alcohol' },
  // Plain CLEAN
  { name: 'plain clean', label: label('Water, Sea Salt, Lemon'), verdict: 'CLEAN', rule: 'C1-clean' },
  // Boundaries: tiny positive panel value is still added sugar
  { name: 'boundary 0.1 g added', label: label('Water, Salt', perServing(0.1)), verdict: 'OKAY', rule: 'O1-added-sugar-up-to-4g' },
  { name: 'boundary negative grams ignored', label: label('Water, Salt', { added_sugars_g: -2 as number }), verdict: 'CLEAN', rule: 'C1-clean' },
];

for (const c of CASES) {
  test(`policy: ${c.name}`, () => {
    const ev = evaluate(c.label);
    assert.equal(ev.verdict, c.verdict, `${c.name}: verdict (${ev.ruleId}: ${ev.explanation})`);
    assert.equal(ev.ruleId, c.rule, `${c.name}: rule`);
    assert.equal(ev.status, c.verdict === 'RETRY' ? 'retry' : 'decided');
    assert.equal(ev.policyVersion, POLICY_VERSION);
    if (c.triggers) assert.deepEqual(ev.triggers.map((t) => t.id).sort(), [...c.triggers].sort(), `${c.name}: triggers`);
    // Explanations must agree with the classification: each trigger's literal text appears in it.
    for (const t of ev.triggers) assert.ok(ev.explanation.includes(t.literal), `${c.name}: explanation names ${t.literal}`);
    // Determinism.
    assert.deepEqual(evaluate(c.label), ev);
  });
}

test('isAlcoholic: above 0.5% ABV only', () => {
  for (const t of ['5% ABV', '0.51%', '12% alc./vol.', 'Contains alcohol']) assert.equal(isAlcoholic(t), true, t);
  for (const t of [null, '', '0.5%', '0.4% ABV', '<0.5%', '0.0%', 'non-alcoholic', 'alcohol-free', '0.5% ABV or less']) assert.equal(isAlcoholic(t), false, String(t));
});

test('unknown sweeteners are kept separately so they can be logged', () => {
  const ev = evaluate(label('Water, Yacon Syrup, Spirulina'));
  assert.deepEqual(ev.unknownSweeteners, ['Yacon Syrup']);
  assert.deepEqual(ev.unresolved, ['Yacon Syrup', 'Spirulina']);
});

test('classify: concentrates are natural in a juice product, added everywhere else', () => {
  const juice = classify('Water, Apple Juice Concentrate');
  assert.equal(juice.juiceProduct, true);
  assert.deepEqual(juice.found.naturally_occurring_sugar.map((e) => e.id), ['juice_concentrate']);
  assert.deepEqual(juice.found.added_sugar, []);
  const bar = classify('Oats, Apple Juice Concentrate');
  assert.equal(bar.juiceProduct, false);
  assert.deepEqual(bar.found.added_sugar.map((e) => e.id), ['juice_concentrate']);
  assert.deepEqual(bar.found.context_dependent, []);
});
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
  assert.equal(cls('Malted Barley'), 'non_sweet');
  assert.equal(cls('Barley Malt'), 'non_sweet');
  assert.equal(cls('Barley Malt Syrup'), 'added_sugar');
  assert.equal(cls('Malt Extract'), 'added_sugar');
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
