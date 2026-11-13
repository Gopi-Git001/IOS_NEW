import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildNativeRedirect, NATIVE_REDIRECT, parseAuthResult, SIGN_IN_CANCELLED, SIGN_IN_FAILED } from './authRedirect.ts';

test('iOS uses reallabel://auth in Expo Go and in native builds', () => {
  assert.equal(NATIVE_REDIRECT, 'reallabel://auth');
  assert.equal(buildNativeRedirect({ os: 'ios', executionEnvironment: 'storeClient', linkingUri: 'exp://192.168.1.5:8081/--/' }), 'reallabel://auth');
  assert.equal(buildNativeRedirect({ os: 'ios', executionEnvironment: 'standalone', linkingUri: 'reallabel://' }), 'reallabel://auth');
  assert.equal(buildNativeRedirect({ os: 'ios', executionEnvironment: 'bare' }), 'reallabel://auth');
});

test('Android native builds use reallabel://auth', () => {
  assert.equal(buildNativeRedirect({ os: 'android', executionEnvironment: 'standalone', linkingUri: 'reallabel://' }), 'reallabel://auth');
  assert.equal(buildNativeRedirect({ os: 'android', executionEnvironment: 'bare', linkingUri: null }), 'reallabel://auth');
});

test('Android Expo Go uses its own exp:// link with /--/auth', () => {
  assert.equal(buildNativeRedirect({ os: 'android', executionEnvironment: 'storeClient', linkingUri: 'exp://192.168.1.5:8081/--/' }), 'exp://192.168.1.5:8081/--/auth');
  assert.equal(buildNativeRedirect({ os: 'android', executionEnvironment: 'storeClient', linkingUri: 'exp://192.168.1.5:8081' }), 'exp://192.168.1.5:8081/--/auth');
  assert.equal(
    buildNativeRedirect({ os: 'android', executionEnvironment: 'storeClient', linkingUri: 'exp://c-robbin001-b1arzb-8081.exp.direct/--/' }),
    'exp://c-robbin001-b1arzb-8081.exp.direct/--/auth',
  );
  // No usable Expo Go link: fall back to the app scheme.
  assert.equal(buildNativeRedirect({ os: 'android', executionEnvironment: 'storeClient', linkingUri: '' }), 'reallabel://auth');
  assert.equal(buildNativeRedirect({ os: 'android', executionEnvironment: 'storeClient', linkingUri: 'http://x' }), 'reallabel://auth');
});

test('closing the sheet is a silent cancel', () => {
  assert.deepEqual(parseAuthResult({ type: 'cancel' }), { kind: 'cancel' });
  assert.deepEqual(parseAuthResult({ type: 'dismiss' }), { kind: 'cancel' });
  assert.deepEqual(parseAuthResult({ type: 'locked' }), { kind: 'cancel' });
});

test('a code is returned for the PKCE exchange', () => {
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'reallabel://auth?code=abc-123' }), { kind: 'code', code: 'abc-123' });
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'exp://192.168.1.5:8081/--/auth?code=xyz' }), { kind: 'code', code: 'xyz' });
});

test('an error redirect is a failure, not "cancelled"', () => {
  const failed = { kind: 'error', message: SIGN_IN_FAILED };
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'reallabel://auth?error=server_error&error_description=Unable+to+exchange' }), failed);
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'reallabel://auth#error=invalid_request&error_code=bad_oauth_state' }), failed);
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'reallabel://auth?error_code=bad_oauth_callback' }), failed);
  // An error wins over a code.
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'reallabel://auth?code=abc&error=server_error' }), failed);
});

test('declining on Google (access_denied) reads as cancelled, like the web', () => {
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'reallabel://auth?error=access_denied' }), { kind: 'error', message: SIGN_IN_CANCELLED });
});

test('success without a code or error is a failure', () => {
  assert.deepEqual(parseAuthResult({ type: 'success', url: 'reallabel://auth' }), { kind: 'error', message: SIGN_IN_FAILED });
  assert.deepEqual(parseAuthResult({ type: 'success', url: null }), { kind: 'error', message: SIGN_IN_FAILED });
});
