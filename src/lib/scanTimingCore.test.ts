// Scan timing helpers: mark ordering, computed durations, redaction, and the request step hooks.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { addMark, orderedMarks, redactTrace, scanDurations, SCAN_STEPS, timingSummary } from './scanTimingCore.ts';

const fullScan = {
  tap: 0,
  shutter_done: 310,
  captured: 330,
  prepared: 640,
  upload_start: 645,
  session_ready: 650,
  response_headers: 1900,
  quick_verdict_response: 2100,
  scan_label_response: 4200,
  verdict_on_screen: 4230,
  lists_on_screen: 4230,
};

test('addMark keeps the first time for a step and rounds it', () => {
  const marks: Record<string, number> = { tap: 0 };
  assert.equal(addMark(marks, 'captured', 330.6), true);
  assert.equal(addMark(marks, 'captured', 900), false);
  assert.equal(addMark(marks, 'prepared', Number.NaN), false);
  assert.equal(addMark(marks, 'prepared', -3), true);
  assert.deepEqual(marks, { tap: 0, captured: 331, prepared: 0 });
});

test('orderedMarks sorts by time and breaks ties with the scan order', () => {
  const marks = { lists_on_screen: 4230, verdict_on_screen: 4230, tap: 0, prepared: 640, custom_step: 640, captured: 330 };
  assert.deepEqual(orderedMarks(marks).map(([s]) => s), ['tap', 'captured', 'prepared', 'custom_step', 'verdict_on_screen', 'lists_on_screen']);
});

test('SCAN_STEPS lists the request path in order', () => {
  const at = (s: string) => SCAN_STEPS.indexOf(s as (typeof SCAN_STEPS)[number]);
  for (const [a, b] of [['tap', 'shutter_done'], ['captured', 'prepared'], ['prepared', 'upload_start'], ['upload_start', 'session_ready'], ['session_ready', 'response_headers'], ['response_headers', 'quick_verdict_response'], ['scan_label_response', 'verdict_on_screen']]) {
    assert.ok(at(a) >= 0 && at(a) < at(b), `${a} before ${b}`);
  }
});

test('scanDurations computes each step of a full scan', () => {
  assert.deepEqual(scanDurations(fullScan), {
    shutter_ms: 310,
    capture_ms: 330,
    prepare_ms: 310,
    capture_prepare_ms: 640,
    to_upload_ms: 5,
    session_ms: 5,
    first_byte_ms: 1255,
    quick_verdict_ms: 1455,
    scan_label_ms: 3555,
    tap_to_verdict_ms: 4230,
    tap_to_lists_ms: 4230,
    render_ms: 30,
  });
});

test('scanDurations leaves out spans with a missing or reversed end', () => {
  assert.deepEqual(scanDurations({ tap: 0, captured: 300 }), { capture_ms: 300 });
  assert.deepEqual(scanDurations({ tap: 0, captured: 500, prepared: 400 }), { capture_ms: 500, capture_prepare_ms: 400 });
  // Jev's wait passed: the verdict was painted before the reading came back, so render uses Jev's answer.
  const d = scanDurations({ tap: 0, upload_start: 100, quick_verdict_response: 900, verdict_on_screen: 6200, scan_label_response: 9000 });
  assert.equal(d.render_ms, 5300);
  assert.equal(d.tap_to_verdict_ms, 6200);
});

test('redactTrace keeps durations, sizes, statuses and step names only', () => {
  const out = redactTrace({
    id: 'k3j9x0aa',
    at: '2026-11-13T10:00:00.000Z',
    platform: 'ios',
    ...fullScan,
    upload_px: '1568x1176',
    picture_size: '1920x1440',
    capture_quality: 0.8,
    upload_bytes: 312_000,
    crop_failed: false,
    stream_status: 200,
    stream_body: 'whole',
    shown_verdict: 'BAD',
    scan_label_outcome: 'http_503',
    scan_label_error: 'reader_timeout',
    quick_verdict_server: { fn: 'quick-verdict', cold: true, jev_status: 'decided', jev_end_ms: 1200, client_camera: 'Back Camera of Jane' },
    steps: scanDurations(fullScan),
  });
  assert.equal(out.capture_quality, 0.8);
  assert.equal(out.upload_px, '1568x1176');
  assert.equal(out.stream_body, 'whole');
  assert.equal(out.scan_label_error, 'reader_timeout');
  assert.deepEqual(out.quick_verdict_server, { fn: 'quick-verdict', cold: true, jev_status: 'decided', jev_end_ms: 1200 });
  assert.equal((out.steps as Record<string, number>).capture_prepare_ms, 640);
});

test('redactTrace drops secrets, the photo, label text and free-text errors', () => {
  const secret = 'sb_publishable_abc123';
  const token = 'eyJhbGciOiJIUzI1NiJ9.payload.sig';
  const out = redactTrace({
    apikey: secret,
    Authorization: `Bearer ${token}`,
    access_token: token,
    image: '/9j/4AAQSkZJRgABAQ',
    uri: 'file:///var/mobile/photo.jpg',
    ingredients: ['sugar', 'water'],
    headline: 'Contains cane sugar',
    shown_verdict: 'Sugar, water, aspartame',
    error: 'Could not read: Sugar, Glucose syrup',
    quick_verdict_error: 'quick-verdict failed for jane@example.com',
    upload_px: '1568x1176; drop table',
    platform: 'ios',
    scan_label_server: { result: { verdict: 'BAD' }, claude_text: 'Sugar 12 g', email: 'a@b.c', sent_ms: 3000 },
    nested: { deeper: { sent_ms: 1 } },
    huge: 9_999_999,
    negative: -1,
  });
  const text = JSON.stringify(out);
  for (const leak of [secret, token, '/9j/', 'photo.jpg', 'sugar', 'Sugar', 'aspartame', 'jane@', 'a@b.c', 'drop table']) {
    assert.ok(!text.includes(leak), `leaked ${leak}`);
  }
  assert.deepEqual(out, {
    error: 'message',
    quick_verdict_error: 'message',
    platform: 'ios',
    scan_label_server: { sent_ms: 3000 },
  });
});

test('timingSummary prints the steps in order, then the durations', () => {
  const line = timingSummary({ prepared: 640, tap: 0, captured: 330 });
  assert.equal(line, 'tap 0 > captured 330 > prepared 640 | capture_ms=330 prepare_ms=310 capture_prepare_ms=640');
});

// postScan without Expo: a fake session and fetch, recording the order of the timing hooks.
function loadTransport(fetchImpl: (url: string, init: RequestInit) => Promise<Response>) {
  const module = { exports: {} as { postScan: (body: Record<string, unknown>, signal?: AbortSignal, onStep?: (s: string) => void) => Promise<Response> } };
  const code = ts.transpileModule(readFileSync(new URL('./scanTransport.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, {
    module, exports: module.exports, setTimeout, clearTimeout, AbortController,
    process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://example.invalid', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' } },
    fetch: fetchImpl,
    require: (id: string) => {
      if (id === './supabase') return { isConfigured: true, supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } } };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return module.exports.postScan;
}

test('postScan reports session_ready before the request and response_headers after it, step names only', async () => {
  const seen: unknown[] = [];
  const postScan = loadTransport(async () => {
    seen.push('fetch');
    return new Response('{}', { status: 200 });
  });
  const response = await postScan({ image: 'jpeg' }, undefined, (...args) => seen.push(args));
  assert.equal(response.status, 200);
  assert.deepEqual(seen, [['session_ready'], 'fetch', ['response_headers']]);
});

test('postScan does not report response_headers when the request fails', async () => {
  const seen: string[] = [];
  const postScan = loadTransport(async () => { throw new Error('offline'); });
  await assert.rejects(postScan({ image: 'jpeg' }, undefined, (s) => seen.push(s)));
  assert.deepEqual(seen, ['session_ready']);
});
