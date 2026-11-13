import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HAPTICS_DEFAULT, playHaptic, readHapticsPref, shouldBuzz } from './haptics';

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('Haptics defaults to ON on first launch (nothing saved)', () => {
  assert.equal(HAPTICS_DEFAULT, true);
  assert.deepEqual(readHapticsPref(null), { value: true, source: 'default' });
  assert.deepEqual(readHapticsPref(undefined), { value: true, source: 'default' });
});

test('saved prefs without a haptics value keep the default ON', () => {
  assert.deepEqual(readHapticsPref({ strict: true, gentle: false }), { value: true, source: 'default' });
  assert.deepEqual(readHapticsPref({ haptics: 'yes' }), { value: true, source: 'default' });
  assert.deepEqual(readHapticsPref({ haptics: null }), { value: true, source: 'default' });
});

test('a stored on/off value wins over the default', () => {
  assert.deepEqual(readHapticsPref({ haptics: false }), { value: false, source: 'stored' });
  assert.deepEqual(readHapticsPref({ haptics: true }), { value: true, source: 'stored' });
});

test('setting on: every kind buzzes once and logs fired', async () => {
  for (const kind of ['shutter', 'verdict', 'select'] as const) {
    let calls = 0;
    const lines: string[] = [];
    assert.equal(playHaptic(kind, { haptics: true }, async () => void calls++, (l) => lines.push(l)), true);
    await flush();
    assert.equal(calls, 1);
    assert.deepEqual(lines, [`[haptics] ${kind} fired`]);
  }
});

test('setting off: nothing buzzes and the skip is logged', () => {
  for (const kind of ['shutter', 'verdict', 'select'] as const) {
    let calls = 0;
    const lines: string[] = [];
    assert.equal(playHaptic(kind, { haptics: false }, async () => void calls++, (l) => lines.push(l)), false);
    assert.equal(calls, 0);
    assert.deepEqual(lines, [`[haptics] ${kind} skipped (setting off)`]);
  }
  assert.equal(shouldBuzz({ haptics: false }), false);
  assert.equal(shouldBuzz({ haptics: true }), true);
});

test('an expo-haptics rejection or throw is logged, never thrown', async () => {
  const lines: string[] = [];
  assert.doesNotThrow(() => playHaptic('verdict', { haptics: true }, () => Promise.reject(new Error('no engine')), (l) => lines.push(l)));
  assert.equal(playHaptic('shutter', { haptics: true }, () => { throw new Error('sync'); }, (l) => lines.push(l)), false);
  await flush();
  assert.deepEqual(lines.sort(), ['[haptics] shutter error: sync', '[haptics] verdict error: no engine']);
});

test('no logger (release / tests): still safe', async () => {
  assert.equal(playHaptic('select', { haptics: true }, () => Promise.reject(new Error('x')), undefined), true);
  await flush();
});
