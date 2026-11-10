// Run with: npm run test:rules
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ScanResult, Verdict } from '../types';
import { combine } from './combine';

const reading: ScanResult = { verdict: 'OKAY', headline: 'A little added sugar', naturalSugars: [], addedSugars: ['Honey', '2 g added per serving'], sweeteners: [] };
const jev = (verdict: Verdict) => ({ status: 'decided' as const, verdict, confidence: 0.9, model: 'jev' });

test('Jev answered first: no verdict until the lists arrive', () => {
  assert.equal(combine(jev('BAD'), null, false), null);
});

test('the lists arrived first: no verdict until Jev answers', () => {
  assert.equal(combine(null, reading, false), null);
});

test('once Jev has had its 6 s, the rules verdict shows on its own', () => {
  const u = combine(null, reading, false, false, false, true);
  if (u?.status !== 'done') throw new Error('expected done');
  assert.equal(u.result.verdict, 'OKAY');
  assert.equal(u.listsPending, false);
});

test('a timed-out reading keeps the verdict and offers a retry', () => {
  const u = combine(jev('BAD'), null, true, false, true);
  if (u?.status !== 'done') throw new Error('expected done');
  assert.equal(u.result.verdict, 'BAD');
  assert.equal(u.listsPending, false);
  assert.equal(u.listsRetry, true);
  assert.equal(u.result.note, undefined);
});

test('a reading that failed for good says so, with no retry', () => {
  const u = combine(jev('BAD'), null, true);
  if (u?.status !== 'done') throw new Error('expected done');
  assert.equal(u.listsPending, false);
  assert.equal(u.listsRetry, undefined);
  assert.match(u.result.note ?? '', /Couldn't list the sugars/);
});

test("Jev's call stands when the rules disagree (and it isn't CLEAN)", () => {
  const u = combine(jev('BAD'), reading, false);
  if (u?.status !== 'done') throw new Error('expected done');
  assert.equal(u.result.verdict, 'BAD');
  assert.deepEqual(u.result.addedSugars, ['Honey', '2 g added per serving']);
});

test('safety floor: Jev CLEAN + cane sugar in the reading is never CLEAN', () => {
  const caneSugar: ScanResult = { verdict: 'BAD', headline: 'Added sugar', naturalSugars: [], addedSugars: ['Cane Sugar'], sweeteners: [], note: 'Scan the nutrition panel to see the grams' };
  const u = combine(jev('CLEAN'), caneSugar, false);
  if (u?.status !== 'done') throw new Error('expected done');
  assert.equal(u.result.verdict, 'BAD');
  assert.equal(u.result.headline, 'Added sugar');
});

test('safety floor: Jev CLEAN + a little added sugar shows the rules OKAY', () => {
  const u = combine(jev('CLEAN'), reading, false);
  assert.equal(u?.status === 'done' && u.result.verdict, 'OKAY');
});

test('safety floor: Jev CLEAN + an artificial sweetener or alcohol (rules BAD) is BAD', () => {
  for (const r of [
    { verdict: 'BAD', headline: 'Artificial sweeteners', naturalSugars: [], addedSugars: [], sweeteners: ['Sucralose'] },
    { verdict: 'BAD', headline: 'Contains alcohol', naturalSugars: [], addedSugars: [], sweeteners: [] },
  ] as ScanResult[]) {
    const u = combine(jev('CLEAN'), r, false);
    assert.equal(u?.status === 'done' && u.result.verdict, 'BAD', r.headline);
  }
});

test('Jev CLEAN stands over a rules OKAY with no added sugar (stevia)', () => {
  const stevia: ScanResult = { verdict: 'OKAY', headline: 'Gentler sweetener', naturalSugars: [], addedSugars: [], sweeteners: ['Stevia'] };
  const u = combine(jev('CLEAN'), stevia, false);
  assert.equal(u?.status === 'done' && u.result.verdict, 'CLEAN');
});

test('rules decide when Jev is unsure or down', () => {
  const u = combine({ status: 'unavailable', reason: 'x' }, reading, false);
  if (u?.status !== 'done') throw new Error('expected done');
  assert.equal(u.result.verdict, 'OKAY');
  assert.equal(combine({ status: 'unavailable', reason: 'x' }, null, false), null);
});

test('not a label waits for the reading, then errors', () => {
  assert.equal(combine({ status: 'not_a_label', model: 'jev' }, null, false), null);
  assert.equal(combine({ status: 'not_a_label', model: 'jev' }, null, true)?.status, 'error');
});

test('the reading failed and Jev never answered: an error once Jev has had its 6 s', () => {
  assert.equal(combine(null, null, true, false, true), null);
  assert.equal(combine(null, null, true, false, true, true)?.status, 'error');
});

test('an unreadable photo never gets a verdict, even after Jev called one', () => {
  const u = combine(jev('CLEAN'), null, true, true);
  assert.equal(u?.status, 'error');
  assert.match(u?.status === 'error' ? u.message : '', /isn't clear/);
});

test('Jev says illegible and the reader failed: ask for a clearer photo', () => {
  const u = combine({ status: 'unreadable', model: 'jev' }, null, true);
  assert.match(u?.status === 'error' ? u.message : '', /isn't clear/);
});

test('Jev says illegible but the reader read it: show the reading', () => {
  const u = combine({ status: 'unreadable', model: 'jev' }, reading, false);
  assert.equal(u?.status === 'done' && u.result.verdict, 'OKAY');
});
