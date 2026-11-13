import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ScanResult } from '../types.ts';
import { accountRowText, addToHistory, applyStrictMode, HISTORY_LIMIT, ingredientNames, reasonLine, ingredientSummary, initials, maskPhone, percent, sugarStackingLine } from './display.ts';

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

test('sugarStackingLine shows the badge only for 2 or more different added sugars', () => {
  const s = { distinct: 3, stacked: true, firstPosition: 2, firstNested: false, ingredientCount: 14 };
  assert.deepEqual(sugarStackingLine(result({ sugarStacking: s })), { badge: 'Sugar stacking', line: '3 different added sugars, first at ingredient 2 of 14' });
  assert.deepEqual(sugarStackingLine(result({ sugarStacking: { ...s, distinct: 1, stacked: false } })), { badge: null, line: 'First sugar at ingredient 2 of 14' });
  // A sub-ingredient in brackets is inside an ingredient, not at its place.
  assert.deepEqual(sugarStackingLine(result({ sugarStacking: { ...s, distinct: 1, stacked: false, firstPosition: 1, firstNested: true } })), { badge: null, line: 'First sugar inside ingredient 1 of 14' });
  assert.equal(sugarStackingLine(result({ sugarStacking: { ...s, firstNested: true } }))?.line, '3 different added sugars, first inside ingredient 2 of 14');
});

test('sugarStackingLine shows nothing for older results or a place that does not add up', () => {
  const s = { distinct: 2, stacked: true, firstPosition: 2, firstNested: false, ingredientCount: 5 };
  assert.equal(sugarStackingLine(result({})), null);
  assert.equal(sugarStackingLine(result({ sugarStacking: { ...s, firstPosition: 6 } })), null);
  assert.equal(sugarStackingLine(result({ sugarStacking: { ...s, firstPosition: 0 } })), null);
  assert.equal(sugarStackingLine(result({ sugarStacking: { ...s, ingredientCount: 0 } })), null);
  assert.equal(sugarStackingLine(result({ sugarStacking: { ...s, distinct: 0 } })), null);
  assert.equal(sugarStackingLine(result({ sugarStacking: { ...s, ingredientCount: 4.5 } })), null);
  // Saved scans come back from storage as plain JSON: missing or wrong-typed numbers show nothing.
  assert.equal(sugarStackingLine(result({ sugarStacking: { stacked: true } as never })), null);
  assert.equal(sugarStackingLine(result({ sugarStacking: { ...s, firstPosition: '2' } as never })), null);
  // "stacked" without 2 different sugars is not shown as stacking.
  assert.equal(sugarStackingLine(result({ sugarStacking: { ...s, distinct: 1 } }))?.badge, null);
});

test('strict mode keeps the stacking line', () => {
  const s = { distinct: 2, stacked: true, firstPosition: 1, firstNested: false, ingredientCount: 3 };
  const r = result({ addedSugars: ['Sugar', 'Honey'], sugarStacking: s });
  assert.deepEqual(applyStrictMode(r, false), r);
  assert.equal(sugarStackingLine(applyStrictMode(r, false))?.line, '2 different added sugars, first at ingredient 1 of 3');
});

test('account row shows only the email, for any sign-in method', () => {
  assert.equal(accountRowText('ana@example.com', true), 'ana@example.com');
  assert.equal(accountRowText('someone@icloud.com', true), 'someone@icloud.com');
  assert.equal(accountRowText('ana@example.com', false), 'Demo mode');
  assert.equal(accountRowText('old@guest.sugarhunter.app', true), 'Test session');
  assert.equal(accountRowText('x@phone.sugarhunter.app', true), 'Test session');
  assert.equal(accountRowText(undefined, true), 'Test session');
  assert.equal(accountRowText('  ', true), 'Test session');
});
