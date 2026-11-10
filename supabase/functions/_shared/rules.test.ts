// Run with: npm run test:rules
// The adapter that maps the policy Evaluation onto the ScanResult the app renders.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, type LiteralLabel } from './rules.ts';

const label = (ingredients_text: string | null, over: Partial<LiteralLabel> = {}): LiteralLabel => ({
  is_food_label: true, is_readable: true, ingredients_text, ingredients_complete: true, total_sugars_g: null,
  added_sugars_g: null, quantity_basis: 'unknown', serving_size_text: null, abv_text: null, ...over,
});

const done = (l: LiteralLabel) => {
  const d = decide(l);
  assert.equal(d.status, 'decided', d.status === 'retry' ? d.message : '');
  return (d as Extract<typeof d, { status: 'decided' }>).result;
};

test('CLEAN lists natural sugar sources as printed', () => {
  const r = done(label('Whole Milk, Live and Active Cultures, Strawberries'));
  assert.equal(r.verdict, 'CLEAN');
  assert.equal(r.headline, 'No added sugar');
  assert.deepEqual(r.naturalSugars, ['Whole Milk', 'Strawberries']);
  assert.equal(r.analysis?.ruleId, 'C1-clean');
});

test('added sugar with unknown grams is BAD and asks for the panel', () => {
  const r = done(label('Oats, Cane Sugar'));
  assert.equal(r.verdict, 'BAD');
  assert.equal(r.headline, 'Added sugar');
  assert.equal(r.note, 'Scan the nutrition panel to see the grams');
  assert.deepEqual(r.addedSugars, ['Cane Sugar']);
});

test('2 g added sugar per serving is OKAY; 6 g is BAD', () => {
  const little = done(label('Oats, Cane Sugar', { added_sugars_g: 2, quantity_basis: 'per_serving' }));
  assert.equal(little.verdict, 'OKAY');
  assert.equal(little.headline, 'A little added sugar');
  assert.deepEqual(little.addedSugars, ['Cane Sugar', '2 g added per serving']);
  const lots = done(label('Oats, Cane Sugar', { added_sugars_g: 6, quantity_basis: 'per_serving' }));
  assert.equal(lots.verdict, 'BAD');
  assert.equal(lots.headline, 'Too much added sugar');
});

test('per-serving grams are shown; per-100 g grams are not relabeled as per serving', () => {
  assert.deepEqual(done(label('Sucrose', { added_sugars_g: 39, quantity_basis: 'per_serving' })).addedSugars, ['Sucrose', '39 g added per serving']);
  assert.deepEqual(done(label('Sucrose', { added_sugars_g: 12, quantity_basis: 'per_100g' })).addedSugars, ['Sucrose']);
});

test('sweeteners never appear as added sugars', () => {
  const r = done(label('Sucrose, Aspartame, Maltitol'));
  assert.deepEqual(r.addedSugars, ['Sucrose']);
  assert.deepEqual(r.sweeteners, ['Aspartame', 'Maltitol (sugar alcohol)']);
});

test('erythritol is OKAY, shown as a sugar alcohol', () => {
  const r = done(label('Erythritol'));
  assert.equal(r.verdict, 'OKAY');
  assert.equal(r.headline, 'Contains sugar alcohols');
  assert.deepEqual(r.sweeteners, ['Erythritol (sugar alcohol)']);
});

test('stevia, monk fruit and allulose alone are OKAY with the gentle note', () => {
  for (const s of ['Stevia Leaf Extract', 'Monk Fruit Extract', 'Allulose']) {
    const r = done(label(`Water, ${s}`));
    assert.equal(r.verdict, 'OKAY');
    assert.equal(r.note, 'The gentlest option, but still a sweetener');
    assert.deepEqual(r.sweeteners, [s]);
  }
});

test('an unknown sweetener is OKAY and named under Sweeteners', () => {
  const r = done(label('Water, Yacon Syrup'));
  assert.equal(r.verdict, 'OKAY');
  assert.equal(r.headline, 'Unfamiliar sweetener');
  assert.deepEqual(r.sweeteners, ['Yacon Syrup']);
});

test('RETRY for photo problems, never a verdict', () => {
  for (const l of [label('Water, Salt', { ingredients_complete: false }), label(null), label('Sugar', { is_readable: false }), label(null, { is_food_label: false })]) {
    const d = decide(l);
    assert.equal(d.status, 'retry');
    assert.equal(d.evaluation.verdict, 'RETRY');
  }
});
