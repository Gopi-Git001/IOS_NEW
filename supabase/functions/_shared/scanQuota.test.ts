import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allow, allowScan } from './guard.ts';

/** Mirrors quickgob_rate_limit: every request increments, including denied hits. */
function limiter(initial: Record<string, number> = {}) {
  const hits = { ...initial };
  const calls: string[] = [];
  const admin = {
    async rpc(_name: string, args: { p_key: string; p_window_seconds: number; p_limit: number }) {
      calls.push(args.p_key);
      assert.equal(args.p_window_seconds, 86_400);
      hits[args.p_key] = (hits[args.p_key] ?? 0) + 1;
      return { data: hits[args.p_key] <= args.p_limit, error: null };
    },
  } as unknown as Parameters<typeof allowScan>[0];
  return { admin, hits, calls };
}

test('a unified scan reserves each legacy model allowance exactly once', async () => {
  const { admin, hits, calls } = limiter();
  assert.equal(await allowScan(admin, 'account', 100), true);
  assert.deepEqual(calls, ['label:account', 'verdict:account']);
  assert.deepEqual(hits, { 'label:account': 1, 'verdict:account': 1 });
});

test('an exhausted reader short-circuits without burning a verdict reservation', async () => {
  const { admin, hits, calls } = limiter({ 'label:account': 100, 'verdict:account': 20 });
  assert.equal(await allowScan(admin, 'account', 100), false);
  assert.deepEqual(calls, ['label:account']);
  assert.deepEqual(hits, { 'label:account': 101, 'verdict:account': 20 });
});

test('an exhausted verdict denies the scan even when the reader permits it', async () => {
  const { admin, hits, calls } = limiter({ 'label:account': 20, 'verdict:account': 100 });
  assert.equal(await allowScan(admin, 'account', 100), false);
  assert.deepEqual(calls, ['label:account', 'verdict:account']);
  // Separate RPCs cannot roll back the first reservation if the second denies.
  assert.deepEqual(hits, { 'label:account': 21, 'verdict:account': 101 });
});

test('mixing legacy and unified scans never permits over 100 calls to either model', async () => {
  const { admin } = limiter();
  let jev = 0;
  let reader = 0;
  for (let i = 0; i < 200; i++) {
    if (i % 2 === 0) {
      if (await allowScan(admin, 'account', 100)) { jev++; reader++; }
    } else {
      if (await allow(admin, 'verdict:account', 86_400, 100)) jev++;
      if (await allow(admin, 'label:account', 86_400, 100)) reader++;
    }
  }
  assert.equal(jev, 100);
  assert.equal(reader, 100);
});
