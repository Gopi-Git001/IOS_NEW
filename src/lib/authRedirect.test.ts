import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildNativeRedirect,
  isExpoGo,
  NATIVE_REDIRECT,
  parseAuthResult,
  redactUrl,
  SIGN_IN_CANCELLED,
  SIGN_IN_FAILED,
} from './authRedirect.ts';

const TUNNEL = 'exp://c-robbin001-b1arzb-mwf0jyi2u20oabzh.on.expo.app/--/auth';
const LAN = 'exp://192.168.1.5:8081/--/auth';

test('Expo Go on iOS uses the exp://.../--/auth link from expo-linking', () => {
  assert.equal(buildNativeRedirect({ os: 'ios', appOwnership: 'expo', executionEnvironment: 'storeClient', expoGoUrl: TUNNEL }), TUNNEL);
  assert.equal(buildNativeRedirect({ os: 'ios', appOwnership: null, executionEnvironment: 'storeClient', expoGoUrl: LAN }), LAN);
});

test('Expo Go on Android uses the exp:// link too', () => {
  assert.equal(buildNativeRedirect({ os: 'android', appOwnership: 'expo', executionEnvironment: 'storeClient', expoGoUrl: LAN }), LAN);
  assert.equal(buildNativeRedirect({ os: 'android', executionEnvironment: 'storeClient', expoGoUrl: TUNNEL }), TUNNEL);
});

test("appOwnership 'expo' alone counts as Expo Go", () => {
  assert.equal(isExpoGo({ appOwnership: 'expo', executionEnvironment: null }), true);
  assert.equal(isExpoGo({ appOwnership: null, executionEnvironment: 'storeClient' }), true);
  assert.equal(isExpoGo({ appOwnership: null, executionEnvironment: 'standalone' }), false);
  assert.equal(buildNativeRedirect({ os: 'ios', appOwnership: 'expo', executionEnvironment: undefined, expoGoUrl: TUNNEL }), TUNNEL);
});

test('native builds (standalone / bare) use reallabel://auth on iOS and Android', () => {
  assert.equal(NATIVE_REDIRECT, 'reallabel://auth');
  for (const os of ['ios', 'android']) {
    for (const executionEnvironment of ['standalone', 'bare']) {
      // createURL returns the app scheme in native builds; it must not be used as-is.
      assert.equal(buildNativeRedirect({ os, appOwnership: null, executionEnvironment, expoGoUrl: 'reallabel:///auth' }), 'reallabel://auth');
    }
  }
});

test('Expo Go without a usable exp:// link falls back to reallabel://auth', () => {
  assert.equal(buildNativeRedirect({ os: 'ios', executionEnvironment: 'storeClient', expoGoUrl: '' }), 'reallabel://auth');
  assert.equal(buildNativeRedirect({ os: 'ios', executionEnvironment: 'storeClient', expoGoUrl: null }), 'reallabel://auth');
  assert.equal(buildNativeRedirect({ os: 'android', executionEnvironment: 'storeClient', expoGoUrl: 'http://x/--/auth' }), 'reallabel://auth');
});

test('closing the sheet is a silent cancel', () => {
  assert.deepEqual(parseAuthResult({ type: 'cancel' }), { kind: 'cancel' });
  assert.deepEqual(parseAuthResult({ type: 'dismiss' }), { kind: 'cancel' });
  assert.deepEqual(parseAuthResult({ type: 'locked' }), { kind: 'cancel' });
});

test('a code is returned for the PKCE exchange', () => {
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'reallabel://auth?code=abc-123' }), { kind: 'code', code: 'abc-123' });
  assert.deepEqual(parseAuthResult({ type: 'success', url: `${TUNNEL}?code=xyz` }), { kind: 'code', code: 'xyz' });
});

test('a token fragment is returned for setSession', () => {
  assert.deepEqual(parseAuthResult({ type: 'success', url: `${TUNNEL}#access_token=at.1&refresh_token=rt-2&expires_in=3600&token_type=bearer` }), {
    kind: 'tokens',
    accessToken: 'at.1',
    refreshToken: 'rt-2',
  });
  // Access token without a refresh token is not enough.
  assert.deepEqual(parseAuthResult({ type: 'success', url: `${TUNNEL}#access_token=at.1` }), { kind: 'error', message: SIGN_IN_FAILED });
});

test('an error redirect (?error= or #error=) is a failure, not "cancelled"', () => {
  const failed = { kind: 'error', message: SIGN_IN_FAILED };
  assert.deepEqual(parseAuthResult({ type: 'success', url: `${TUNNEL}?error=server_error&error_description=Unable+to+exchange` }), failed);
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'reallabel://auth#error=invalid_request&error_code=bad_oauth_state' }), failed);
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'reallabel://auth?error_code=bad_oauth_callback' }), failed);
  // An error wins over a code or tokens.
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'reallabel://auth?code=abc&error=server_error' }), failed);
  assert.deepEqual(parseAuthResult({ type: 'success', url: `${TUNNEL}#access_token=a&refresh_token=b&error=x` }), failed);
});

test('declining on Google (access_denied) reads as cancelled, like the web', () => {
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'reallabel://auth?error=access_denied' }), { kind: 'error', message: SIGN_IN_CANCELLED });
});

test('success without a code, tokens or error is a failure', () => {
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'reallabel://auth' }), { kind: 'error', message: SIGN_IN_FAILED });
  assert.deepEqual(parseAuthResult({ type: 'success', url: null }), { kind: 'error', message: SIGN_IN_FAILED });
});

test('redactUrl strips the query and fragment (code, tokens, errors)', () => {
  assert.equal(redactUrl(`${TUNNEL}?code=secret-code`), TUNNEL);
  assert.equal(redactUrl(`${TUNNEL}#access_token=a&refresh_token=b`), TUNNEL);
  assert.equal(redactUrl('reallabel://auth?error=x#y=z'), 'reallabel://auth');
  assert.equal(redactUrl('reallabel://auth#access_token=a?b=c'), 'reallabel://auth');
  assert.equal(redactUrl(TUNNEL), TUNNEL);
  assert.equal(redactUrl(null), '');
  assert.equal(redactUrl(undefined), '');
  assert.ok(!redactUrl(`${TUNNEL}?code=secret-code`).includes('secret-code'));
  assert.ok(!redactUrl(`${TUNNEL}#access_token=tok123&refresh_token=ref456`).includes('tok123'));
});
