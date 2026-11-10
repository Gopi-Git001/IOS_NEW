// One test per verdict rule in policy.ts (Rules v3, RULES.md), checked through rules.ts decide(): the verdict,
// the rule id, and the three lists the app shows. Pure: no network.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { evaluate, type LiteralLabel } from '../../supabase/functions/_shared/policy.ts';
import { decide, type ScanResult } from '../../supabase/functions/_shared/rules.ts';

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

const perServing = (grams: number): Partial<LiteralLabel> => ({ added_sugars_g: grams, quantity_basis: 'per_serving' });

function decided(l: LiteralLabel): ScanResult & { rule: string } {
  const d = decide(l);
  assert.equal(d.status, 'decided', `expected a verdict, got ${d.evaluation.ruleId}: ${d.evaluation.explanation}`);
  if (d.status !== 'decided') throw new Error('unreachable');
  return { ...d.result, rule: d.evaluation.ruleId };
}

function retry(l: LiteralLabel) {
  const d = decide(l);
  assert.equal(d.status, 'retry', `expected RETRY, got ${d.evaluation.verdict} (${d.evaluation.ruleId})`);
  if (d.status !== 'retry') throw new Error('unreachable');
  assert.equal(d.evaluation.verdict, 'RETRY');
  return { rule: d.evaluation.ruleId, message: d.message };
}

const lists = (r: ScanResult) => ({ natural: r.naturalSugars, added: r.addedSugars, sweeteners: r.sweeteners });

describe('one test per verdict rule', () => {
  test('R1 not a food label: RETRY', () => {
    assert.deepEqual(retry(label(null, { is_food_label: false })), { rule: 'R1-not-food', message: "This doesn't look like a food label." });
  });

  test('R2 unreadable: RETRY even when sugar is visible', () => {
    assert.equal(retry(label('Sugar, Water', { is_readable: false })).rule, 'R2-unreadable');
  });

  test('X1 more than 4 g added sugar per serving: BAD, grams listed', () => {
    const r = decided(label('Oats, Cane Sugar', perServing(6)));
    assert.equal(r.verdict, 'BAD');
    assert.equal(r.rule, 'X1-added-sugar-over-4g');
    assert.equal(r.headline, 'Too much added sugar');
    assert.deepEqual(r.addedSugars, ['Cane Sugar', '6 g added per serving']);
    assert.equal(r.note, undefined);
  });

  test('X2 added sugar with no grams: BAD, asks for the panel', () => {
    const r = decided(label('Carbonated Water, High Fructose Corn Syrup'));
    assert.equal(r.verdict, 'BAD');
    assert.equal(r.rule, 'X2-added-sugar-no-grams');
    assert.equal(r.headline, 'Added sugar');
    assert.deepEqual(lists(r), { natural: [], added: ['High Fructose Corn Syrup'], sweeteners: [] });
    assert.equal(r.note, 'Scan the nutrition panel to see the grams');
  });

  test('X2 grams per 100 g only: BAD, and not turned into a per-serving line', () => {
    const r = decided(label('Oats, Cane Sugar', { added_sugars_g: 12, quantity_basis: 'per_100g' }));
    assert.equal(r.verdict, 'BAD');
    assert.equal(r.rule, 'X2-added-sugar-no-grams');
    assert.deepEqual(r.addedSugars, ['Cane Sugar']);
  });

  test('X3 artificial sweetener: BAD, listed under Sweeteners, never Added sugars', () => {
    const r = decided(label('Carbonated Water, Aspartame, Acesulfame Potassium'));
    assert.equal(r.verdict, 'BAD');
    assert.equal(r.rule, 'X3-artificial-sweetener');
    assert.equal(r.headline, 'Artificial sweeteners');
    assert.deepEqual(lists(r), { natural: [], added: [], sweeteners: ['Aspartame', 'Acesulfame Potassium'] });
  });

  test('X4 alcohol above 0.5% ABV: BAD', () => {
    const r = decided(label('Water, Barley, Hops, Yeast', { abv_text: '5% ABV' }));
    assert.equal(r.verdict, 'BAD');
    assert.equal(r.rule, 'X4-alcohol');
    assert.equal(r.headline, 'Contains alcohol');
  });

  test('R3 no ingredient list: RETRY', () => {
    assert.equal(retry(label(null, perServing(0))).rule, 'R3-no-ingredient-list');
  });

  test('R4 cut-off list with nothing BAD seen: RETRY', () => {
    assert.equal(retry(label('Water, Salt', { ingredients_complete: false })).rule, 'R4-incomplete-list');
  });

  test('O1 4 g or less added sugar per serving: OKAY, grams listed', () => {
    const r = decided(label('Oats, Cane Sugar', perServing(3)));
    assert.equal(r.verdict, 'OKAY');
    assert.equal(r.rule, 'O1-added-sugar-up-to-4g');
    assert.equal(r.headline, 'A little added sugar');
    assert.deepEqual(r.addedSugars, ['Cane Sugar', '3 g added per serving']);
  });

  test('O2 sugar alcohol: OKAY, shown as a sugar alcohol', () => {
    const r = decided(label('Cocoa, Maltitol'));
    assert.equal(r.verdict, 'OKAY');
    assert.equal(r.rule, 'O2-sugar-alcohol');
    assert.equal(r.headline, 'Contains sugar alcohols');
    assert.deepEqual(lists(r), { natural: [], added: [], sweeteners: ['Maltitol (sugar alcohol)'] });
  });

  test('O2 allulose: OKAY, listed under Sweeteners', () => {
    const r = decided(label('Almonds, Allulose'));
    assert.equal(r.verdict, 'OKAY');
    assert.equal(r.rule, 'O2-sugar-alcohol');
    assert.deepEqual(lists(r), { natural: [], added: [], sweeteners: ['Allulose'] });
  });

  test('O3 plant sweetener only: OKAY', () => {
    const r = decided(label('Water, Monk Fruit Extract'));
    assert.equal(r.verdict, 'OKAY');
    assert.equal(r.rule, 'O3-plant-sweetener');
    assert.equal(r.headline, 'Gentler sweetener');
    assert.equal(r.note, 'The gentlest option, but still a sweetener');
  });

  test('O4 unknown ingredient that may sweeten: OKAY, named and kept for logging', () => {
    const r = decided(label('Water, Yacon Syrup'));
    assert.equal(r.verdict, 'OKAY');
    assert.equal(r.rule, 'O4-unknown-sweetener');
    assert.deepEqual(r.sweeteners, ['Yacon Syrup']);
    assert.deepEqual(evaluate(label('Water, Yacon Syrup')).unknownSweeteners, ['Yacon Syrup']);
  });

  test('C1 nothing sweet added: CLEAN', () => {
    const r = decided(label('Water, Sea Salt, Citric Acid'));
    assert.equal(r.verdict, 'CLEAN');
    assert.equal(r.rule, 'C1-clean');
    assert.equal(r.headline, 'No added sugar');
    assert.equal(r.note, 'Great pick, no added sugar');
    assert.deepEqual(lists(r), { natural: [], added: [], sweeteners: [] });
  });
});

describe('natural vs added sugar', () => {
  test('sugar that comes with milk or fruit is natural and stays CLEAN', () => {
    const r = decided(label('Cultured Milk, Strawberries'));
    assert.equal(r.verdict, 'CLEAN');
    assert.deepEqual(lists(r), { natural: ['Cultured Milk', 'Strawberries'], added: [], sweeteners: [] });
  });

  test('100% juice is natural sugar', () => {
    const r = decided(label('Apple Juice'));
    assert.equal(r.verdict, 'CLEAN');
    assert.deepEqual(r.naturalSugars, ['Apple Juice']);
  });

  test('100% juice from concentrate is natural sugar, not added', () => {
    const r = decided(label('Filtered Water, Orange Juice Concentrate'));
    assert.equal(r.verdict, 'CLEAN');
    assert.deepEqual(lists(r), { natural: ['Orange Juice Concentrate'], added: [], sweeteners: [] });
  });

  test('natural and added sugar in one product land in separate lists', () => {
    const r = decided(label('Whole Milk, Banana Puree, Cane Sugar', perServing(6)));
    assert.equal(r.verdict, 'BAD');
    assert.deepEqual(r.naturalSugars, ['Whole Milk', 'Banana Puree']);
    assert.deepEqual(r.addedSugars, ['Cane Sugar', '6 g added per serving']);
  });

  test('juice concentrate sweetening another food counts as added sugar, not natural', () => {
    const r = decided(label('Oats, Apple Juice Concentrate'));
    assert.equal(r.verdict, 'BAD');
    assert.deepEqual(r.naturalSugars, []);
    assert.deepEqual(r.addedSugars, ['Apple Juice Concentrate']);
  });

  test('added lactose is added sugar; milk is natural', () => {
    assert.deepEqual(decided(label('Potato Flakes, Lactose')).addedSugars, ['Lactose']);
    assert.deepEqual(decided(label('Whole Milk')).addedSugars, []);
  });
});

describe('stevia only', () => {
  for (const s of ['Stevia', 'Stevia Leaf Extract', 'Reb M', 'Steviol Glycosides', 'E960']) {
    test(`${s} alone: OKAY, a sweetener, no added sugar`, () => {
      const r = decided(label(`Carbonated Water, ${s}, Citric Acid`));
      assert.equal(r.verdict, 'OKAY');
      assert.equal(r.rule, 'O3-plant-sweetener');
      assert.deepEqual(r.addedSugars, []);
      assert.equal(r.sweeteners.length, 1);
    });
  }

  test('stevia never softens added sugar: honey + stevia is BAD and both are listed', () => {
    const r = decided(label('Oats, Honey, Stevia'));
    assert.equal(r.verdict, 'BAD');
    assert.deepEqual(lists(r), { natural: [], added: ['Honey'], sweeteners: ['Stevia'] });
  });

  test('stevia never softens an artificial sweetener', () => {
    assert.equal(decided(label('Water, Stevia, Sucralose')).verdict, 'BAD');
  });
});

describe('sugar alcohols', () => {
  for (const s of ['Erythritol', 'Xylitol', 'Sorbitol', 'Maltitol', 'Mannitol', 'Isomalt', 'Lactitol']) {
    test(`${s}: OKAY, a sweetener with the sugar alcohol tag, never an added sugar`, () => {
      const r = decided(label(`Gum Base, ${s}`));
      assert.equal(r.verdict, 'OKAY');
      assert.deepEqual(r.addedSugars, []);
      assert.deepEqual(r.sweeteners, [`${s} (sugar alcohol)`]);
    });
  }

  test('a sugar alcohol is not drinking alcohol', () => {
    assert.notEqual(evaluate(label('Gum Base, Sorbitol')).ruleId, 'X4-alcohol');
  });
});

describe('drinking alcohol', () => {
  test('ABV printed with no alcohol ingredient: BAD', () => {
    assert.equal(decided(label('Water, Barley, Hops', { abv_text: '4.2% alc./vol.' })).rule, 'X4-alcohol');
  });

  for (const s of ['Rum', 'Alcohol', 'Red Wine']) {
    test(`${s} as an ingredient: BAD`, () => {
      assert.equal(decided(label(`Cream, ${s}, Salt`)).rule, 'X4-alcohol');
    });
  }

  for (const abv of ['<0.5% ABV', '0.0%', '0.5% ABV or less', 'Non-alcoholic', 'Alcohol-free']) {
    test(`"${abv}" beer is not alcohol: CLEAN`, () => {
      const r = decided(label('Water, Barley, Hops, Yeast', { abv_text: abv }));
      assert.equal(r.verdict, 'CLEAN');
      assert.equal(r.rule, 'C1-clean');
    });
  }

  test('wine vinegar is not alcohol', () => {
    assert.equal(decided(label('Tomatoes, Red Wine Vinegar, Salt')).verdict, 'CLEAN');
  });

  test('added sugar outranks alcohol in the rule order (both BAD)', () => {
    const r = decided(label('Carbonated Water, Cane Sugar, Alcohol', { abv_text: '5% ABV' }));
    assert.equal(r.verdict, 'BAD');
    assert.equal(r.rule, 'X2-added-sugar-no-grams');
  });
});

// The six spec checks that used to be `todo` (CLAUDE.md vs Rules v2), now real tests of the approved Rules v3.
describe('Rules v3 table (RULES.md, approved Nov 9, 2026)', () => {
  test('1 g added sugar per serving is OKAY', () => {
    assert.equal(decided(label('Oats, Cane Sugar', perServing(1))).verdict, 'OKAY');
  });

  test('2 g added sugar per serving is OKAY', () => {
    assert.equal(decided(label('Oats, Cane Sugar', perServing(2))).verdict, 'OKAY');
  });

  test('4 g added sugar per serving is OKAY', () => {
    assert.equal(decided(label('Oats, Cane Sugar', perServing(4))).verdict, 'OKAY');
  });

  test('added sugar with grams not shown is BAD', () => {
    assert.equal(decided(label('Oats, Honey')).verdict, 'BAD');
  });

  test('erythritol is OKAY', () => {
    assert.equal(decided(label('Water, Erythritol')).verdict, 'OKAY');
  });

  test('xylitol is OKAY', () => {
    assert.equal(decided(label('Gum Base, Xylitol')).verdict, 'OKAY');
  });

  test('over 4 g added sugar per serving is BAD (4.5 g and 5 g)', () => {
    assert.equal(decided(label('Oats, Cane Sugar', perServing(4.5))).verdict, 'BAD');
    assert.equal(decided(label('Oats, Cane Sugar', perServing(5))).verdict, 'BAD');
  });

  test('a printed 0 g with a sugar listed is OKAY, never CLEAN', () => {
    assert.equal(decided(label('Oats, Cane Sugar', perServing(0))).verdict, 'OKAY');
  });

  test('any artificial sweetener is BAD', () => {
    for (const s of ['Aspartame', 'Sucralose', 'Acesulfame K', 'Saccharin']) assert.equal(decided(label(`Water, ${s}`)).verdict, 'BAD', s);
  });
});
