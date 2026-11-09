import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isJpegBase64, MAX_IMAGE_BASE64 } from './guard.ts';

const jpeg = '/9j/' + 'A'.repeat(200);

test('accepts a base64 JPEG', () => assert.equal(isJpegBase64(jpeg), true));
test('rejects non-strings and tiny payloads', () => {
  assert.equal(isJpegBase64(42), false);
  assert.equal(isJpegBase64('/9j/AAAA'), false);
});
test('rejects PNG and other formats', () => assert.equal(isJpegBase64('iVBORw0KGgo' + 'A'.repeat(200)), false));
test('rejects non-base64 characters', () => assert.equal(isJpegBase64('/9j/' + '<script>'.repeat(30)), false));
test('rejects oversized payloads', () => assert.equal(isJpegBase64('/9j/' + 'A'.repeat(MAX_IMAGE_BASE64)), false));
