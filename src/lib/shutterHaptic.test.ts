import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shutterHaptic } from './shutterHaptic';

test('with Haptics off, the shutter does not buzz', () => {
  let calls = 0;
  shutterHaptic({ haptics: false }, async () => void calls++);
  assert.equal(calls, 0);
});

test('with Haptics on, the shutter buzzes once', () => {
  let calls = 0;
  shutterHaptic({ haptics: true }, async () => void calls++);
  assert.equal(calls, 1);
});

test('a failed buzz never throws', async () => {
  assert.doesNotThrow(() => shutterHaptic({ haptics: true }, () => Promise.reject(new Error('no haptics'))));
  await new Promise((resolve) => setImmediate(resolve)); // an unhandled rejection would fail the run
});
