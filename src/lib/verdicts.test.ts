import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { JevVerdict, ScanResult } from '../types';
import { addToHistory } from './display';
import { normalizeJev, normalizeResult, readHistory, toVerdict, VERDICT_SCHEME } from './verdicts';

const result = (verdict: string): ScanResult => ({ verdict, headline: 'h', naturalSugars: [], addedSugars: [], sweeteners: [] }) as unknown as ScanResult;

test('old edge functions (no marker): CLEAN / BAD / UGLY become CLEAN / OKAY / BAD', () => {
  assert.equal(toVerdict('CLEAN', undefined), 'CLEAN');
  assert.equal(toVerdict('BAD', undefined), 'OKAY');
  assert.equal(toVerdict('UGLY', undefined), 'BAD');
});

test('new edge functions (v3 marker): names pass through', () => {
  assert.equal(toVerdict('CLEAN', VERDICT_SCHEME), 'CLEAN');
  assert.equal(toVerdict('OKAY', VERDICT_SCHEME), 'OKAY');
  assert.equal(toVerdict('BAD', VERDICT_SCHEME), 'BAD');
});

test('unambiguous names are read the same either way; junk is not a verdict', () => {
  assert.equal(toVerdict('OKAY', undefined), 'OKAY');
  assert.equal(toVerdict('UGLY', VERDICT_SCHEME), 'BAD');
  assert.equal(toVerdict('GOOD', VERDICT_SCHEME), null);
  assert.equal(toVerdict('RETRY', VERDICT_SCHEME), null);
  assert.equal(toVerdict(undefined, undefined), null);
});

test('scan-label results from either version', () => {
  assert.equal(normalizeResult(result('UGLY'), undefined)?.verdict, 'BAD');
  assert.equal(normalizeResult(result('BAD'), undefined)?.verdict, 'OKAY');
  assert.equal(normalizeResult(result('BAD'), VERDICT_SCHEME)?.verdict, 'BAD');
  assert.equal(normalizeResult(result('nope'), VERDICT_SCHEME), null);
});

test('Jev answers from either version', () => {
  const decided = (verdict: string) => ({ status: 'decided', verdict, confidence: 0.9, model: 'jev' }) as unknown as JevVerdict;
  assert.deepEqual(normalizeJev(decided('UGLY'), undefined), { status: 'decided', verdict: 'BAD', confidence: 0.9, model: 'jev' });
  assert.deepEqual(normalizeJev(decided('BAD'), undefined), { status: 'decided', verdict: 'OKAY', confidence: 0.9, model: 'jev' });
  assert.deepEqual(normalizeJev(decided('BAD'), VERDICT_SCHEME), { status: 'decided', verdict: 'BAD', confidence: 0.9, model: 'jev' });
  assert.equal(normalizeJev(decided('GOOD'), VERDICT_SCHEME).status, 'unavailable');
  const unsure = { status: 'unsure', verdict: 'UGLY', confidence: 0.2, model: 'jev' } as unknown as JevVerdict;
  assert.deepEqual(normalizeJev(unsure, undefined), { status: 'unsure', verdict: 'BAD', confidence: 0.2, model: 'jev' });
  assert.deepEqual(normalizeJev({ status: 'not_a_label', model: 'jev' }, undefined), { status: 'not_a_label', model: 'jev' });
});

test('old "UGLY" in on-device history shows BAD; old "BAD" shows OKAY', () => {
  const saved = [
    { id: '3', date: '2026-11-01T00:00:00.000Z', result: result('UGLY') },
    { id: '2', date: '2026-11-01T00:00:00.000Z', result: result('BAD') },
    { id: '1', date: '2026-11-01T00:00:00.000Z', result: result('CLEAN') },
  ];
  const h = readHistory(saved);
  assert.deepEqual(h.map((e) => e.result.verdict), ['BAD', 'OKAY', 'CLEAN']);
  assert.ok(h.every((e) => e.scheme === VERDICT_SCHEME));
  // Converting twice changes nothing (new BAD stays BAD).
  assert.deepEqual(readHistory(JSON.parse(JSON.stringify(h))), h);
});

test('new history entries are not converted again', () => {
  const h = addToHistory([], result('BAD'), new Date(2026, 10, 9));
  assert.equal(readHistory(JSON.parse(JSON.stringify(h)))[0].result.verdict, 'BAD');
});

test('unreadable history is dropped instead of crashing', () => {
  assert.deepEqual(readHistory(null), []);
  assert.deepEqual(readHistory({}), []);
  assert.deepEqual(readHistory([null, { id: 'x' }, { id: 'y', date: '', result: result('GOOD') }]), []);
});
