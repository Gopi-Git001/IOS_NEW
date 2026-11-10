import assert from 'node:assert/strict';
import { test } from 'node:test';
import { laplacianVariance, MIN_SHARPNESS, toGray } from './sharpness.ts';

const W = 64;
const H = 64;
const image = (pixel: (x: number, y: number) => number) => Array.from({ length: W * H }, (_, i) => pixel(i % W, Math.floor(i / W)));

test('a flat image has no sharpness', () => assert.equal(laplacianVariance(image(() => 128), W, H), 0));

test('crisp text-like stripes score far above the blur threshold', () => {
  const crisp = image((x) => (x % 4 < 2 ? 20 : 235));
  assert.ok(laplacianVariance(crisp, W, H) > MIN_SHARPNESS * 50);
});

test('a soft gradient scores below the blur threshold', () => {
  const soft = image((x) => 128 + 40 * Math.sin(x / 12));
  assert.ok(laplacianVariance(soft, W, H) < MIN_SHARPNESS);
});

test('gray uses the luma weights', () => {
  assert.deepEqual(Array.from(toGray([255, 0, 0, 255, 0, 255, 0, 255], 2, 1)), [76, 150]);
});
