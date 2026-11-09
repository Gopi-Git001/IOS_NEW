import assert from 'node:assert/strict';
import { test } from 'node:test';
import { autoCaptureStep, frameChange, initialAutoCapture, lockAutoCapture, type AutoCaptureState } from './sharpness.ts';

const gray = (v = 100) => new Uint8ClampedArray(48).fill(v);
const step = (state: AutoCaptureState, at: number, sharpness = 200, v = 100, canRearm = true) =>
  autoCaptureStep(state, { gray: gray(v), at, sharpness, canRearm });

test('auto capture requires continuous sharp steady samples spanning half a second', () => {
  let state = initialAutoCapture();
  for (let at = 0; at < 700; at += 140) {
    const next = step(state, at);
    assert.equal(next.fire, false);
    state = next.state;
  }
  const next = step(state, 700);
  assert.equal(next.fire, true);
  assert.equal(next.state.locked, true);
});

test('blur, movement and long background gaps reset the hold', () => {
  for (const interruption of [{ at: 420, score: 79, value: 100 }, { at: 420, score: 200, value: 110 }, { at: 900, score: 200, value: 100 }]) {
    let state = initialAutoCapture();
    for (const at of [0, 140, 280]) state = step(state, at).state;
    const next = step(state, interruption.at, interruption.score, interruption.value);
    assert.equal(next.fire, false);
    assert.equal(next.state.count, 0);
    assert.equal(next.state.since, undefined);
  }
});

test('never fires twice on unchanged label after returning to camera', () => {
  let state = lockAutoCapture({ ...initialAutoCapture(), previous: gray() });
  for (let at = 0; at < 3000; at += 140) {
    const next = step(state, at);
    assert.equal(next.fire, false);
    assert.equal(next.state.locked, true);
    state = next.state;
  }
});

test('re-arm requires return plus two changed frames, then a fresh stable hold', () => {
  let state = lockAutoCapture({ ...initialAutoCapture(), previous: gray() });
  for (const at of [0, 140, 280]) state = step(state, at, 200, 150, false).state;
  assert.equal(state.locked, true);
  state = step(state, 420, 200, 150).state;
  assert.equal(state.locked, true);
  state = step(state, 560, 200, 150).state;
  assert.equal(state.locked, false);
  for (const at of [700, 840, 980, 1120]) {
    const next = step(state, at, 200, 150);
    assert.equal(next.fire, false);
    state = next.state;
  }
  assert.equal(step(state, 1260, 200, 150).fire, true);
});

test('manual capture without samples stays locked until a later scene change', () => {
  let state = lockAutoCapture(initialAutoCapture());
  state = step(state, 0).state;
  assert.equal(state.locked, true);
  assert.ok(state.reference);
  assert.equal(step(state, 140).fire, false);
});

test('automatic shot then capture lock preserves its scene and re-arms for an already changed label', () => {
  let state = initialAutoCapture();
  for (const at of [0, 140, 280, 420, 560]) state = step(state, at).state;
  const shot = step(state, 700);
  assert.equal(shot.fire, true);
  state = lockAutoCapture(shot.state); // LabelCamera.capture() locks again.
  assert.deepEqual(state.reference, gray(100));
  state = step(state, 2000, 200, 150).state; // Different label already visible on return.
  assert.equal(state.locked, true);
  state = step(state, 2140, 200, 150).state;
  assert.equal(state.locked, false);
  for (const at of [2280, 2420, 2560, 2700]) {
    const next = step(state, at, 200, 150);
    assert.equal(next.fire, false);
    state = next.state;
  }
  assert.equal(step(state, 2840, 200, 150).fire, true);
});

test('manual shot uses the latest sampled scene and repeated locking keeps it', () => {
  // A manual shot can happen while still locked from an earlier automatic shot.
  let state = lockAutoCapture({ ...initialAutoCapture(), previous: gray(50) });
  state = step(state, 0, 200, 100, false).state;
  state = lockAutoCapture(state); // Manual shutter must use this shot's scene, not the old one.
  state = lockAutoCapture(state);
  assert.deepEqual(state.reference, gray(100));
  for (const at of [2000, 2140]) {
    state = step(state, at).state;
    assert.equal(state.locked, true); // No repeat of the manually captured scene.
  }
  state = step(state, 2280, 200, 150).state;
  state = step(state, 2420, 200, 150).state;
  assert.equal(state.locked, false);
});

test('nonfinite sharpness and empty/mismatched frames cannot trigger capture', () => {
  assert.equal(step(initialAutoCapture(), 0, Infinity).fire, false);
  assert.equal(frameChange([], []), Infinity);
  assert.equal(frameChange([1], [1, 2]), Infinity);
  assert.equal(frameChange([100, 100], [102, 104]), 3);
});
