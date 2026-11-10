// Run with: npm run test:unit
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import jpeg from 'jpeg-js';
import { JEV_MIN_SIDE, jpegSize, padForJev, padPlan } from './pad.ts';

/** A solid-grey JPEG of the given size, as base64. */
function grey(width: number, height: number): string {
  const data = new Uint8Array(width * height * 4).fill(128);
  return Buffer.from(jpeg.encode({ data, width, height }, 90).data).toString('base64');
}

const sizeOf = (b64: string) => jpegSize(Buffer.from(b64, 'base64'));

test('jpegSize reads width and height from the JPEG header', () => {
  assert.deepEqual(sizeOf(grey(250, 1000)), { width: 250, height: 1000 });
  assert.equal(jpegSize(new Uint8Array([1, 2, 3])), null);
});

test('a 250 px wide photo is padded to 280 px wide, height kept, not stretched', () => {
  const out = padForJev(grey(250, 1000));
  assert.equal(out.padded, true);
  assert.deepEqual(sizeOf(out.image), { width: JEV_MIN_SIDE, height: 1000 });
  if (out.padded) assert.deepEqual([out.from, out.to], ['250x1000', '280x1000']);
  // The photo sits in the middle on white: the left edge is white, the centre is still grey.
  const px = jpeg.decode(Buffer.from(out.image, 'base64'), { useTArray: true });
  const at = (x: number, y: number) => px.data[(y * px.width + x) * 4];
  assert.ok(at(2, 500) > 240, 'left padding is white');
  assert.ok(Math.abs(at(140, 500) - 128) < 8, 'centre is the photo');
});

test('a wide, short photo is padded top and bottom', () => {
  const out = padForJev(grey(1568, 200));
  assert.deepEqual(sizeOf(out.image), { width: 1568, height: JEV_MIN_SIDE });
});

test('photos with both sides 280 px or more go through untouched', () => {
  const img = grey(280, 1568);
  assert.deepEqual(padForJev(img), { image: img, padded: false });
});

test('anything that is not a JPEG goes through untouched', () => {
  assert.deepEqual(padForJev('aGVsbG8='), { image: 'aGVsbG8=', padded: false });
});

test('padPlan centres the image', () => {
  assert.deepEqual(padPlan(250, 1000), { width: 280, height: 1000, left: 15, top: 0, needed: true });
  assert.deepEqual(padPlan(100, 100), { width: 280, height: 280, left: 90, top: 90, needed: true });
  assert.equal(padPlan(300, 300).needed, false);
});
