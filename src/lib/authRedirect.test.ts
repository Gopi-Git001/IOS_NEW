import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildNativeRedirect,
  isExpoGo,
  NATIVE_REDIRECT,
  parseAuthResult,
  redactUrl,
  resolveNativeRedirect,
  SIGN_IN_CANCELLED,
  SIGN_IN_FAILED,
} from './authRedirect.ts';

const HOST = 'c-robbin001-b1arzb-mwf2ajj6dv4rb1v0.on.expo.app';
const TUNNEL = `exps://${HOST}/--/auth`;
const LAN = 'exp://192.168.1.5:8081/--/auth';

test('tunnel in Expo Go: createURL gave reallabel://auth, redirect is still exps://<host>/--/auth', () => {
  // The owner's iPhone: the bundle came from the https tunnel, createURL used the app scheme.
  const env = {
    os: 'ios',
    isRunningInExpoGo: true,
    executionEnvironment: 'standalone',
    appOwnership: null,
    bundleOrigin: `https://${HOST}`,
    createURL: 'reallabel://auth',
  };
  assert.equal(buildNativeRedirect(env), TUNNEL);
  assert.deepEqual(resolveNativeRedirect(env), { url: TUNNEL, expoGo: true, noHost: false });
  // Same with no bundle origin but the tunnel's experienceUrl / linkingUri.
  assert.equal(buildNativeRedirect({ os: 'ios', isRunningInExpoGo: true, experienceUrl: `exps://${HOST}`, createURL: 'reallabel://auth' }), TUNNEL);
  assert.equal(buildNativeRedirect({ os: 'ios', isRunningInExpoGo: true, linkingUri: `exps://${HOST}/--/`, createURL: 'reallabel:///auth' }), TUNNEL);
});

test('appOwnership null + executionEnvironment storeClient is Expo Go', () => {
  assert.equal(isExpoGo({ appOwnership: null, executionEnvironment: 'storeClient' }), true);
  assert.equal(buildNativeRedirect({ os: 'ios', appOwnership: null, executionEnvironment: 'storeClient', bundleOrigin: `https://${HOST}` }), TUNNEL);
  assert.equal(buildNativeRedirect({ os: 'android', appOwnership: null, executionEnvironment: 'storeClient', hostUri: '192.168.1.5:8081' }), LAN);
});

test('isRunningInExpoGo true with executionEnvironment undefined is Expo Go', () => {
  assert.equal(isExpoGo({ isRunningInExpoGo: true, executionEnvironment: undefined, appOwnership: undefined }), true);
  assert.equal(buildNativeRedirect({ os: 'ios', isRunningInExpoGo: true, executionEnvironment: undefined, bundleOrigin: 'http://192.168.1.5:8081' }), LAN);
});

test('any single Expo Go signal is enough; none means a native build', () => {
  assert.equal(isExpoGo({ appOwnership: 'expo' }), true);
  assert.equal(isExpoGo({ hasExpoGoConfig: true }), true);
  assert.equal(isExpoGo({ linkingUri: 'exp://192.168.1.5:8081/--/' }), true);
  assert.equal(isExpoGo({ linkingUri: `exps://${HOST}/--/` }), true);
  assert.equal(isExpoGo({ isRunningInExpoGo: false, appOwnership: null, executionEnvironment: 'standalone', hasExpoGoConfig: false, linkingUri: 'reallabel://' }), false);
});

test('https dev server gives exps://, http gives exp://', () => {
  const base = { os: 'ios', isRunningInExpoGo: true };
  assert.equal(buildNativeRedirect({ ...base, bundleOrigin: `https://${HOST}` }), TUNNEL);
  assert.equal(buildNativeRedirect({ ...base, bundleOrigin: `http://${HOST}` }), `exp://${HOST}/--/auth`);
  // The bundle origin wins over hostUri / linkingUri; https-ness follows the source with that host.
  assert.equal(buildNativeRedirect({ ...base, bundleOrigin: 'http://192.168.1.5:8081', hostUri: HOST, linkingUri: `exps://${HOST}/--/` }), LAN);
  assert.equal(buildNativeRedirect({ ...base, hostUri: HOST, linkingUri: `exps://${HOST}/--/` }), TUNNEL);
  // A trusted exp(s):// createURL is used when nothing else has a host.
  assert.equal(buildNativeRedirect({ ...base, createURL: `exps://${HOST}/--/auth?x=1` }), TUNNEL);
  assert.equal(buildNativeRedirect({ ...base, createURL: LAN }), LAN);
  // Results never have double slashes, a query or a fragment.
  for (const url of [
    buildNativeRedirect({ ...base, bundleOrigin: `https://${HOST}/` }),
    buildNativeRedirect({ ...base, experienceUrl: `exps://${HOST}//?a=b#c` }),
  ]) {
    assert.equal(url, TUNNEL);
  }
});

test('hostUri with a port (LAN) gives exp://192.168.1.5:8081/--/auth', () => {
  assert.equal(buildNativeRedirect({ os: 'ios', isRunningInExpoGo: true, hostUri: '192.168.1.5:8081' }), LAN);
  assert.equal(buildNativeRedirect({ os: 'android', executionEnvironment: 'storeClient', linkingUri: 'exp://192.168.1.5:8081/--/' }), LAN);
  // A tunnel hostUri without a scheme: on.expo.app tunnels are https.
  assert.equal(buildNativeRedirect({ os: 'ios', isRunningInExpoGo: true, hostUri: HOST }), TUNNEL);
});

test('Expo Go with no host at all: reallabel://auth with the warning flag', () => {
  for (const createURL of ['', null, undefined, 'reallabel://auth', 'http://x/--/auth']) {
    assert.deepEqual(resolveNativeRedirect({ os: 'ios', isRunningInExpoGo: true, createURL }), {
      url: 'reallabel://auth',
      expoGo: true,
      noHost: true,
    });
  }
});

test('native builds (standalone / bare) use reallabel://auth on iOS and Android', () => {
  assert.equal(NATIVE_REDIRECT, 'reallabel://auth');
  for (const os of ['ios', 'android']) {
    for (const executionEnvironment of ['standalone', 'bare']) {
      // createURL returns the app scheme in native builds; a dev hostUri must not turn it into exp://.
      const env = { os, isRunningInExpoGo: false, appOwnership: null, executionEnvironment, hostUri: '192.168.1.5:8081', createURL: 'reallabel:///auth' };
      assert.deepEqual(resolveNativeRedirect(env), { url: 'reallabel://auth', expoGo: false, noHost: false });
    }
  }
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

test('release / bare builds stay on reallabel://auth even with an embedded manifest or a host', () => {
  for (const executionEnvironment of ['standalone', 'bare']) {
    const url = buildNativeRedirect({
      os: 'ios',
      executionEnvironment,
      appOwnership: null,
      hasExpoGoConfig: true,
      linkingUri: 'exps://example.on.expo.app',
      bundleOrigin: 'https://example.on.expo.app',
      hostUri: 'example.on.expo.app',
    });
    assert.equal(url, 'reallabel://auth');
  }
});

test('the native ExpoGo module wins over a standalone-looking executionEnvironment', () => {
  const url = buildNativeRedirect({
    os: 'ios',
    isRunningInExpoGo: true,
    executionEnvironment: 'standalone',
    bundleOrigin: 'https://c-robbin001-b1arzb-mwf2ajj6dv4rb1v0.on.expo.app',
  });
  assert.equal(url, 'exps://c-robbin001-b1arzb-mwf2ajj6dv4rb1v0.on.expo.app/--/auth');
});
