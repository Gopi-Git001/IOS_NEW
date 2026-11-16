import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authBrowserOptions } from './authBrowser.ts';

test('android: the Custom Tab opens in the app task (createTask: false), so no stale tab is reused', () => {
  assert.deepEqual(authBrowserOptions('android'), { createTask: false });
});

test('android: every call gives a fresh object (no shared mutable options)', () => {
  const a = authBrowserOptions('android');
  const b = authBrowserOptions('android');
  assert.notEqual(a, b);
  assert.deepEqual(a, b);
});

test('ios and web: no options, so openAuthSessionAsync behaves exactly as before', () => {
  assert.equal(authBrowserOptions('ios'), undefined);
  assert.equal(authBrowserOptions('web'), undefined);
  assert.equal(authBrowserOptions('macos'), undefined);
});
