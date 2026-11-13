import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyAuthUrl, createSingleFlight, describeAuthUrl, flowOutcome, isAuthLink, safeMessage } from './authFlow.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('single flight: a second call while the first is pending is ignored', async () => {
  const flight = createSingleFlight();
  const first = deferred<string>();
  let starts = 0;
  let busy = 0;
  const task = () => {
    starts += 1;
    return first.promise;
  };
  const a = flight.run(task, 'busy', () => (busy += 1));
  assert.equal(flight.running, true);
  const b = await flight.run(task, 'busy', () => (busy += 1));
  assert.equal(b, 'busy');
  assert.equal(starts, 1, 'the second task never started');
  assert.equal(busy, 1, 'onBusy called once');
  first.resolve('done');
  assert.equal(await a, 'done');
  assert.equal(flight.running, false);
});

test('single flight: resets after resolve and a later call runs again', async () => {
  const flight = createSingleFlight();
  let starts = 0;
  const task = async () => {
    starts += 1;
    return starts;
  };
  assert.equal(await flight.run(task, -1), 1);
  assert.equal(flight.running, false);
  assert.equal(await flight.run(task, -1), 2);
  assert.equal(starts, 2);
});

test('single flight: resets after a throw and a later call runs again', async () => {
  const flight = createSingleFlight();
  await assert.rejects(
    flight.run(async () => {
      throw new Error('boom');
    }, null),
    /boom/,
  );
  assert.equal(flight.running, false);
  let ran = false;
  await flight.run(async () => {
    ran = true;
    return null;
  }, null);
  assert.equal(ran, true);
});

test('single flight: a synchronous throw inside the task still resets the guard', async () => {
  const flight = createSingleFlight();
  await assert.rejects(
    flight.run((() => {
      throw new Error('sync');
    }) as () => Promise<null>, null),
    /sync/,
  );
  assert.equal(flight.running, false);
});

const CODE = 'secret-code-1234567890';
const ACCESS = 'eyJhbGciOiJIUzI1NiJ9.access.token';
const REFRESH = 'refresh-token-abcdef';
const BASE = 'exps://abc.on.expo.app/--/auth';

test('classify: code only', () => {
  const url = `${BASE}?code=${CODE}`;
  assert.deepEqual(classifyAuthUrl(url), { code: true, tokens: false, error: null, errorDescription: null });
  assert.equal(describeAuthUrl(url), 'code=yes error=none error_description=none');
});

test('classify: error and error_description in the query', () => {
  const url = `${BASE}?error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code`;
  const info = classifyAuthUrl(url);
  assert.equal(info.code, false);
  assert.equal(info.error, 'server_error');
  assert.equal(info.errorDescription, 'Unable to exchange external code');
  assert.equal(describeAuthUrl(url), 'code=no error=server_error error_description=Unable to exchange external code');
});

test('classify: error in the #fragment', () => {
  const url = `${BASE}#error=access_denied&error_description=The%20user%20denied`;
  assert.equal(describeAuthUrl(url), 'code=no error=access_denied error_description=The user denied');
});

test('classify: error_code alone counts as the error', () => {
  assert.equal(classifyAuthUrl(`${BASE}#error_code=otp_expired`).error, 'otp_expired');
});

test('classify: token fragment', () => {
  const url = `${BASE}#access_token=${ACCESS}&refresh_token=${REFRESH}&token_type=bearer`;
  const info = classifyAuthUrl(url);
  assert.equal(info.tokens, true);
  assert.equal(info.code, false);
  assert.equal(describeAuthUrl(url), 'code=no error=none error_description=none tokens=yes');
});

test('classify: plain URL, empty and malformed', () => {
  for (const url of [BASE, '', null, undefined, 'not a url %%% ?code', '?#&&==', '%E0%A4%A']) {
    const line = describeAuthUrl(url);
    assert.match(line, /^code=(yes|no) error=.* error_description=.*/);
  }
  assert.equal(describeAuthUrl(BASE), 'code=no error=none error_description=none');
  assert.equal(describeAuthUrl('not a url %%% ?code'), 'code=no error=none error_description=none');
});

test('the log string never contains the code or token values', () => {
  const urls = [
    `${BASE}?code=${CODE}`,
    `${BASE}?code=${CODE}#access_token=${ACCESS}&refresh_token=${REFRESH}`,
    `${BASE}?error=bad&error_description=see+${encodeURIComponent(`${BASE}?code=${CODE}`)}`,
    `${BASE}#error=x&error_description=${encodeURIComponent(`token https://h/p#access_token=${ACCESS}`)}`,
  ];
  for (const url of urls) {
    const line = describeAuthUrl(url);
    assert.ok(!line.includes(CODE), line);
    assert.ok(!line.includes(ACCESS), line);
    assert.ok(!line.includes(REFRESH), line);
  }
});

test('safeMessage cuts URL queries and fragments out of error text', () => {
  const msg = safeMessage(new Error(`Request to https://x.supabase.co/auth/v1/token?grant_type=pkce&code=${CODE} failed`));
  assert.ok(!msg.includes(CODE));
  assert.match(msg, /https:\/\/x\.supabase\.co\/auth\/v1\/token failed/);
  assert.equal(safeMessage(undefined), 'unknown');
  assert.equal(safeMessage('invalid flow state'), 'invalid flow state');
});

test('isAuthLink: only the sign-in return link', () => {
  assert.equal(isAuthLink(`${BASE}?code=${CODE}`), true);
  assert.equal(isAuthLink('exp://192.168.1.5:8081/--/auth#error=x'), true);
  assert.equal(isAuthLink('reallabel://auth?code=1'), true);
  assert.equal(isAuthLink('reallabel://auth'), true);
  assert.equal(isAuthLink('exp://192.168.1.5:8081'), false);
  assert.equal(isAuthLink('exp://192.168.1.5:8081/--/'), false);
  assert.equal(isAuthLink('exp://192.168.1.5:8081/--/authors'), false);
  assert.equal(isAuthLink('reallabel://scan'), false);
  assert.equal(isAuthLink(null), false);
});

test('flowOutcome', () => {
  assert.equal(flowOutcome('cancel', false), 'cancelled');
  assert.equal(flowOutcome('error', true), 'error');
  assert.equal(flowOutcome('session-set', true), 'signed-in');
  assert.equal(flowOutcome('session-set', false), 'no-session');
});
