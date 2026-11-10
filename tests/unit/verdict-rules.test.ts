// One test per verdict rule in policy.ts (Rules v2), checked through rules.ts decide(): the verdict,
// the rule id, and the three lists the app shows. Pure: no network.
// Spec conflicts with CLAUDE.md run as `todo` (reported, never fail the run).
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

function unresolved(l: LiteralLabel) {
  const d = decide(l);
  assert.equal(d.status, 'unresolved', `expected no verdict, got ${d.evaluation.verdict} (${d.evaluation.ruleId})`);
  if (d.status !== 'unresolved') throw new Error('unreachable');
  return { rule: d.evaluation.ruleId, retake: d.retake, message: d.message };
}

const lists = (r: ScanResult) => ({ natural: r.naturalSugars, added: r.addedSugars, sweeteners: r.sweeteners });

describe('one test per verdict rule', () => {
  test('A1 not a food label: no verdict, ask for a retake', () => {
    assert.deepEqual(unresolved(label(null, { is_food_label: false })), {
      rule: 'A1-not-a-label', retake: true, message: "This doesn't look like a food label.",
    });
  });

  test('A2 unreadable: no verdict even when sugar is visible, ask for a retake', () => {
    const r = unresolved(label('Sugar, Water', { is_readable: false }));
    assert.equal(r.rule, 'A2-unreadable');
    assert.equal(r.retake, true);
  });

  test('A3 no ingredient list: no verdict, ask for a retake', () => {
    const r = unresolved(label(null, perServing(0)));
    assert.equal(r.rule, 'A3-no-ingredient-list');
    assert.equal(r.retake, true);
  });

  test('A4 cut-off list with nothing sweet seen: no verdict, ask for a retake', () => {
    const r = unresolved(label('Water, Salt', { ingredients_complete: false }));
    assert.equal(r.rule, 'A4-incomplete-list');
    assert.equal(r.retake, true);
  });

  test('A5 unknown sweet-sounding ingredient: no verdict, no retake', () => {
    const r = unresolved(label('Water, Yacon Syrup'));
    assert.equal(r.rule, 'A5-unknown-ingredient');
    assert.equal(r.retake, false);
    assert.match(r.message, /Yacon Syrup/);
  });

  test('A6 ingredient that needs context: no verdict, no retake', () => {
    const r = unresolved(label('Orange Juice From Concentrate'));
    assert.equal(r.rule, 'A6-needs-context');
    assert.equal(r.retake, false);
  });

  test('U1 added sugar in the list: UGLY, listed under Added sugars', () => {
    const r = decided(label('Carbonated Water, High Fructose Corn Syrup'));
    assert.equal(r.verdict, 'UGLY');
    assert.equal(r.rule, 'U1-added-sugar');
    assert.equal(r.headline, 'Added sugar');
    assert.deepEqual(lists(r), { natural: [], added: ['High Fructose Corn Syrup'], sweeteners: [] });
    assert.equal(r.note, 'Scan the nutrition panel to see the grams');
  });

  test('U1 with grams per serving: the grams line joins Added sugars and the panel note goes away', () => {
    const r = decided(label('Oats, Cane Sugar', perServing(6)));
    assert.equal(r.verdict, 'UGLY');
    assert.deepEqual(r.addedSugars, ['Cane Sugar', '6 g added per serving']);
    assert.equal(r.note, undefined);
  });

  test('U1 grams per 100 g are not turned into a per-serving line', () => {
    const r = decided(label('Oats, Cane Sugar', { added_sugars_g: 12, quantity_basis: 'per_100g' }));
    assert.deepEqual(r.addedSugars, ['Cane Sugar']);
  });

  test('U2 panel shows added sugar but none listed: UGLY', () => {
    const r = decided(label('Oats, Salt', perServing(3)));
    assert.equal(r.verdict, 'UGLY');
    assert.equal(r.rule, 'U2-panel-added-sugar');
    assert.deepEqual(r.addedSugars, ['3 g added per serving']);
  });

  test('U3 artificial sweetener: UGLY, listed under Sweeteners, never Added sugars', () => {
    const r = decided(label('Carbonated Water, Aspartame, Acesulfame Potassium'));
    assert.equal(r.verdict, 'UGLY');
    assert.equal(r.rule, 'U3-artificial-sweetener');
    assert.equal(r.headline, 'Artificial sweeteners');
    assert.deepEqual(lists(r), { natural: [], added: [], sweeteners: ['Aspartame', 'Acesulfame Potassium'] });
  });

  test('U4 erythritol or xylitol: UGLY, shown as a sugar alcohol', () => {
    for (const [name, word] of [['Erythritol', 'erythritol'], ['Xylitol', 'xylitol']]) {
      const r = decided(label(`Water, ${name}`));
      assert.equal(r.verdict, 'UGLY', name);
      assert.equal(r.rule, 'U4-erythritol-xylitol', name);
      assert.equal(r.headline, `Contains ${word}`);
      assert.deepEqual(lists(r), { natural: [], added: [], sweeteners: [`${name} (sugar alcohol)`] });
    }
  });

  test('U5 drinking alcohol: UGLY', () => {
    const r = decided(label('Water, Barley, Hops, Yeast', { abv_text: '5% ABV' }));
    assert.equal(r.verdict, 'UGLY');
    assert.equal(r.rule, 'U5-drinking-alcohol');
    assert.equal(r.headline, 'Contains alcohol');
  });

  test('B1 other sugar alcohol: BAD, shown as a sugar alcohol', () => {
    const r = decided(label('Cocoa, Maltitol'));
    assert.equal(r.verdict, 'BAD');
    assert.equal(r.rule, 'B1-sugar-alcohol');
    assert.equal(r.headline, 'Contains sugar alcohols');
    assert.deepEqual(lists(r), { natural: [], added: [], sweeteners: ['Maltitol (sugar alcohol)'] });
  });

  test('B2 plant sweetener only: BAD', () => {
    const r = decided(label('Water, Monk Fruit Extract'));
    assert.equal(r.verdict, 'BAD');
    assert.equal(r.rule, 'B2-plant-sweetener');
    assert.equal(r.headline, 'Gentler sweetener');
    assert.equal(r.note, 'The gentlest option, but still a sweetener');
  });

  test('B3 allulose: BAD, listed under Sweeteners', () => {
    const r = decided(label('Almonds, Allulose'));
    assert.equal(r.verdict, 'BAD');
    assert.equal(r.rule, 'B3-allulose');
    assert.deepEqual(lists(r), { natural: [], added: [], sweeteners: ['Allulose'] });
  });

  test('C1 nothing sweet added: CLEAN', () => {
    const r = decided(label('Water, Sea Salt, Citric Acid'));
    assert.equal(r.verdict, 'CLEAN');
    assert.equal(r.rule, 'C1-nothing-sweet-added');
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

  test('natural and added sugar in one product land in separate lists', () => {
    const r = decided(label('Whole Milk, Banana Puree, Cane Sugar', perServing(6)));
    assert.equal(r.verdict, 'UGLY');
    assert.deepEqual(r.naturalSugars, ['Whole Milk', 'Banana Puree']);
    assert.deepEqual(r.addedSugars, ['Cane Sugar', '6 g added per serving']);
  });

  test('juice concentrate counts as added sugar, not natural', () => {
    const r = decided(label('Oats, Apple Juice Concentrate'));
    assert.equal(r.verdict, 'UGLY');
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
    test(`${s} alone: BAD, a sweetener, no added sugar`, () => {
      const r = decided(label(`Carbonated Water, ${s}, Citric Acid`));
      assert.equal(r.verdict, 'BAD');
      assert.equal(r.rule, 'B2-plant-sweetener');
      assert.deepEqual(r.addedSugars, []);
      assert.equal(r.sweeteners.length, 1);
    });
  }

  test('stevia never softens added sugar: honey + stevia is UGLY and both are listed', () => {
    const r = decided(label('Oats, Honey, Stevia'));
    assert.equal(r.verdict, 'UGLY');
    assert.deepEqual(lists(r), { natural: [], added: ['Honey'], sweeteners: ['Stevia'] });
  });

  test('stevia blend that hides erythritol is UGLY', () => {
    assert.equal(decided(label('Water, Stevia Blend (Erythritol, Stevia Leaf Extract)')).verdict, 'UGLY');
  });
});

describe('sugar alcohols', () => {
  for (const s of ['Sorbitol', 'Maltitol', 'Mannitol', 'Isomalt', 'Lactitol']) {
    test(`${s}: BAD, a sweetener with the sugar alcohol tag, never an added sugar`, () => {
      const r = decided(label(`Gum Base, ${s}`));
      assert.equal(r.verdict, 'BAD');
      assert.deepEqual(r.addedSugars, []);
      assert.deepEqual(r.sweeteners, [`${s} (sugar alcohol)`]);
    });
  }

  test('a sugar alcohol is not drinking alcohol', () => {
    assert.notEqual(evaluate(label('Gum Base, Sorbitol')).ruleId, 'U5-drinking-alcohol');
  });
});

describe('drinking alcohol', () => {
  test('ABV printed with no alcohol ingredient: UGLY', () => {
    assert.equal(decided(label('Water, Barley, Hops', { abv_text: '4.2% alc./vol.' })).rule, 'U5-drinking-alcohol');
  });

  for (const s of ['Rum', 'Alcohol', 'Red Wine']) {
    test(`${s} as an ingredient: UGLY`, () => {
      assert.equal(decided(label(`Cream, ${s}, Salt`)).rule, 'U5-drinking-alcohol');
    });
  }

  test('wine vinegar is not alcohol', () => {
    assert.equal(decided(label('Tomatoes, Red Wine Vinegar, Salt')).verdict, 'CLEAN');
  });

  test('added sugar outranks alcohol in the rule order (both UGLY)', () => {
    const r = decided(label('Carbonated Water, Cane Sugar, Alcohol', { abv_text: '5% ABV' }));
    assert.equal(r.verdict, 'UGLY');
    assert.equal(r.rule, 'U1-added-sugar');
  });
});

// CLAUDE.md: "BAD — 1–4 g added sugar per serving (or added sugar with grams not shown), sugar alcohols
// (erythritol, xylitol, maltitol…)". policy.ts Rules v2 (approved Nov 6) says any added sugar, erythritol
// and xylitol are UGLY. These run and report, but don't fail the suite until one of the two is updated.
const SPEC_CONFLICT = 'CLAUDE.md and policy.ts Rules v2 disagree; decide which is right';

describe('CLAUDE.md verdict spec (conflicts with Rules v2)', () => {
  test('1 g added sugar per serving is BAD', { todo: SPEC_CONFLICT }, () => {
    assert.equal(decided(label('Oats, Cane Sugar', perServing(1))).verdict, 'BAD');
  });

  test('4 g added sugar per serving is BAD', { todo: SPEC_CONFLICT }, () => {
    assert.equal(decided(label('Oats, Cane Sugar', perServing(4))).verdict, 'BAD');
  });

  test('added sugar with grams not shown is BAD', { todo: SPEC_CONFLICT }, () => {
    assert.equal(decided(label('Oats, Honey')).verdict, 'BAD');
  });

  test('erythritol is BAD', { todo: SPEC_CONFLICT }, () => {
    assert.equal(decided(label('Water, Erythritol')).verdict, 'BAD');
  });

  test('xylitol is BAD', { todo: SPEC_CONFLICT }, () => {
    assert.equal(decided(label('Gum Base, Xylitol')).verdict, 'BAD');
  });

  // Both specs agree on these.
  test('over 4 g added sugar per serving is UGLY', () => {
    assert.equal(decided(label('Oats, Cane Sugar', perServing(4.5))).verdict, 'UGLY');
  });

  test('any artificial sweetener is UGLY', () => {
    assert.equal(decided(label('Water, Sucralose')).verdict, 'UGLY');
  });
});
