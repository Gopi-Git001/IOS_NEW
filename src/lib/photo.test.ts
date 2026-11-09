import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boxInImage, toPixels, withMargin } from './photo.ts';

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('box maps straight through when the image has the view’s shape', () => {
  const r = boxInImage({ x: 40, y: 200, width: 320, height: 246, viewWidth: 400, viewHeight: 800 }, 800, 1600);
  close(r.x, 0.1);
  close(r.y, 0.25);
  close(r.width, 0.8);
  close(r.height, 246 / 800);
});

test('a wider image is cropped at the sides by cover, so the box covers less of its width', () => {
  // 3:4 photo behind a 1:2 screen: only 2/3 of the photo width is visible.
  const r = boxInImage({ x: 0, y: 0, width: 400, height: 800, viewWidth: 400, viewHeight: 800 }, 1200, 1600);
  close(r.x, 1 / 6);
  close(r.y, 0);
  close(r.width, 2 / 3);
  close(r.height, 1);
});

test('margin grows the box and stays inside the image', () => {
  const r = withMargin({ x: 0.05, y: 0.4, width: 0.9, height: 0.2 }, 0.1);
  close(r.x, 0);
  close(r.y, 0.38);
  close(r.width, 1);
  close(r.height, 0.24);
});

test('pixels are rounded and clamped to the image', () => {
  assert.deepEqual(toPixels({ x: 0.5, y: 0.5, width: 0.6, height: 0.6 }, 1000, 800), { originX: 500, originY: 400, width: 500, height: 400 });
});
