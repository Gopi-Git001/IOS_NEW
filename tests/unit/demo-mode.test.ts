import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appMode, DEMO_DELAY_MS, placeholderAt, placeholderResults } from '../../src/placeholderResults';

test('demo results cycle CLEAN, OKAY, BAD in the v3 names', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map((n) => placeholderAt(n).verdict),
    ['CLEAN', 'OKAY', 'BAD', 'CLEAN', 'OKAY', 'BAD'],
  );
  for (const r of placeholderResults) assert.ok(['CLEAN', 'OKAY', 'BAD'].includes(r.verdict));
  assert.ok(!placeholderResults.some((r) => (r.verdict as string) === 'UGLY'));
});

test('demo results are internally consistent with the rules', () => {
  const [clean, okay, bad] = placeholderResults;
  assert.equal(clean.addedSugars.length + clean.sweeteners.length, 0);
  assert.equal(okay.addedSugars.length, 0);
  assert.ok(bad.addedSugars.length > 0);
});

test('demo verdict arrives after about 1.6 s', () => {
  assert.equal(DEMO_DELAY_MS, 1600);
});

test('native release builds without Supabase settings never run the demo', () => {
  assert.equal(appMode(false, false, 'ios'), 'not-configured');
  assert.equal(appMode(false, false, 'android'), 'not-configured');
});

test('web builds (including a local build:web) without Supabase settings run the demo', () => {
  assert.equal(appMode(false, false, 'web'), 'demo');
});

test('development without Supabase settings runs the demo on every platform', () => {
  for (const p of ['ios', 'android', 'web']) assert.equal(appMode(true, false, p), 'demo');
});

test('with Supabase settings every platform is live', () => {
  for (const p of ['ios', 'android', 'web']) {
    assert.equal(appMode(false, true, p), 'live');
    assert.equal(appMode(true, true, p), 'live');
  }
});
