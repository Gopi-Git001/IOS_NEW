import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { combine } from './combine.ts';
import type { ScanEvent } from './scanStream.ts';
import type { ScanUpdate } from './scan.ts';
import type { JevVerdict, ScanResult } from '../types';

const result: ScanResult = { verdict: 'CLEAN', headline: 'No added sugar', naturalSugars: [], addedSugars: [], sweeteners: [] };
const jev: JevVerdict = { status: 'decided', verdict: 'BAD', confidence: 0.9, model: 'test' };
class RetryableReadError extends Error {}
class UnreadableError extends Error {}
const photo = { uri: 'test', width: 1920, height: 1440, upload: 'jpeg', meta: { torch: true } };

// Isolate the real orchestrator from Expo/native imports, with no network or paid model access.
function harness(stream: (emit: (event: ScanEvent) => void) => Promise<boolean>) {
  let quickCalls = 0;
  let readerCalls = 0;
  const module = { exports: {} as { runScan: (p: typeof photo, update: (u: ScanUpdate) => void) => Promise<void> } };
  const api = {
    RetryableReadError, UnreadableError,
    preparePhoto: async (p: typeof photo) => p.upload,
    streamScan: async (image: string, emit: (event: ScanEvent) => void, meta: unknown) => {
      assert.equal(image, photo.upload); assert.equal(meta, photo.meta);
      return stream(emit);
    },
    quickVerdict: async () => { quickCalls++; return jev; },
    readLabel: async (image: string, meta: unknown) => {
      assert.equal(image, photo.upload); assert.equal(meta, photo.meta);
      readerCalls++; return result;
    },
  };
  const code = ts.transpileModule(readFileSync(new URL('./scan.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, {
    module, exports: module.exports, performance,
    require: (id: string) => {
      if (id === './api') return api;
      if (id === './combine') return { combine };
      if (id === './scanTiming') return { markScan() {}, noteScan() {} };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return { run: module.exports.runScan, quickCalls: () => quickCalls, readerCalls: () => readerCalls };
}

test('streamed reader timeout exposes lists retry and retries only the reader for the same photo', async () => {
  const h = harness(async (emit) => {
    emit({ event: 'jev', jev });
    emit({ event: 'reading', status: 504, code: 'reader_timeout', error: 'Unavailable' });
    return true;
  });
  const updates: ScanUpdate[] = [];
  await h.run(photo, (u) => updates.push(u));
  const failed = updates.at(-1);
  assert.equal(failed?.status, 'done');
  if (failed?.status !== 'done') throw Error('Expected verdict');
  assert.equal(failed.result.verdict, 'BAD');
  assert.equal(failed.listsPending, false);
  assert.ok(failed.retryLists);
  failed.retryLists();
  await setImmediate();
  assert.equal(h.readerCalls(), 1);
  assert.equal(h.quickCalls(), 0);
  const retried = updates.at(-1);
  assert.equal(retried?.status === 'done' && retried.result.verdict, 'BAD');
  assert.equal(retried?.status === 'done' && retried.listsPending, false);
  assert.equal(retried?.status === 'done' && retried.retryLists, undefined);
});

test('a dropped stream after Jev retains the verdict and exposes an explicit lists retry', async () => {
  const h = harness(async (emit) => {
    emit({ event: 'jev', jev });
    throw new RetryableReadError('Connection dropped');
  });
  const updates: ScanUpdate[] = [];
  await h.run(photo, (u) => updates.push(u));
  const last = updates.at(-1);
  assert.equal(last?.status === 'done' && last.listsRetry, true);
  assert.ok(last?.status === 'done' && last.retryLists);
  assert.equal(h.quickCalls(), 0);
  assert.equal(h.readerCalls(), 0);
});

test('only a missing unified endpoint uses the two legacy calls', async () => {
  const h = harness(async () => false);
  await h.run(photo, () => {});
  assert.equal(h.quickCalls(), 1);
  assert.equal(h.readerCalls(), 1);
});

test('negative Jev waits for the reader instead of cancelling or retrying', async () => {
  const updates: ScanUpdate[] = [];
  const h = harness(async (emit) => {
    emit({ event: 'jev', jev: { status: 'unreadable', model: 'test' } });
    assert.equal(updates.length, 0);
    emit({ event: 'reading', status: 200, result });
    return true;
  });
  await h.run(photo, (u) => updates.push(u));
  assert.equal(updates.at(-1)?.status, 'done');
  assert.equal(h.quickCalls(), 0);
  assert.equal(h.readerCalls(), 0);
});
