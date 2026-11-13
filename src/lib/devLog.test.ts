import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clockTime, devLog, formatDevLine, isDev, makeDevLog } from './devLog.ts';

test('clockTime is local HH:MM:SS.mmm, zero-padded', () => {
  assert.equal(clockTime(new Date(2026, 10, 13, 5, 4, 3, 7)), '05:04:03.007');
  assert.equal(clockTime(new Date(2026, 10, 13, 15, 42, 7, 123)), '15:42:07.123');
  assert.match(clockTime(), /^\d{2}:\d{2}:\d{2}\.\d{3}$/);
});

test('the tag comes first, then the timestamp, then the message', () => {
  const at = new Date(2026, 10, 13, 15, 42, 7, 123);
  assert.equal(formatDevLine('auth', 'tap (flow running: no)', at), '[auth] 15:42:07.123 tap (flow running: no)');
  assert.equal(formatDevLine('haptics', 'shutter fired', at), '[haptics] 15:42:07.123 shutter fired');
  assert.match(formatDevLine('auth', 'x'), /^\[auth\] \d{2}:\d{2}:\d{2}\.\d{3} x$/);
});

test('enabled logger writes one formatted line per call', () => {
  const lines: string[] = [];
  const log = makeDevLog(true, (l) => lines.push(l), () => new Date(2026, 0, 1, 9, 0, 0, 5));
  log('auth', 'app start ios');
  log('haptics', 'verdict fired');
  assert.deepEqual(lines, ['[auth] 09:00:00.005 app start ios', '[haptics] 09:00:00.005 verdict fired']);
});

test('__DEV__ off: the logger is silent', () => {
  const lines: string[] = [];
  makeDevLog(false, (l) => lines.push(l))('auth', 'tap');
  assert.deepEqual(lines, []);
});

test('Node tests have no __DEV__, so the shared logger is off and does not throw', () => {
  assert.equal(isDev, false);
  assert.doesNotThrow(() => devLog('auth', 'x'));
});
