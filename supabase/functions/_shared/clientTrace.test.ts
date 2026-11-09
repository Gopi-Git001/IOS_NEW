import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clientTrace } from './clientTrace.ts';

test('production trace keeps technical timings and strips identifiers and free text', () => {
  assert.deepEqual(clientTrace({
    tap: 0, captured: 25, image_kb: 270, photo_px: '4032x3024', stream_px: '1920x1080', upload_px: '1568x1200',
    capture_path: 'burst', network: '4g', platform: 'web',
    user_id: 'private', ip: 'private', image: 'photo', label: 'ingredients', error: 'private',
    id: 'scan-id', at: 'timestamp', shown_verdict: 'UGLY', quick_verdict_server: { private: 'no' },
  }), {
    tap: 0, captured: 25, image_kb: 270, photo_px: '4032x3024', stream_px: '1920x1080', upload_px: '1568x1200',
    platform: 'web', capture_path: 'burst', network: '4g',
  });
});

test('trace rejects invalid values, nested fields and arbitrary technical strings', () => {
  assert.deepEqual(clientTrace({ captured: -1, prepared: Infinity, image_kb: 'no', network: 'private', platform: 'account', photo_px: 'private', tap: NaN }), {});
  assert.deepEqual(clientTrace(null), {});
});
