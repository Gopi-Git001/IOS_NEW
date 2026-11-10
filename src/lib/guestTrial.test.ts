import assert from 'node:assert/strict';
import { test } from 'node:test';
import { freeScansLabel, isGuestUser, parseGuestQuota } from './guestTrial';

test('only a bounded, integral server quota can be shown', () => {
  assert.deepEqual(parseGuestQuota({ limit: 3, remaining: 2 }), { limit: 3, remaining: 2 });
  for (const value of [null, {}, { limit: 3, remaining: 4 }, { limit: 3, remaining: -1 }, { limit: 0, remaining: 0 }, { limit: 3, remaining: 1.5 }]) {
    assert.equal(parseGuestQuota(value), null);
  }
});
test('guest display recognizes immutable metadata and legacy sessions', () => {
  assert.equal(isGuestUser({ app_metadata: { guest: true } }), true);
  assert.equal(isGuestUser({ email: 'old@guest.sugarhunter.app' }), true);
  assert.equal(isGuestUser({ email: 'user@gmail.com' }), false);
  assert.equal(isGuestUser(null), false);
});
test('remaining copy handles one and zero scans honestly', () => {
  assert.equal(freeScansLabel(3), '3 free scans left');
  assert.equal(freeScansLabel(1), '1 free scan left');
  assert.equal(freeScansLabel(0), '0 free scans left');
});
