import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readScanStream, requestScanStream, RetryableScanError, scanStreamParser, type ScanEvent } from './scanStream.ts';

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

test('only HTTP 404 permits legacy fallback; 5xx and dropped connections are retryable', async () => {
  assert.equal(await requestScanStream(async () => new Response(null, { status: 404 }), () => {}, 1000), false);
  await assert.rejects(requestScanStream(async () => new Response(null, { status: 502 }), () => {}, 1000), RetryableScanError);
  await assert.rejects(requestScanStream(async () => { throw new TypeError('offline'); }, () => {}, 1000), RetryableScanError);
  await assert.rejects(
    requestScanStream(async () => Response.json({ error: 'Daily limit' }, { status: 429 }), () => {}, 1000),
    (error: unknown) => error instanceof Error && !(error instanceof RetryableScanError) && error.message === 'Daily limit',
  );
});

test('stream deadline retains the early verdict, aborts, and suppresses late lists', async () => {
  const events: ScanEvent[] = [];
  let signal: AbortSignal | undefined;
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(c) { controller = c; c.enqueue(new TextEncoder().encode(JSON.stringify(jev) + '\n')); },
  });
  await assert.rejects(requestScanStream(async (s) => {
    signal = s;
    return new Response(stream);
  }, (event) => events.push(event), 20), RetryableScanError);
  assert.equal(signal?.aborted, true);
  assert.deepEqual(events, [jev]);
  // Simulate a runtime that ignores abort: stale response events must not overwrite a retry.
  controller!.enqueue(new TextEncoder().encode(JSON.stringify(reading) + '\n'));
  controller!.close();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(events, [jev]);
});

test('successful streamed requests preserve reader status and error code for retry UI', async () => {
  const events: ScanEvent[] = [];
  const timedOut = { event: 'reading', status: 504, code: 'reader_timeout', error: 'Unavailable' };
  const response = new Response(JSON.stringify(jev) + '\n' + JSON.stringify(timedOut) + '\n');
  assert.equal(await requestScanStream(async () => response, (event) => events.push(event), 1000), true);
  assert.deepEqual(events, [jev, timedOut]);
});
