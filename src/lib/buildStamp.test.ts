import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildStamp, formatBuildTime } from './buildStamp.ts';

test('dev build with all vars shows commit · branch · platform · time', () => {
  const env = { commit: '38f6a91', branch: 'ios-dev', time: '2026-11-13T16:30:00-06:00' };
  assert.equal(buildStamp(env, 'ios', true), '38f6a91 · ios-dev · ios · 16:30 Nov 13');
  assert.equal(buildStamp(env, 'android', true), '38f6a91 · ios-dev · android · 16:30 Nov 13');
  assert.equal(buildStamp(env, 'web', true), '38f6a91 · ios-dev · web · 16:30 Nov 13');
});

test('missing or blank vars show "unknown"', () => {
  assert.equal(buildStamp({}, 'ios', true), 'unknown · unknown · ios · unknown');
  assert.equal(buildStamp({ commit: ' ', branch: '', time: '' }, 'web', true), 'unknown · unknown · web · unknown');
  assert.equal(buildStamp({ commit: 'abc1234' }, 'android', true), 'abc1234 · unknown · android · unknown');
});

test('release build renders nothing', () => {
  const env = { commit: '38f6a91', branch: 'ios-dev', time: '2026-11-13T16:30:00-06:00' };
  assert.equal(buildStamp(env, 'ios', false), null);
  assert.equal(buildStamp({}, 'web', false), null);
});

test('build time keeps the clock time as written, any offset', () => {
  assert.equal(formatBuildTime('2026-01-05T09:07:00Z'), '09:07 Jan 5');
  assert.equal(formatBuildTime('2026-12-31T23:59:59+05:30'), '23:59 Dec 31');
  assert.equal(formatBuildTime('not a date'), 'unknown');
  assert.equal(formatBuildTime('2026-13-01T10:00:00Z'), 'unknown');
  assert.equal(formatBuildTime(undefined), 'unknown');
});
