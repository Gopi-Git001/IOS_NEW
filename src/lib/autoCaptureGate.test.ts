import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUTO_CAPTURE_DEFAULT, autoCaptureOn } from './autoCaptureGate';

const ready = { pref: true, scansLeft: true, active: true, busy: false, ready: true };

test('auto-capture is off by default: people take the photo with the shutter', () => {
  assert.equal(AUTO_CAPTURE_DEFAULT, false);
});

test('with the setting off, nothing ever captures automatically', () => {
  for (const scansLeft of [true, false])
    for (const active of [true, false])
      for (const busy of [true, false])
        for (const cam of [true, false]) assert.equal(autoCaptureOn({ pref: false, scansLeft, active, busy, ready: cam }), false);
});

test('turned on in Menu, it runs only while the camera can take a shot', () => {
  assert.equal(autoCaptureOn(ready), true);
  assert.equal(autoCaptureOn({ ...ready, busy: true }), false); // a photo is being processed
  assert.equal(autoCaptureOn({ ...ready, active: false }), false); // result or a sheet is showing
  assert.equal(autoCaptureOn({ ...ready, ready: false }), false); // camera not started yet
  assert.equal(autoCaptureOn({ ...ready, scansLeft: false }), false); // guest out of free scans
});
