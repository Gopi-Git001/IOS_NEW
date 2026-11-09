// Run with: npm run test:rules
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ScanResult } from '../types';
import { combine } from './combine';

const reading: ScanResult = { verdict: 'BAD', headline: 'A little added sugar', naturalSugars: [], addedSugars: ['Honey'], sweeteners: [] };
const jev = (verdict: 'CLEAN' | 'BAD' | 'UGLY') => ({ status: 'decided' as const, verdict, confidence: 0.9, model: 'jev' });

test('Jev verdict shows before the lists arrive', () => {
  const u = combine(jev('UGLY'), null, false);
  assert.equal(u?.status, 'done');
  if (u?.status === 'done') {
    assert.equal(u.result.verdict, 'UGLY');
    assert.equal(u.listsPending, true);
  }
});

test("Jev's call stands when the rules disagree", () => {
  const u = combine(jev('UGLY'), reading, false);
  if (u?.status !== 'done') throw new Error('expected done');
  assert.equal(u.result.verdict, 'UGLY');
  assert.deepEqual(u.result.addedSugars, ['Honey']);
});

test('rules decide when Jev is unsure or down', () => {
  const u = combine({ status: 'unavailable', reason: 'x' }, reading, false);
  if (u?.status !== 'done') throw new Error('expected done');
  assert.equal(u.result.verdict, 'BAD');
  assert.equal(combine({ status: 'unavailable', reason: 'x' }, null, false), null);
});

test('not a label waits for the reading, then errors', () => {
  assert.equal(combine({ status: 'not_a_label', model: 'jev' }, null, false), null);
  assert.equal(combine({ status: 'not_a_label', model: 'jev' }, null, true)?.status, 'error');
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
  assert.equal(u?.status === 'done' && u.result.verdict, 'BAD');
});
