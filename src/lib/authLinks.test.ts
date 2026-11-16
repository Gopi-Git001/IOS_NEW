import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCodeExchanger, type UsedCodeStore } from './authFlow.ts';
import {
  createAuthLinkHandler,
  describeLinkReceived,
  GOOGLE_QUERY_PARAMS,
  LINK_SIGN_IN_FAILED,
  SIGN_IN_EXPIRED,
  type AuthLinkState,
} from './authLinks.ts';

const HOST = 'c-robbin001-b1arzb-mwiv9mvop6bq9i5m.on.expo.app';
const link = (query: string) => `exps://${HOST}/--/auth?${query}`;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/** A handler wired to a real code exchanger and a fake Supabase (session after a good exchange). */
function setup(opts: { results?: (string | null)[]; gate?: Promise<void>; store?: UsedCodeStore } = {}) {
  const calls: string[] = [];
  const logs: string[] = [];
  const states: AuthLinkState[] = [];
  let session = false;
  const results = [...(opts.results ?? [])];
  const exchanger = createCodeExchanger(async (code) => {
    calls.push(code);
    if (opts.gate) await opts.gate;
    const error = results.length ? results.shift()! : null;
    if (!error) session = true;
    return error;
  }, opts.store);
  const handler = createAuthLinkHandler({
    exchange: (code) => exchanger.exchange(code),
    hasSession: async () => session,
    log: (line) => logs.push(line),
  });
  handler.subscribe((s) => states.push(s));
  return { handler, calls, logs, states, signOut: () => (session = false) };
}

// ---- 1. Every incoming link, each new code once ----

test('5 sign-in / sign-out rounds: every new code from a url event is exchanged once', async () => {
  const t = setup();
  for (let i = 1; i <= 5; i++) {
    assert.deepEqual(await t.handler.handle(link(`code=round-${i}`), 'url event'), { kind: 'signed-in' });
    t.signOut();
  }
  assert.deepEqual(t.calls, ['round-1', 'round-2', 'round-3', 'round-4', 'round-5']);
});

test('the same link from the url event and the auth session result is exchanged once', async () => {
  const gate = deferred<void>();
  const t = setup({ gate: gate.promise });
  const fromEvent = t.handler.handle(link('code=c1'), 'url event');
  const fromResult = t.handler.handle(link('code=c1'), 'auth session result');
  gate.resolve();
  assert.deepEqual(await fromEvent, { kind: 'signed-in' });
  assert.deepEqual(await fromResult, { kind: 'signed-in' });
  assert.deepEqual(t.calls, ['c1']);
});

test('a spent initial link replayed after sign-out is not sent again (aa996d7 log:46-47)', async () => {
  const t = setup();
  assert.deepEqual(await t.handler.handle(link('code=first'), 'initial'), { kind: 'signed-in' });
  t.signOut();
  await t.handler.handle(link('code=first'), 'initial');
  assert.deepEqual(t.calls, ['first']);
  // ...and the next sign-in's new code still goes through.
  assert.deepEqual(await t.handler.handle(link('code=second'), 'url event'), { kind: 'signed-in' });
  assert.deepEqual(t.calls, ['first', 'second']);
});

test('non sign-in links and an empty initial URL are ignored but logged', async () => {
  const t = setup();
  assert.deepEqual(await t.handler.handle(null, 'initial'), { kind: 'ignored' });
  assert.deepEqual(await t.handler.handle(`exps://${HOST}/--/scan`, 'url event'), { kind: 'ignored' });
  assert.deepEqual(t.calls, []);
  assert.deepEqual(t.logs, ['link received (initial): none', 'link received (url event): code=no error=none error_description=none (not a sign-in link)']);
});

test('a link while already signed in is not exchanged', async () => {
  const t = setup();
  await t.handler.handle(link('code=a'), 'url event');
  assert.deepEqual(await t.handler.handle(link('code=b'), 'url event'), { kind: 'already-signed-in' });
  assert.deepEqual(t.calls, ['a']);
});

// ---- 5. Dev log for every link: source, code / error presence, never the code ----

test('every link received is logged with its source and never the code', async () => {
  const t = setup();
  await t.handler.handle(link('code=secret-123'), 'auth session result');
  assert.equal(t.logs[0], 'link received (auth session result): code=yes error=none error_description=none');
  assert.equal(t.logs.some((l) => l.includes('secret-123')), false);
  assert.equal(describeLinkReceived('url event', link('error=bad_oauth_state'), true), 'link received (url event): code=no error=bad_oauth_state error_description=none');
});

// ---- 2. A code is used only after exchangeCodeForSession succeeds ----

test('a failed exchange does not spend the code: the same link is retried and can sign in', async () => {
  const t = setup({ results: ['network down'] });
  assert.deepEqual(await t.handler.handle(link('code=c1'), 'url event'), { kind: 'failed', message: LINK_SIGN_IN_FAILED });
  assert.deepEqual(await t.handler.handle(link('code=c1'), 'auth session result'), { kind: 'signed-in' });
  assert.deepEqual(t.calls, ['c1', 'c1']);
});

test('exchanger: the stored "used" mark is written only after success', async () => {
  const saved = new Set<string>();
  const store: UsedCodeStore = { has: async (f) => saved.has(f), add: async (f) => void saved.add(f) };
  const results: (string | null)[] = ['invalid flow state', null];
  const calls: string[] = [];
  const run = async (code: string) => {
    calls.push(code);
    return results.shift() ?? null;
  };
  const ex = createCodeExchanger(run, store);
  assert.deepEqual(await ex.exchange('c1'), { status: 'failed', message: 'invalid flow state' });
  assert.equal(saved.size, 0);
  assert.deepEqual(await ex.exchange('c1'), { status: 'ok' });
  assert.equal(saved.size, 1);
  // After a reload (new exchanger, same storage) the spent code is skipped.
  assert.deepEqual(await createCodeExchanger(run, store).exchange('c1'), { status: 'skipped', reason: 'code already used' });
  assert.deepEqual(calls, ['c1', 'c1']);
});

// ---- 3. An error in the return link: stay in the app, "Sign-in expired" ----

test('error=bad_oauth_state shows "Sign-in expired, please try again" and logs it', async () => {
  const t = setup();
  const url = link('error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+not+found');
  assert.deepEqual(await t.handler.handle(url, 'url event'), { kind: 'error', message: SIGN_IN_EXPIRED });
  assert.equal(SIGN_IN_EXPIRED, 'Sign-in expired, please try again');
  assert.equal(t.handler.state.error, SIGN_IN_EXPIRED);
  assert.ok(t.logs.some((l) => l.startsWith('return link error: invalid_request error_code=bad_oauth_state (url event)')));
  assert.deepEqual(t.calls, []);
});

test('any error (fragment too) gets the same message; the next tap clears it', async () => {
  const t = setup();
  for (const url of [`exps://${HOST}/--/auth#error=server_error`, 'reallabel://auth?error=access_denied', link('error_code=bad_oauth_state')]) {
    assert.deepEqual(await t.handler.handle(url, 'auth session result'), { kind: 'error', message: SIGN_IN_EXPIRED });
  }
  t.handler.clearError();
  assert.equal(t.handler.state.error, null);
});

test('an error that arrived before the screen subscribed is still shown', async () => {
  const t = setup();
  await t.handler.handle(link('error=bad_oauth_state'), 'initial');
  const seen: AuthLinkState[] = [];
  t.handler.subscribe((s) => seen.push(s));
  assert.equal(seen[0].error, SIGN_IN_EXPIRED);
});

test('busy is reported while a code is exchanged', async () => {
  const gate = deferred<void>();
  const t = setup({ gate: gate.promise });
  const pending = t.handler.handle(link('code=c1'), 'url event');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(t.handler.state.busy, true);
  gate.resolve();
  await pending;
  assert.equal(t.handler.state.busy, false);
});

// ---- 4. Google always shows the account chooser ----

test('Google gets prompt=select_account', () => {
  assert.deepEqual({ ...GOOGLE_QUERY_PARAMS }, { prompt: 'select_account' });
});
