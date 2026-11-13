import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ScanResult } from '../types';
import { HISTORY_LIMIT } from './display';
import {
  confirmDeleted,
  createAccountDeleter,
  DELETE_FAILED,
  type DeleteReply,
  DeleteNotConfirmedError,
  deletedFlag,
  isDeleteConfirmed,
} from './accountDeletion';
import { handleDelete } from '../../supabase/functions/delete-account/handler.ts';
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

// ---------- Server confirmation (the bug: the app signed out on any 2xx) ----------

test('confirmed only for 2xx with { deleted: true }', () => {
  assert.equal(isDeleteConfirmed({ status: 200, data: { deleted: true } }), true);
  assert.equal(isDeleteConfirmed({ status: 200, data: { deleted: true, already: true } }), true);
  assert.equal(isDeleteConfirmed({ status: 200, data: {} }), false);
  assert.equal(isDeleteConfirmed({ status: 200, data: null }), false);
  assert.equal(isDeleteConfirmed({ status: 200, data: 'ok' }), false);
  assert.equal(isDeleteConfirmed({ status: 200, data: { deleted: 'true' } }), false);
  assert.equal(isDeleteConfirmed({ status: 200, data: { deleted: false } }), false);
  assert.equal(isDeleteConfirmed({ status: 500, data: { deleted: true } }), false);
  assert.equal(isDeleteConfirmed({ status: 401, data: { error: 'Not signed in' } }), false);
  assert.equal(isDeleteConfirmed({ status: 0, data: null }), false);
});

test('confirmDeleted throws the server message, or the fallback', () => {
  assert.doesNotThrow(() => confirmDeleted({ status: 200, data: { deleted: true } }));
  assert.throws(() => confirmDeleted({ status: 500, data: null, message: 'Server says no' }), /Server says no/);
  assert.throws(() => confirmDeleted({ status: 200, data: {} }), (e: Error) => e instanceof DeleteNotConfirmedError && e.message === DELETE_FAILED);
});

test('deleted flag for logs', () => {
  assert.equal(deletedFlag({ deleted: true }), 'true');
  assert.equal(deletedFlag({ deleted: false }), 'false');
  assert.equal(deletedFlag(null), 'missing');
  assert.equal(deletedFlag({}), 'missing');
});

function flow(reply: DeleteReply) {
  const calls: string[] = [];
  const logs: string[] = [];
  const del = createAccountDeleter(
    async () => {
      calls.push('server');
      confirmDeleted(reply);
    },
    [() => calls.push('profile'), () => calls.push('history')],
    async () => void calls.push('signOut'),
    (l) => logs.push(l),
  );
  return { del, calls, logs };
}

test('server confirms: clear local data, then sign out', async () => {
  const { del, calls, logs } = flow({ status: 200, data: { deleted: true } });
  await del();
  assert.deepEqual(calls, ['server', 'profile', 'history', 'signOut']);
  assert.ok(logs.some((l) => l.startsWith('[delete] local cleanup')));
  assert.ok(logs.includes('[delete] signed out'));
});

for (const [name, reply] of [
  ['200 without deleted flag (old deployed function)', { status: 200, data: {} }],
  ['200 with deleted: false', { status: 200, data: { deleted: false } }],
  ['500 server error', { status: 500, data: null, message: 'Could not delete account. Try again.' }],
  ['401 not signed in', { status: 401, data: null, message: 'Not signed in' }],
  ['network failure', { status: 0, data: null }],
] as [string, DeleteReply][]) {
  test(`not confirmed (${name}): error, no cleanup, stays signed in`, async () => {
    const { del, calls, logs } = flow(reply);
    await assert.rejects(del(), DeleteNotConfirmedError);
    assert.deepEqual(calls, ['server']);
    assert.deepEqual(logs, []);
  });
}

test('sign-out still runs when a local step throws; a sign-out error does not fail the delete', async () => {
  const calls: string[] = [];
  const del = createAccountDeleter(async () => {}, [() => { throw new Error('storage'); }], async () => {
    calls.push('signOut');
    throw new Error('offline');
  });
  await del();
  assert.deepEqual(calls, ['signOut']);
});

test('logs carry no tokens or ids', async () => {
  const { del, logs } = flow({ status: 200, data: { deleted: true } });
  await del();
  for (const l of logs) assert.match(l, /^\[delete\] [a-z -]+(\(\d+\/\d+ steps ok\))?$/);
});

// ---------- Edge Function handler (supabase/functions/delete-account/handler.ts) ----------

const USER = { id: 'u-1' };
type Deps = Parameters<typeof handleDelete>[1];
function deps(over: Partial<Deps> = {}) {
  const calls: string[] = [];
  const d: Deps = {
    getUser: async (jwt) => (calls.push(`getUser:${jwt}`), { user: jwt === 'good' ? USER : null, error: jwt === 'good' ? null : { status: 401 } }),
    deleteUser: async (id) => (calls.push(`delete:${id}`), { error: null }),
    getUserById: async () => (calls.push('check'), { user: null, error: { code: 'user_not_found', status: 404 } }),
    ...over,
  };
  return { d, calls };
}
const post = (token?: string, method = 'POST') => new Request('https://x/fn', { method, headers: token ? { Authorization: `Bearer ${token}` } : {} });

test('handler: deletes the caller (id from the verified token) and confirms it is gone', async () => {
  const { d, calls } = deps();
  const r = await handleDelete(post('good'), d);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { deleted: true });
  assert.deepEqual(calls, ['getUser:good', 'delete:u-1', 'check']);
});

test('handler: no token or a bad token is 401 and deletes nothing', async () => {
  for (const req of [post(), post('bad')]) {
    const { d, calls } = deps();
    const r = await handleDelete(req, d);
    assert.equal(r.status, 401);
    assert.equal((await r.json()).deleted, false);
    assert.ok(!calls.some((c) => c.startsWith('delete')));
  }
});

test('handler: GET is 405', async () => {
  const { d, calls } = deps();
  assert.equal((await handleDelete(post('good', 'GET'), d)).status, 405);
  assert.deepEqual(calls, []);
});

test('handler: delete error is 500 deleted:false', async () => {
  const { d } = deps({ deleteUser: async () => ({ error: { status: 500, message: 'db' } }) });
  const r = await handleDelete(post('good'), d);
  assert.equal(r.status, 500);
  assert.equal((await r.json()).deleted, false);
});

test('handler: user still present after delete is 500 deleted:false', async () => {
  const { d } = deps({ getUserById: async () => ({ user: USER, error: null }) });
  const r = await handleDelete(post('good'), d);
  assert.equal(r.status, 500);
  assert.equal((await r.json()).deleted, false);
});

test('handler: retry after a lost reply (token valid, user already gone) is deleted:true', async () => {
  const { d, calls } = deps({ getUser: async () => ({ user: null, error: { code: 'user_not_found', status: 403 } }) });
  const r = await handleDelete(post('stale'), d);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).deleted, true);
  assert.ok(!calls.some((c) => c.startsWith('delete')));
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
