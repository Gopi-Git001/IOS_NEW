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

test('any added sugar is UGLY, even 1 g', () => {
  assert.equal(decide(label({ added_sugars: ['Sugar'], added_sugar_grams: 4.5 })).verdict, 'UGLY');
  assert.equal(decide(label({ added_sugars: ['Honey'], added_sugar_grams: 1 })).verdict, 'UGLY');
  assert.equal(decide(label({ added_sugar_grams: 0.5 })).verdict, 'UGLY');
});

test('added sugar with unknown grams is UGLY and asks for the panel', () => {
  const r = decide(label({ added_sugars: ['Cane sugar'] }));
  assert.equal(r.verdict, 'UGLY');
  assert.equal(r.headline, 'Added sugar');
  assert.equal(r.note, 'Scan the nutrition panel to see the grams');
});

test('fruit juice concentrate counts as added sugar', () => {
  assert.equal(decide(label({ added_sugars: ['Apple juice concentrate'], added_sugar_grams: 0 })).verdict, 'UGLY');
});

test('artificial sweeteners are UGLY even with no sugar', () => {
  assert.equal(decide(label({ artificial_sweeteners: ['Sucralose'], added_sugar_grams: 0 })).verdict, 'UGLY');
});

test('alcohol is UGLY', () => {
  assert.equal(decide(label({ contains_alcohol: true })).verdict, 'UGLY');
});

test('erythritol and xylitol are UGLY', () => {
  const r = decide(label({ sugar_alcohols: ['Erythritol'] }));
  assert.equal(r.verdict, 'UGLY');
  assert.equal(r.headline, 'Contains erythritol');
  assert.deepEqual(r.sweeteners, ['Erythritol (sugar alcohol)']);
  assert.equal(decide(label({ sugar_alcohols: ['Xylitol'] })).verdict, 'UGLY');
});

test('other sugar alcohols alone are BAD', () => {
  assert.equal(decide(label({ sugar_alcohols: ['Sorbitol'] })).verdict, 'BAD');
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

test('stevia, monk fruit and allulose alone are BAD with the gentle note', () => {
  for (const s of ['Stevia leaf extract', 'Monk fruit extract', 'Allulose']) {
    const r = decide(label({ other_sweeteners: [s] }));
    assert.equal(r.verdict, 'BAD');
    assert.equal(r.note, 'The gentlest option, but still a sweetener');
  }
});

test('stevia plus added sugar is UGLY', () => {
  assert.equal(decide(label({ other_sweeteners: ['Stevia'], added_sugars: ['Sugar'] })).verdict, 'UGLY');
});
