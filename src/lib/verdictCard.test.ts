import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ScanResult } from '../types.ts';
import { buildVerdictCardData, CARD_INGREDIENT_LIMIT } from './verdictCard.ts';

const date = new Date(2026, 10, 10, 12);
const result = (overrides: Partial<ScanResult> = {}): ScanResult => ({
  verdict: 'CLEAN', headline: 'No added sugar', naturalSugars: ['Lactose'], addedSugars: [], sweeteners: [], ...overrides,
});

test('CLEAN card includes the displayed verdict/date/brand but does not flag natural sugars', () => {
  const card = buildVerdictCardData(result(), date)!;
  assert.equal(card.verdict, 'CLEAN');
  assert.equal(card.headline, 'No added sugar');
  assert.deepEqual(card.ingredients, []);
  assert.equal(card.emptyMessage, 'None listed in this scan.');
  assert.equal(card.brand, 'Sugar Depth');
  assert.equal(card.website, 'sugardepth.com');
  assert.equal(card.scanDate, '10 Nov 2026');
  assert.equal(card.dateKey, '2026-11-10');
});

test('OKAY card highlights sweeteners without relabeling them added sugar', () => {
  const card = buildVerdictCardData(result({ verdict: 'OKAY', headline: 'Contains sweeteners', sweeteners: ['Stevia leaf extract', 'E960'] }), date)!;
  assert.equal(card.verdict, 'OKAY');
  assert.equal(card.headline, 'Contains sweeteners');
  assert.deepEqual(card.ingredients, [{ name: 'Stevia leaf extract', kind: 'SWEETENER' }, { name: 'E960', kind: 'SWEETENER' }]);
});

test('BAD card highlights sugar and artificial sweetener names, not numeric evidence', () => {
  const card = buildVerdictCardData(result({ verdict: 'BAD', headline: 'Too much added sugar', addedSugars: [' Cane sugar ', '12 g added per serving'], sweeteners: ['Sucralose'] }), date)!;
  assert.equal(card.verdict, 'BAD');
  assert.deepEqual(card.ingredients, [{ name: 'Cane sugar', kind: 'ADDED SUGAR' }, { name: 'Sucralose', kind: 'SWEETENER' }]);
});

test('long lists are capped and +N more counts unique omitted names across both groups', () => {
  const card = buildVerdictCardData(result({ verdict: 'BAD', addedSugars: ['Sugar', 'Dextrose', 'Honey', 'Agave', 'sugar'], sweeteners: ['Sucralose', 'Aspartame', 'E950'] }), date)!;
  assert.equal(card.ingredients.length, CARD_INGREDIENT_LIMIT);
  assert.equal(card.moreCount, 3);
  assert.equal(`+${card.moreCount} more`, '+3 more');
});

test('long ingredient names are kept, whitespace normalized, and the input is not mutated', () => {
  const name = 'An exceptionally long ingredient name with enough words to need wrapping on the image card';
  const original = result({ sweeteners: [name, '  Monk\nfruit  extract ', 'monk fruit extract'] });
  const before = JSON.stringify(original);
  const card = buildVerdictCardData(original, date)!;
  assert.deepEqual(card.ingredients.map(i => i.name), [name, 'Monk fruit extract']);
  assert.equal(JSON.stringify(original), before);
});

test('CLEAN in gentle display mode still accurately lists its plant sweetener', () => {
  const card = buildVerdictCardData(result({ sweeteners: ['Stevia'] }), date)!;
  assert.deepEqual(card.ingredients, [{ name: 'Stevia', kind: 'SWEETENER' }]);
});

test('missing BAD/OKAY lists do not falsely claim no sugars were found', () => {
  assert.equal(buildVerdictCardData(result({ verdict: 'BAD' }), date)!.emptyMessage, 'No ingredient names available.');
  assert.equal(buildVerdictCardData(result({ verdict: 'OKAY' }), date)!.emptyMessage, 'No ingredient names available.');
});

test('RETRY has no card data and therefore no share action', () => {
  assert.equal(buildVerdictCardData({ verdict: 'RETRY' }, date), null);
});

test('only allow-listed public fields reach the card; photo and account data are excluded', () => {
  const card = buildVerdictCardData({ ...result(), photoUri: 'private-label-photo', email: 'private-account', note: 'private note', analysis: { explanation: 'private analysis' } } as unknown as ScanResult, date);
  assert.doesNotMatch(JSON.stringify(card), /private/);
});
