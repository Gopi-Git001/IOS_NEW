import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ScanResult } from '../types';
import { HISTORY_LIMIT } from './display';
import { createAccountDeleter } from './accountDeletion';
import { HISTORY_KEY, historyStore } from './history';
import type { KeyValueStorage } from './stored';

function memoryStorage(data = new Map<string, string>()): KeyValueStorage & { data: Map<string, string> } {
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
  };
}

const result = (i: number): ScanResult => ({
  verdict: 'BAD',
  headline: `Scan ${i}: more than 4 g added sugar per serving`,
  naturalSugars: [],
  addedSugars: ['sugar'],
  sweeteners: [],
  note: 'Not medical advice',
});

test('success: server first, then every local step', async () => {
  const calls: string[] = [];
  const del = createAccountDeleter(async () => void calls.push('server'), [() => calls.push('profile'), () => calls.push('history')]);
  await del();
  assert.deepEqual(calls, ['server', 'profile', 'history']);
});

test('network failure: throws and keeps everything on the phone', async () => {
  const calls: string[] = [];
  const del = createAccountDeleter(
    async () => {
      throw new Error('Failed to send a request to the Edge Function');
    },
    [() => calls.push('profile'), () => calls.push('history')],
  );
  await assert.rejects(del(), /Failed to send/);
  assert.deepEqual(calls, []);
});

test('a failed delete can be retried', async () => {
  let attempts = 0;
  const cleared: string[] = [];
  const del = createAccountDeleter(async () => {
    attempts++;
    if (attempts === 1) throw new Error('offline');
  }, [() => cleared.push('history')]);
  await assert.rejects(del());
  await del();
  assert.equal(attempts, 2);
  assert.deepEqual(cleared, ['history']);
});

test('a local step that throws does not stop the others or fail the delete', async () => {
  const cleared: string[] = [];
  const del = createAccountDeleter(async () => {}, [
    () => {
      throw new Error('storage full');
    },
    () => cleared.push('history'),
  ]);
  await del();
  assert.deepEqual(cleared, ['history']);
});

test('double tap: one server call while a delete is running', async () => {
  let calls = 0;
  let finish!: () => void;
  const del = createAccountDeleter(
    () =>
      new Promise<void>((resolve) => {
        calls++;
        finish = resolve;
      }),
    [],
  );
  const first = del();
  const second = del();
  assert.equal(first, second);
  finish();
  await first;
  assert.equal(calls, 1);
});

test('delete clears a full saved history (50 scans), and it stays empty after a restart', async () => {
  const storage = memoryStorage();
  const before = historyStore(storage);
  for (let i = 0; i < HISTORY_LIMIT; i++) await before.recordScan(result(i));
  assert.equal(before.store.get().length, HISTORY_LIMIT);

  const del = createAccountDeleter(async () => {}, [before.clearHistory]);
  await del();
  await before.store.written();
  assert.deepEqual(before.store.get(), []);
  assert.equal(storage.data.get(HISTORY_KEY), '[]');

  const afterRestart = historyStore(storage);
  await afterRestart.store.loaded;
  assert.deepEqual(afterRestart.store.get(), []);
});

test('failed delete leaves the saved history on the phone', async () => {
  const storage = memoryStorage();
  const history = historyStore(storage);
  await history.recordScan(result(1));
  const del = createAccountDeleter(async () => {
    throw new Error('offline');
  }, [history.clearHistory]);
  await assert.rejects(del());
  await history.store.written();
  assert.equal(history.store.get().length, 1);
  assert.equal(JSON.parse(storage.data.get(HISTORY_KEY) ?? '[]').length, 1);
});
