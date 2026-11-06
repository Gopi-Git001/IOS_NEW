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
  assert.equal(d.status, 'decided', d.status === 'unresolved' ? d.message : '');
  return (d as Extract<typeof d, { status: 'decided' }>).result;
};

test('CLEAN lists natural sugar sources as printed', () => {
  const r = done(label('Whole Milk, Live and Active Cultures, Strawberries'));
  assert.equal(r.verdict, 'CLEAN');
  assert.equal(r.headline, 'No added sugar');
  assert.deepEqual(r.naturalSugars, ['Whole Milk', 'Strawberries']);
  assert.equal(r.analysis?.ruleId, 'C1-nothing-sweet-added');
});

test('added sugar with unknown grams asks for the panel', () => {
  const r = done(label('Oats, Cane Sugar'));
  assert.equal(r.verdict, 'UGLY');
  assert.equal(r.headline, 'Added sugar');
  assert.equal(r.note, 'Scan the nutrition panel to see the grams');
  assert.deepEqual(r.addedSugars, ['Cane Sugar']);
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

test('erythritol headline names it', () => {
  const r = done(label('Erythritol'));
  assert.equal(r.verdict, 'UGLY');
  assert.equal(r.headline, 'Contains erythritol');
  assert.deepEqual(r.sweeteners, ['Erythritol (sugar alcohol)']);
});

test('stevia, monk fruit and allulose alone are BAD with the gentle note', () => {
  for (const s of ['Stevia Leaf Extract', 'Monk Fruit Extract', 'Allulose']) {
    const r = done(label(`Water, ${s}`));
    assert.equal(r.verdict, 'BAD');
    assert.equal(r.note, 'The gentlest option, but still a sweetener');
    assert.deepEqual(r.sweeteners, [s]);
  }
});

test('unresolved: retake for photo problems, plain message otherwise', () => {
  const cut = decide(label('Water, Salt', { ingredients_complete: false }));
  assert.equal(cut.status, 'unresolved');
  assert.equal(cut.status === 'unresolved' && cut.retake, true);
  const unknown = decide(label('Water, Yacon Syrup'));
  assert.equal(unknown.status === 'unresolved' && unknown.retake, false);
  assert.match(unknown.status === 'unresolved' ? unknown.message : '', /Yacon Syrup/);
});
