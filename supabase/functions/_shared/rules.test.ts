// Run with: npm run test:rules
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, type LabelReading } from './rules.ts';

const label = (over: Partial<LabelReading> = {}): LabelReading => ({
  is_food_label: true,
  natural_sugars: [],
  added_sugars: [],
  artificial_sweeteners: [],
  sugar_alcohols: [],
  other_sweeteners: [],
  contains_alcohol: false,
  added_sugar_grams: null,
  ...over,
});

test('no added sugar or sweeteners is CLEAN', () => {
  const r = decide(label({ natural_sugars: ['Lactose', 'Fructose'], added_sugar_grams: 0 }));
  assert.equal(r.verdict, 'CLEAN');
  assert.deepEqual(r.naturalSugars, ['Lactose', 'Fructose']);
});

test('over 4 g added sugar is UGLY', () => {
  assert.equal(decide(label({ added_sugars: ['Sugar'], added_sugar_grams: 4.5 })).verdict, 'UGLY');
});

test('exactly 4 g and 1 g added sugar are BAD', () => {
  assert.equal(decide(label({ added_sugars: ['Honey'], added_sugar_grams: 4 })).verdict, 'BAD');
  assert.equal(decide(label({ added_sugars: ['Honey'], added_sugar_grams: 1 })).verdict, 'BAD');
});

test('added sugar with unknown grams is BAD, not CLEAN', () => {
  const r = decide(label({ added_sugars: ['Cane sugar'] }));
  assert.equal(r.verdict, 'BAD');
  assert.equal(r.headline, 'Added sugar, amount not shown');
});

test('artificial sweeteners are UGLY even with no sugar', () => {
  assert.equal(decide(label({ artificial_sweeteners: ['Sucralose'], added_sugar_grams: 0 })).verdict, 'UGLY');
});

test('alcohol is UGLY', () => {
  assert.equal(decide(label({ contains_alcohol: true })).verdict, 'UGLY');
});

test('sugar alcohols alone are BAD', () => {
  const r = decide(label({ sugar_alcohols: ['Erythritol'] }));
  assert.equal(r.verdict, 'BAD');
  assert.deepEqual(r.sweeteners, ['Erythritol (sugar alcohol)']);
});

test('aspartame misfiled as added sugar moves to Sweeteners and makes it UGLY', () => {
  const r = decide(label({ added_sugars: ['Sucrose', 'Aspartame'] }));
  assert.equal(r.verdict, 'UGLY');
  assert.deepEqual(r.addedSugars, ['Sucrose']);
  assert.deepEqual(r.sweeteners, ['Aspartame']);
});

test('sugar alcohol misfiled as added sugar moves to Sweeteners', () => {
  const r = decide(label({ added_sugars: ['Maltitol'] }));
  assert.equal(r.verdict, 'BAD');
  assert.deepEqual(r.addedSugars, []);
  assert.deepEqual(r.sweeteners, ['Maltitol (sugar alcohol)']);
});

test('grams are shown in the Added sugars list', () => {
  const r = decide(label({ added_sugars: ['Sucrose'], added_sugar_grams: 39 }));
  assert.deepEqual(r.addedSugars, ['Sucrose', '39 g added per serving']);
});

test('nonsense grams are ignored', () => {
  assert.equal(decide(label({ added_sugar_grams: -3 })).verdict, 'CLEAN');
});

test('plant sweeteners alone are BAD', () => {
  assert.equal(decide(label({ other_sweeteners: ['Stevia'] })).verdict, 'BAD');
});
