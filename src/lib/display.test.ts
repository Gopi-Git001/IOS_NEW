import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ScanResult } from '../types.ts';
import { addToHistory, applyStrictMode, HISTORY_LIMIT, ingredientNames, reasonLine, ingredientSummary, initials, maskPhone, percent } from './display.ts';

const result = (over: Partial<ScanResult>): ScanResult => ({
  verdict: 'OKAY',
  headline: 'Contains sweeteners',
  naturalSugars: [],
  addedSugars: [],
  sweeteners: [],
  ...over,
});

test('strict mode on keeps the server verdict', () => {
  const r = result({ sweeteners: ['Stevia leaf extract'] });
  assert.equal(applyStrictMode(r, true).verdict, 'OKAY');
});

test('strict mode off shows plant-sweetener-only products as CLEAN', () => {
  const r = result({ sweeteners: ['Stevia leaf extract', 'Monk fruit extract'] });
  assert.equal(applyStrictMode(r, false).verdict, 'CLEAN');
});

test('strict mode off leaves sugar alcohols, added sugar and BAD alone', () => {
  assert.equal(applyStrictMode(result({ sweeteners: ['Stevia', 'Erythritol (sugar alcohol)'] }), false).verdict, 'OKAY');
  assert.equal(applyStrictMode(result({ sweeteners: ['Stevia'], addedSugars: ['Honey'] }), false).verdict, 'OKAY');
  assert.equal(applyStrictMode(result({ verdict: 'BAD', sweeteners: ['Sucralose'] }), false).verdict, 'BAD');
});

test('maskPhone keeps the country code and last four digits', () => {
  assert.equal(maskPhone('14155554821'), '+1 •••• 4821');
  assert.equal(maskPhone('+919876543210'), '+91 •••• 3210');
  assert.equal(maskPhone('9876543210'), '•••• 3210');
  assert.equal(maskPhone(undefined), 'Not available');
});

test('history keeps the newest 50 scans, newest first', () => {
  let h: ReturnType<typeof addToHistory> = [];
  for (let i = 0; i < 55; i++) h = addToHistory(h, result({ headline: `scan ${i}` }), new Date(2026, 0, 1, 0, i));
  assert.equal(h.length, HISTORY_LIMIT);
  assert.equal(h[0].result.headline, 'scan 54');
  assert.equal(h[49].result.headline, 'scan 5');
  assert.ok(h.every((e) => e.scheme === 'v3'), 'new entries carry the v3 marker');
});

test('ingredientSummary lists the first three names', () => {
  assert.equal(ingredientSummary(result({ addedSugars: ['Sugar', 'Corn syrup'], sweeteners: ['Sucralose', 'Stevia'] })), 'Sugar, Corn syrup, Sucralose +1');
  assert.equal(ingredientSummary(result({})), 'No sugars or sweeteners found');
});

test('ingredientNames drops amounts, hints, long text and repeats', () => {
  assert.deepEqual(
    ingredientNames([' Cane sugar ', '41 g added per serving', 'Sugar 5g', 'Added per serving', 'cane SUGAR', 'Icing sugar', 'x'.repeat(41), '', 'Dextrose']),
    ['Cane sugar', 'Icing sugar', 'Dextrose'],
  );
});

test('initials from the display name', () => {
  assert.equal(initials('Sam Lee'), 'SL');
  assert.equal(initials('  sam  '), 'S');
  assert.equal(initials('Ana María de la Cruz'), 'AM');
  assert.equal(initials(''), '');
  assert.equal(initials(null), '');
});

test('percent rounds and handles no scans', () => {
  assert.equal(percent(1, 3), 33);
  assert.equal(percent(2, 3), 67);
  assert.equal(percent(0, 0), 0);
});

test('reasonLine adds the added-sugar grams to the headline when known', () => {
  assert.equal(reasonLine(result({ headline: 'Too much sugar', addedSugars: ['Cane Sugar', '6 g added per serving'] })), 'Too much sugar · 6 g added per serving');
  assert.equal(reasonLine(result({ headline: 'Contains sweeteners' })), 'Contains sweeteners');
});
