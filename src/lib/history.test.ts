import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ScanResult } from '../types';
import { HISTORY_LIMIT } from './display';
import { HISTORY_KEY, historyStore } from './history';
import type { KeyValueStorage } from './stored';

/** In-memory AsyncStorage: the Map outlives a store, like the files on the phone outlive a force quit. */
function memoryStorage(data = new Map<string, string>()): KeyValueStorage & { data: Map<string, string> } {
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
  };
}

const verdicts = ['CLEAN', 'OKAY', 'BAD'] as const;

/** A scan with full lists, larger than a typical one. */
function scan(i: number): ScanResult {
  const names = (kind: string) => Array.from({ length: 8 }, (_, n) => `${kind} ingredient name number ${n}`.slice(0, 40));
  return {
    verdict: verdicts[i % 3],
    headline: `Scan ${i}: more than 4 g added sugar per serving`,
    naturalSugars: names('natural'),
    addedSugars: names('added'),
    sweeteners: names('sweetener'),
    note: 'Not medical advice',
    sugarStacking: { distinct: 3, stacked: true, firstPosition: 2, firstNested: false, ingredientCount: 24 },
    analysis: {
      policyVersion: 'v3',
      registryVersion: '2026-11',
      ruleId: 'added_sugar_over_limit',
      explanation: 'Added sugar per serving is over the 4 g limit for OKAY.',
      missing: [],
      warnings: ['cut-off list'],
      unresolved: ['natural flavour'],
    },
  };
}

async function scanMany(storage: KeyValueStorage, count: number) {
  const app = historyStore(storage);
  await app.store.loaded;
  for (let i = 0; i < count; i++) await app.recordScan(scan(i), new Date(Date.UTC(2026, 10, 13, 0, 0, i)));
  await app.store.written();
  return app;
}

test('after 60 scans and a force quit, reopening shows the latest 50, newest first', async () => {
  const storage = memoryStorage();
  await scanMany(storage, 60);

  const reopened = historyStore(memoryStorage(storage.data));
  await reopened.store.loaded;
  const history = reopened.store.get();
  assert.equal(history.length, HISTORY_LIMIT);
  assert.equal(history[0].result.headline, scan(59).headline);
  assert.equal(history[HISTORY_LIMIT - 1].result.headline, scan(10).headline);
  assert.deepEqual(history[0].result.addedSugars, scan(59).addedSugars);
});

test('50 scans with full lists stay well under 100 KB on the device', async () => {
  const storage = memoryStorage();
  await scanMany(storage, HISTORY_LIMIT);
  const bytes = Buffer.byteLength(storage.data.get(HISTORY_KEY) ?? '');
  console.log(`50 scans with full lists: ${bytes} bytes (${(bytes / HISTORY_LIMIT).toFixed(0)} bytes per scan)`);
  assert.ok(bytes > 0);
  assert.ok(bytes < 100_000, `history is ${bytes} bytes`);
});

test('a scan recorded before the saved history has loaded is added to it, not replacing it', async () => {
  const storage = memoryStorage();
  await scanMany(storage, HISTORY_LIMIT);

  const reopened = historyStore(memoryStorage(storage.data));
  const recording = reopened.recordScan(scan(100)); // before `loaded`
  await recording;
  await reopened.store.written();
  const history = reopened.store.get();
  assert.equal(history.length, HISTORY_LIMIT);
  assert.equal(history[0].result.headline, scan(100).headline);
  assert.equal(history[1].result.headline, scan(HISTORY_LIMIT - 1).headline);
});

test('a longer saved history (older app versions) loads as the latest 50', async () => {
  const storage = memoryStorage();
  const saved = Array.from({ length: 80 }, (_, i) => ({ id: `${i}`, date: new Date(0).toISOString(), result: scan(i) }));
  storage.data.set(HISTORY_KEY, JSON.stringify(saved));
  const app = historyStore(storage);
  await app.store.loaded;
  assert.equal(app.store.get().length, HISTORY_LIMIT);
  assert.equal(app.store.get()[0].result.headline, scan(0).headline);
});

test('clear history empties the device copy too', async () => {
  const storage = memoryStorage();
  const app = await scanMany(storage, 5);
  app.clearHistory();
  await app.store.written();
  assert.equal(storage.data.get(HISTORY_KEY), '[]');
});

test('unreadable saved history starts empty instead of crashing', async () => {
  const storage = memoryStorage();
  storage.data.set(HISTORY_KEY, '{not json');
  const app = historyStore(storage);
  await app.store.loaded;
  assert.deepEqual(app.store.get(), []);
});
