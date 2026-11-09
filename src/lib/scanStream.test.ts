import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readScanStream, scanStreamParser, type ScanEvent } from './scanStream.ts';

const jev = { event: 'jev', jev: { status: 'unreadable', model: 'test' }, timing: { jev_end_ms: 130 } };
const reading = { event: 'reading', error: 'Not readable · retake', code: 'unreadable', timing: { claude_end_ms: 3000 } };
const body = `${JSON.stringify(jev)}\n${JSON.stringify(reading)}\n`;

test('emits Jev immediately without waiting for reading', () => {
  const events: ScanEvent[] = [];
  const parser = scanStreamParser((e) => events.push(e));
  parser.feed(new TextEncoder().encode(JSON.stringify(jev) + '\n'));
  assert.deepEqual(events, [jev]);
  parser.feedText(JSON.stringify(reading) + '\n');
  parser.finish();
  assert.deepEqual(events, [jev, reading]);
});

test('handles byte-by-byte chunks including split unicode and CRLF', () => {
  const events: ScanEvent[] = [];
  const parser = scanStreamParser((e) => events.push(e));
  for (const byte of new TextEncoder().encode(body.replaceAll('\n', '\r\n'))) parser.feed(new Uint8Array([byte]));
  parser.finish();
  assert.deepEqual(events, [jev, reading]);
});

test('handles multiple lines, empty lines and an unterminated last line', () => {
  const events: ScanEvent[] = [];
  const parser = scanStreamParser((e) => events.push(e));
  parser.feedText('\n' + body.trimEnd());
  parser.finish();
  assert.deepEqual(events, [jev, reading]);
});

test('rejects malformed or unexpected events instead of silently finishing', () => {
  for (const text of ['{nope}\n', '{"event":"other"}\n', '{"event":"jev"}\n', '{"event":"reading"}\n']) {
    assert.throws(() => scanStreamParser(() => {}).feedText(text));
  }
});

test('whole-body fallback and streamed Response produce the same outcomes', async () => {
  for (const response of [new Response(body), { body: null, text: async () => body } as Response]) {
    const events: ScanEvent[] = [];
    await readScanStream(response, (e) => events.push(e));
    assert.deepEqual(events, [jev, reading]);
  }
});
