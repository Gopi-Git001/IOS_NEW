import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseScanConsent, SCAN_CONSENT_KEY, scanConsentStore } from './scanConsent';
import type { KeyValueStorage } from './stored';

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const writes: [string, string][] = [];
  const storage: KeyValueStorage = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      writes.push([key, value]);
      data.set(key, value);
    },
  };
  return { storage, data, writes };
}

/** A shutter tap through the gate; records what happened instead of capturing or calling the network. */
async function tap(consent: ReturnType<typeof scanConsentStore>) {
  const events: string[] = [];
  const ran = await consent.gate(() => events.push('capture'), () => events.push('notice'));
  return { ran, events };
}

test('only a saved true counts as accepted', () => {
  assert.equal(parseScanConsent(true), true);
  for (const value of [false, null, undefined, 'true', 1, {}, []]) assert.equal(parseScanConsent(value), false);
});

test('not accepted: the tap shows the notice and nothing is captured or stored', async () => {
  const { storage, writes } = memory();
  const consent = scanConsentStore(storage);
  assert.deepEqual(await tap(consent), { ran: false, events: ['notice'] });
  assert.deepEqual(writes, []);
});

test('not now: stores nothing, does not scan, and the next tap shows the notice again', async () => {
  const { storage, writes } = memory();
  const consent = scanConsentStore(storage);
  await tap(consent); // notice shown; the user taps "Not now", which only closes it
  assert.deepEqual(await tap(consent), { ran: false, events: ['notice'] });
  assert.deepEqual(writes, []);
  // After a restart it still asks.
  assert.deepEqual(await tap(scanConsentStore(storage)), { ran: false, events: ['notice'] });
});

test('accept: stores the flag, the scan continues, and it never asks again after a restart', async () => {
  const { storage, data } = memory();
  const consent = scanConsentStore(storage);
  assert.equal((await tap(consent)).ran, false);
  consent.accept();
  await consent.store.written();
  assert.equal(data.get(SCAN_CONSENT_KEY), 'true');
  assert.deepEqual(await tap(consent), { ran: true, events: ['capture'] });

  const restarted = scanConsentStore(storage);
  assert.deepEqual(await tap(restarted), { ran: true, events: ['capture'] });
  assert.deepEqual(await tap(restarted), { ran: true, events: ['capture'] });
});

test('an earlier acceptance is read before the first tap decides', async () => {
  let release!: () => void;
  const slow: KeyValueStorage = {
    getItem: () => new Promise((resolve) => { release = () => resolve('true'); }),
    setItem: async () => {},
  };
  const consent = scanConsentStore(slow);
  const pending = tap(consent);
  release();
  assert.deepEqual(await pending, { ran: true, events: ['capture'] });
});

test('unreadable or corrupted storage asks again', async () => {
  const broken: KeyValueStorage = { getItem: async () => { throw new Error('io'); }, setItem: async () => {} };
  assert.equal((await tap(scanConsentStore(broken))).ran, false);
  assert.equal((await tap(scanConsentStore(memory({ [SCAN_CONSENT_KEY]: '{not json' }).storage))).ran, false);
  assert.equal((await tap(scanConsentStore(memory({ [SCAN_CONSENT_KEY]: 'false' }).storage))).ran, false);
});
