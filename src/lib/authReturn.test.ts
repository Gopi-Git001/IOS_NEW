import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  codeFingerprint,
  createCodeExchanger,
  createSingleFlight,
  describeIncomingExchange,
  describeSessionKept,
  incomingLinkAction,
  nextGate,
  sessionDecision,
  type SessionGate,
  type SessionPath,
  type UsedCodeStore,
} from './authFlow.ts';
import { resolveNativeRedirect, type RedirectEnv } from './authRedirect.ts';

// ---- Redirect choice per platform (inputs copied from the [auth] detect lines of Nov 13) ----

const HOST = 'c-robbin001-b1arzb-mwfjknjyoj3atswt.on.expo.app';
const expoGoTunnel = (os: string): RedirectEnv => ({
  os,
  isRunningInExpoGo: true,
  executionEnvironment: 'bare',
  appOwnership: null,
  hostUri: HOST,
  linkingUri: '',
  bundleOrigin: `https://${HOST}`,
  createURL: 'reallabel://auth',
});

test('Expo Go on Android (tunnel): exps://<host>/--/auth, never reallabel://auth or the website', () => {
  const choice = resolveNativeRedirect(expoGoTunnel('android'));
  assert.equal(choice.url, `exps://${HOST}/--/auth`);
  assert.equal(choice.expoGo, true);
  assert.equal(choice.noHost, false);
});

test('Expo Go on iOS (tunnel): the same exps://<host>/--/auth', () => {
  assert.equal(resolveNativeRedirect(expoGoTunnel('ios')).url, `exps://${HOST}/--/auth`);
});

test('Expo Go on LAN (Android and iOS): exp://<ip:port>/--/auth', () => {
  for (const os of ['android', 'ios']) {
    const env: RedirectEnv = { os, isRunningInExpoGo: true, hostUri: '192.168.1.5:8081', bundleOrigin: 'http://192.168.1.5:8081' };
    assert.equal(resolveNativeRedirect(env).url, 'exp://192.168.1.5:8081/--/auth');
  }
});

test('the redirect follows the current tunnel host (a restart changes it)', () => {
  const next = 'c-robbin001-b1arzb-mwfipzfin6hdq3ai.on.expo.app';
  const env = { ...expoGoTunnel('android'), hostUri: next, bundleOrigin: `https://${next}` };
  assert.equal(resolveNativeRedirect(env).url, `exps://${next}/--/auth`);
});

test('native builds on Android and iOS: reallabel://auth', () => {
  for (const os of ['android', 'ios']) {
    assert.equal(resolveNativeRedirect({ os, isRunningInExpoGo: false, executionEnvironment: 'standalone' }).url, 'reallabel://auth');
  }
});

// ---- Incoming return link ----

test('incoming link with a code is exchanged; other links are ignored', () => {
  assert.deepEqual(incomingLinkAction(`exps://${HOST}/--/auth?code=abc123`), { kind: 'code', code: 'abc123' });
  assert.deepEqual(incomingLinkAction('reallabel://auth?code=xyz'), { kind: 'code', code: 'xyz' });
  assert.deepEqual(incomingLinkAction(`exps://${HOST}/--/auth`), { kind: 'no-code' });
  assert.deepEqual(incomingLinkAction(`exps://${HOST}`), { kind: 'ignore' });
  assert.deepEqual(incomingLinkAction(null), { kind: 'ignore' });
});

test('incoming link with an error is shown, not dropped (access_denied reads as cancelled)', () => {
  const failed = incomingLinkAction(`exps://${HOST}/--/auth?error=server_error&error_description=Unable+to+exchange`);
  assert.equal(failed.kind, 'error');
  assert.equal(failed.kind === 'error' && failed.message, 'Google sign-in failed. Try again.');
  assert.equal(failed.kind === 'error' && failed.detail, 'Unable to exchange');
  const cancelled = incomingLinkAction(`exps://${HOST}/--/auth#error=access_denied`);
  assert.equal(cancelled.kind === 'error' && cancelled.message, 'Google sign-in was cancelled.');
});

test('exchange log lines never contain the code', () => {
  assert.equal(describeIncomingExchange({ status: 'ok' }), 'incoming link exchange ok');
  assert.equal(describeIncomingExchange({ status: 'failed', message: 'invalid flow state' }), 'incoming link exchange failed: invalid flow state');
  assert.equal(describeIncomingExchange({ status: 'skipped', reason: 'code already used' }), 'incoming link exchange skipped (code already used)');
  const fp = codeFingerprint('secret-code-123');
  assert.equal(fp.includes('secret'), false);
  assert.equal(fp, codeFingerprint('secret-code-123'));
  assert.notEqual(fp, codeFingerprint('secret-code-124'));
});

// ---- Exactly-once exchange ----

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

test('the same code from the flow and the link is exchanged once and both see the result', async () => {
  const calls: string[] = [];
  const gate = deferred<string | null>();
  const ex = createCodeExchanger(async (code) => {
    calls.push(code);
    return gate.promise;
  });
  const fromFlow = ex.exchange('c1');
  const fromLink = ex.exchange('c1');
  assert.equal(ex.running, true);
  gate.resolve(null);
  assert.deepEqual(await fromFlow, { status: 'ok' });
  assert.deepEqual(await fromLink, { status: 'ok', duplicate: true });
  assert.deepEqual(calls, ['c1']);
  assert.equal(ex.running, false);
  // Later, the same link again (e.g. getInitialURL on a remount): skipped.
  assert.deepEqual(await ex.exchange('c1'), { status: 'skipped', reason: 'code already used' });
  assert.deepEqual(calls, ['c1']);
});

test('a different code while one is in flight is skipped (both would use the one stored verifier)', async () => {
  const gate = deferred<string | null>();
  const calls: string[] = [];
  const ex = createCodeExchanger(async (code) => {
    calls.push(code);
    return gate.promise;
  });
  const first = ex.exchange('c1');
  assert.deepEqual(await ex.exchange('c2'), { status: 'skipped', reason: 'another exchange in progress' });
  gate.resolve(null);
  await first;
  assert.deepEqual(calls, ['c1']);
});

test('a code used before a reload (persisted fingerprint) is not sent again', async () => {
  const saved = new Set<string>();
  const store: UsedCodeStore = { has: async (f) => saved.has(f), add: async (f) => void saved.add(f) };
  const calls: string[] = [];
  const run = async (code: string) => {
    calls.push(code);
    return null;
  };
  assert.deepEqual(await createCodeExchanger(run, store).exchange('c1'), { status: 'ok' });
  // "Reload": a fresh exchanger (new JS context) with the same storage.
  assert.deepEqual(await createCodeExchanger(run, store).exchange('c1'), { status: 'skipped', reason: 'code already used' });
  assert.deepEqual(calls, ['c1']);
  assert.equal([...saved].some((f) => f.includes('c1')), false);
});

test('a failed exchange is reported (and throws become failures)', async () => {
  assert.deepEqual(await createCodeExchanger(async () => 'invalid flow state').exchange('c1'), {
    status: 'failed',
    message: 'invalid flow state',
  });
  const thrown = await createCodeExchanger(async () => {
    throw new Error('network down');
  }).exchange('c2');
  assert.deepEqual(thrown, { status: 'failed', message: 'network down' });
});

test('whenIdle waits for the running Google flow before the link is handled', async () => {
  const flight = createSingleFlight();
  const flow = deferred<string | null>();
  const order: string[] = [];
  void flight.run(() => flow.promise.then((v) => (order.push('flow done'), v)), null);
  const waiting = flight.whenIdle().then(() => order.push('link handled'));
  await Promise.resolve();
  assert.deepEqual(order, []);
  flow.resolve(null);
  await waiting;
  assert.deepEqual(order, ['flow done', 'link handled']);
  await flight.whenIdle(); // idle: resolves at once
});

// ---- Session race (App.tsx) ----

/** Replays updates the way App.tsx applies them; returns the final app session (true = signed in). */
function replay(updates: Array<[SessionPath, boolean]>) {
  let gate: SessionGate = { eventSeen: false, hasSession: undefined };
  let session: boolean | undefined;
  for (const [path, has] of updates) {
    if (!sessionDecision(gate, path, has).apply) continue;
    gate = nextGate(gate, path, has);
    session = has;
  }
  return session;
}

test('a late getSession "no" never overwrites SIGNED_IN from the code exchange', () => {
  assert.equal(
    replay([
      ['auth-event:INITIAL_SESSION', false],
      ['auth-event:SIGNED_IN', true],
      ['initial-getSession', false],
    ]),
    true,
  );
});

test('a late INITIAL_SESSION "no" never overwrites SIGNED_IN', () => {
  assert.equal(
    replay([
      ['auth-event:SIGNED_IN', true],
      ['auth-event:INITIAL_SESSION', false],
      ['initial-getSession', false],
    ]),
    true,
  );
});

test('normal start-ups and sign-out still work', () => {
  assert.equal(replay([['initial-getSession', false], ['auth-event:INITIAL_SESSION', false]]), false);
  assert.equal(replay([['initial-getSession', true], ['auth-event:INITIAL_SESSION', true]]), true);
  assert.equal(replay([['initial-getSession', false], ['auth-event:INITIAL_SESSION', false], ['auth-event:SIGNED_IN', true]]), true);
  assert.equal(replay([['initial-getSession', true], ['auth-event:INITIAL_SESSION', true], ['auth-event:SIGNED_OUT', false]]), false);
  // Signing in again after signing out.
  assert.equal(replay([['auth-event:SIGNED_IN', true], ['auth-event:SIGNED_OUT', false], ['auth-event:SIGNED_IN', true]]), true);
});

test('an ignored update is logged without secrets', () => {
  const line = describeSessionKept('initial-getSession', null, 'an auth event already set it');
  assert.equal(line, 'kept app session (initial-getSession): ignored no (an auth event already set it)');
  assert.equal(describeSessionKept('auth-event:<script>' as SessionPath, { access_token: 'x' }, 'r'), 'kept app session (auth-event:unknown): ignored yes (r)');
});
