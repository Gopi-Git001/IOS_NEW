// runBothCalls: arrival order, Jev's wait, a late Jev, the lists retry and errors. Real timers, short wait.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UNCLEAR } from './combine.ts';
import { JEV_WAIT_MS, runBothCalls, type BothCalls, type ReadFailure, type ScanUpdate } from './scanFlow.ts';
import type { JevVerdict, ScanResult, Verdict } from '../types.ts';

const WAIT = 40;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tick = () => sleep(0);

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const reading = (verdict: Verdict, addedSugars: string[] = []): ScanResult => ({
  verdict, headline: `rules ${verdict}`, naturalSugars: [], addedSugars, sweeteners: [],
});
const decided = (verdict: Verdict): JevVerdict => ({ status: 'decided', verdict, confidence: 0.9, model: 'jev' });

class Unreadable extends Error {}
class Retryable extends Error {}
const readFailure = (e: unknown): ReadFailure => (e instanceof Unreadable ? 'unreadable' : e instanceof Retryable ? 'retryable' : 'other');

/** Starts a scan whose calls the test answers by hand. `readLabel` may be called more than once (lists retry). */
function start(extra: Partial<BothCalls> = {}) {
  const jev = deferred<JevVerdict>();
  const reads = [deferred<ScanResult>()];
  const updates: ScanUpdate[] = [];
  const expired: boolean[] = [];
  const marks: string[] = [];
  let readCalls = 0;
  const run = runBothCalls(
    {
      quickVerdict: () => jev.promise,
      readLabel: () => {
        if (!reads[readCalls]) reads[readCalls] = deferred<ScanResult>();
        return reads[readCalls++].promise;
      },
      readFailure,
      mark: (s) => marks.push(s),
      onJevWaitExpired: (pending) => expired.push(pending),
      waitMs: WAIT,
      ...extra,
    },
    (u) => updates.push(u),
  );
  const read = (n: number) => (reads[n] ??= deferred<ScanResult>());
  return { jev, read, updates, expired, marks, run, readCalls: () => readCalls };
}

function done(u: ScanUpdate | undefined) {
  assert.equal(u?.status, 'done', `expected a result, got ${JSON.stringify(u)}`);
  if (u?.status !== 'done') throw new Error('unreachable');
  return u;
}

test('the default wait is 6 s', () => {
  assert.equal(JEV_WAIT_MS, 6000);
});

test('Jev first, then the reading: nothing shows until both are in, then one verdict', async () => {
  const s = start();
  s.jev.resolve(decided('OKAY'));
  await tick();
  assert.equal(s.updates.length, 0);
  s.read(0).resolve(reading('BAD', ['Cane Sugar']));
  await s.run;
  assert.equal(s.updates.length, 1);
  assert.equal(done(s.updates[0]).result.verdict, 'OKAY');
  assert.deepEqual(s.marks, ['quick_verdict_response', 'scan_label_response']);
});

test('reading first, Jev inside the wait: Jev decides and the rules verdict never flashes', async () => {
  const s = start();
  s.read(0).resolve(reading('BAD', ['Cane Sugar']));
  await tick();
  assert.equal(s.updates.length, 0);
  s.jev.resolve(decided('OKAY'));
  await s.run;
  assert.equal(s.updates.length, 1);
  assert.equal(done(s.updates[0]).result.verdict, 'OKAY');
  assert.deepEqual(s.expired, []);
});

test('Jev past the wait: the rules verdict shows, and the late Jev answer changes nothing', async () => {
  const s = start();
  s.read(0).resolve(reading('BAD', ['Cane Sugar']));
  await sleep(WAIT * 2);
  assert.deepEqual(s.expired, [true]);
  assert.equal(s.updates.length, 1);
  assert.equal(done(s.updates[0]).result.verdict, 'BAD');
  s.jev.resolve(decided('CLEAN'));
  await s.run;
  assert.equal(s.updates.length, 1);
  assert.ok(s.marks.includes('quick_verdict_response'));
});

test('neither answered by the wait: still nothing, then one verdict from the rules', async () => {
  const s = start();
  await sleep(WAIT * 2);
  assert.deepEqual(s.expired, [true]);
  assert.equal(s.updates.length, 0);
  s.read(0).resolve(reading('CLEAN'));
  await tick();
  s.jev.resolve(decided('BAD'));
  await s.run;
  assert.equal(s.updates.length, 1);
  assert.equal(done(s.updates[0]).result.verdict, 'CLEAN');
});

test('Jev answered but the reading is slow past the wait: waits for the reading, Jev still decides', async () => {
  const s = start();
  s.jev.resolve(decided('OKAY'));
  await sleep(WAIT * 2);
  assert.deepEqual(s.expired, [false]);
  assert.equal(s.updates.length, 0);
  s.read(0).resolve(reading('CLEAN'));
  await s.run;
  assert.equal(s.updates.length, 1);
  assert.equal(done(s.updates[0]).result.verdict, 'OKAY');
});

test('both answered: the wait is cleared and never fires', async () => {
  const s = start();
  s.jev.resolve(decided('CLEAN'));
  s.read(0).resolve(reading('CLEAN'));
  await s.run;
  await sleep(WAIT * 2);
  assert.deepEqual(s.expired, []);
  assert.equal(s.updates.length, 1);
});

test('safety floor: Jev CLEAN with added sugar in the reading shows the rules verdict', async () => {
  const s = start();
  s.jev.resolve(decided('CLEAN'));
  s.read(0).resolve(reading('OKAY', ['2 g added per serving', 'Honey']));
  await s.run;
  assert.equal(done(s.updates[0]).result.verdict, 'OKAY');
});

test('unreadable reading: asks for a retake straight away, a late Jev is ignored', async () => {
  const s = start();
  s.read(0).reject(new Unreadable('blurry'));
  await tick();
  assert.deepEqual(s.updates, [{ status: 'error', message: UNCLEAR }]);
  s.jev.resolve(decided('CLEAN'));
  await s.run;
  assert.equal(s.updates.length, 1);
});

test('reading failed and Jev unavailable: shows the reading error message', async () => {
  const s = start();
  s.read(0).reject(new Error('Daily scan limit reached'));
  s.jev.resolve({ status: 'unavailable', reason: 'HTTP 503' });
  await s.run;
  assert.deepEqual(s.updates, [{ status: 'error', message: 'Daily scan limit reached' }]);
});

test('reading failed and Jev says not a label: the not-a-label message wins over the reading error', async () => {
  const s = start();
  s.read(0).reject(new Error('Daily scan limit reached'));
  s.jev.resolve({ status: 'not_a_label', model: 'jev' });
  await s.run;
  assert.equal(s.updates.length, 1);
  assert.equal(s.updates[0].status, 'error');
  assert.notEqual(s.updates[0].status === 'error' && s.updates[0].message, 'Daily scan limit reached');
});

test('lists retry: the verdict stays, lists load again, and safety wins if they find added sugar', async () => {
  const s = start();
  s.jev.resolve(decided('CLEAN'));
  s.read(0).reject(new Retryable('timeout'));
  await s.run;
  const first = done(s.updates[0]);
  assert.equal(first.result.verdict, 'CLEAN');
  assert.equal(first.listsRetry, true);
  assert.ok(first.retryLists);

  first.retryLists();
  assert.equal(s.readCalls(), 2);
  assert.deepEqual(s.updates[1], { status: 'done', result: first.result, listsPending: true });

  s.read(1).resolve(reading('BAD', ['Cane Sugar']));
  await tick();
  assert.equal(s.updates.length, 3);
  assert.equal(done(s.updates[2]).result.verdict, 'BAD');
});

test('lists retry does nothing once the lists have loaded', async () => {
  const s = start();
  s.jev.resolve(decided('OKAY'));
  s.read(0).reject(new Retryable('timeout'));
  await s.run;
  const retry = done(s.updates[0]).retryLists!;
  retry();
  s.read(1).resolve(reading('OKAY'));
  await tick();
  const count = s.updates.length;
  retry();
  assert.equal(s.readCalls(), 2);
  assert.equal(s.updates.length, count);
});

test('a non-retryable reading failure offers no lists retry', async () => {
  const s = start();
  s.jev.resolve(decided('OKAY'));
  s.read(0).reject(new Error('boom'));
  await s.run;
  const u = done(s.updates[0]);
  assert.equal(u.retryLists, undefined);
  assert.equal(u.result.note, "Couldn't list the sugars this time");
});
