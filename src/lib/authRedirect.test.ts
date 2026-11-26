import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authCodeFrom, NATIVE_REDIRECT, nativeAuthRedirect } from './authRedirect.ts';

const host = 'c-robbin001-b1arzb-abc123.on.expo.app';

test('Expo Go returns to the dev server, not the app scheme', () => {
  assert.equal(nativeAuthRedirect({ executionEnvironment: 'storeClient', expoConfig: { hostUri: host } }), `exp://${host}/--/auth`);
  assert.equal(nativeAuthRedirect({ appOwnership: 'expo', expoConfig: { hostUri: `${host}/` } }), `exp://${host}/--/auth`);
  assert.equal(nativeAuthRedirect({ executionEnvironment: 'storeClient', expoConfig: { hostUri: '192.168.1.5:8081' } }), 'exp://192.168.1.5:8081/--/auth');
});

test('Expo Go on Android (reports bare, no ownership) still returns to the dev server', () => {
  const android = { executionEnvironment: 'bare', appOwnership: null, expoConfig: { hostUri: host } };
  assert.equal(nativeAuthRedirect(android, true), `exp://${host}/--/auth`);
  assert.equal(nativeAuthRedirect(android, false), NATIVE_REDIRECT);
});

test('dev and production builds keep reallabel://auth', () => {
  assert.equal(NATIVE_REDIRECT, 'reallabel://auth');
  assert.equal(nativeAuthRedirect({ executionEnvironment: 'standalone', expoConfig: { hostUri: host } }), NATIVE_REDIRECT);
  assert.equal(nativeAuthRedirect({ executionEnvironment: 'bare', appOwnership: null, expoConfig: { hostUri: host } }), NATIVE_REDIRECT);
  assert.equal(nativeAuthRedirect({ executionEnvironment: 'storeClient', expoConfig: null }), NATIVE_REDIRECT);
});

test('reads the PKCE code only from our own return URL', () => {
  const expo = `exp://${host}/--/auth`;
  assert.equal(authCodeFrom(`${expo}?code=abc-123`, expo), 'abc-123');
  assert.equal(authCodeFrom('reallabel://auth?code=xyz', NATIVE_REDIRECT), 'xyz');
  assert.equal(authCodeFrom(`${expo}?error=access_denied`, expo), null);
  assert.equal(authCodeFrom('reallabel://auth?code=xyz', expo), null);
  assert.equal(authCodeFrom(null, expo), null);
});
