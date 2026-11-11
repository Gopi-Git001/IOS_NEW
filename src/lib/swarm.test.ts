import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bitAlpha,
  BURST_DELAY_MS,
  BURST_LIFE_MS,
  burstBand,
  burstColors,
  cappedPixelRatio,
  KINDS,
  makeBurst,
  makeSwarm,
  quietDim,
  stepBurst,
  stepSwarm,
  swarmCount,
} from './swarm';

const phone = { width: 390, height: 844 };
const desktop = { width: 1440, height: 900 };
// Roughly where the sign-in copy and footer sit on a phone.
const around = { x: 24, y: 520, width: 342, height: 290 };
const quiet = [{ x: 24, y: 520, width: 342, height: 150 }, { x: 60, y: 780, width: 270, height: 30 }];

test('the sign-in swarm is light: 60 to 90 crystals on phones, never more than 140', () => {
  assert.equal(swarmCount(phone), 73);
  for (const view of [{ width: 320, height: 568 }, phone, { width: 430, height: 932 }, { width: 699, height: 1400 }]) {
    const n = swarmCount(view);
    assert.ok(n >= 60 && n <= 90, `${view.width}x${view.height} gave ${n}`);
  }
  assert.equal(swarmCount(desktop), 140);
  assert.equal(swarmCount({ width: 3840, height: 2160 }), 140);
  assert.equal(makeSwarm(phone, around, quiet).parts.length, 73);
});

test('device pixel ratio is capped: 1.5 on phones, 2 on wide screens, never below 1', () => {
  assert.equal(cappedPixelRatio(3, 390), 1.5);
  assert.equal(cappedPixelRatio(2, 390), 1.5);
  assert.equal(cappedPixelRatio(1, 390), 1);
  assert.equal(cappedPixelRatio(3, 1440), 2);
  assert.equal(cappedPixelRatio(undefined, 1440), 1);
  assert.equal(cappedPixelRatio(0.5, 1440), 1);
});

test('only cubes and shards are used, and far crystals are drawn first', () => {
  const s = makeSwarm(desktop, { x: 500, y: 300, width: 440, height: 300 }, []);
  for (const p of s.parts) assert.ok(Number.isInteger(p.kind) && p.kind >= 0 && p.kind < KINDS);
  for (let i = 1; i < s.parts.length; i++) assert.ok(s.parts[i].z >= s.parts[i - 1].z);
});

test('the swarm is the same every time, so the reduced-motion still frame never changes', () => {
  const a = makeSwarm(phone, around, quiet);
  const b = makeSwarm(phone, around, quiet);
  for (let i = 0; i < 90; i++) {
    stepSwarm(a, 1 / 30);
    stepSwarm(b, 1 / 30);
  }
  assert.deepEqual(a.parts.map((p) => [p.x, p.y, p.rot]), b.parts.map((p) => [p.x, p.y, p.rot]));
});

test('sharp crystals stay off the sign-in text once the swarm has settled', () => {
  for (const [view, block, text] of [
    [phone, around, quiet],
    [desktop, { x: 500, y: 560, width: 440, height: 290 }, [{ x: 500, y: 560, width: 440, height: 150 }, { x: 585, y: 820, width: 270, height: 30 }]],
  ] as const) {
    const s = makeSwarm(view, block, [...text]);
    for (let i = 0; i < 90; i++) stepSwarm(s, 1 / 30); // the settle used for the still frame
    for (let i = 0; i < 1800; i++) {
      stepSwarm(s, 1 / 60); // thirty more seconds of drift
      for (const p of s.parts) {
        if (p.blur !== 0) continue;
        for (const q of text) {
          const inside = p.x > q.x + 2 && p.x < q.x + q.width - 2 && p.y > q.y + 2 && p.y < q.y + q.height - 2;
          assert.ok(!inside, `sharp crystal over text at ${p.x.toFixed(1)},${p.y.toFixed(1)} (step ${i}, ${view.width} wide)`);
        }
      }
    }
  }
});

test('soft crystals passing behind the text are dimmed to a quarter', () => {
  const [copy] = quiet;
  assert.equal(quietDim(5, 100, quiet), 1);
  assert.ok(Math.abs(quietDim(copy.x + copy.width / 2, copy.y + copy.height / 2, quiet) - 0.24) < 1e-9);
  const edge = quietDim(copy.x, copy.y + 60, quiet);
  assert.ok(edge > 0.24 && edge < 1);
  assert.equal(quietDim(copy.x - 30, copy.y + 60, quiet), 1);
});

test('burst colours follow the verdict on screen; anything else gets no burst', () => {
  assert.equal(burstColors('CLEAN')?.tint.toLowerCase(), '#5be49b');
  assert.equal(burstColors('OKAY')?.tint.toLowerCase(), '#ffc24d');
  assert.equal(burstColors('BAD')?.tint.toLowerCase(), '#ff7a66');
  for (const other of ['RETRY', 'UGLY', 'clean', '', 'toString', undefined, null, 3]) assert.equal(burstColors(other), null, String(other));
});

const sheetPhone = { x: 7.8, y: 182, width: 374.4, height: 650 };
const sheetDesktop = { x: 370, y: 250, width: 700, height: 640 };

test('the burst leaves the sheet edge, heads away from it, and is over within a second', () => {
  for (const [sheet, view] of [[sheetPhone, phone], [sheetDesktop, desktop]] as const) {
    const bits = makeBurst(sheet, view);
    assert.ok(bits.length >= 40 && bits.length <= 80, `${bits.length} pieces`);
    for (const b of bits) {
      assert.ok(b.kind >= -1 && b.kind < KINDS);
      assert.ok(b.x >= sheet.x && b.x <= sheet.x + sheet.width);
      const fromTop = Math.abs(b.y - (sheet.y + 6)) < 1e-9;
      if (fromTop) assert.ok(b.vy < 0, 'top-edge crystals go up');
      else assert.ok(b.x < sheet.x + 10 ? b.vx < 0 : b.vx > 0, 'side crystals go outward');
      assert.equal(bitAlpha(b), 0, 'nothing shows before it starts');
    }
    let alive = bits.length;
    let ms = 0;
    while (alive > 0 && ms < 5000) {
      alive = stepBurst(bits, 1 / 60);
      ms += 1000 / 60;
    }
    assert.ok(ms <= BURST_LIFE_MS + 17, `burst ran ${ms.toFixed(0)} ms`);
    for (const b of bits) assert.equal(bitAlpha(b), 0);
  }
  assert.ok(BURST_DELAY_MS + BURST_LIFE_MS <= 1200);
});

test('phones only get the spray above the sheet; wide screens add the sides', () => {
  const top = (sheet: typeof sheetPhone, view: typeof phone) => makeBurst(sheet, view).filter((b) => Math.abs(b.y - (sheet.y + 6)) < 1e-9).length;
  assert.equal(makeBurst(sheetPhone, phone).length, top(sheetPhone, phone));
  assert.ok(makeBurst(sheetDesktop, desktop).length > top(sheetDesktop, desktop));
});

test('the burst canvas is a strip near the sheet edge, never the whole phone screen', () => {
  const band = burstBand(sheetPhone, phone);
  assert.deepEqual(band, { top: 0, height: 198 });
  const low = burstBand({ ...sheetPhone, y: 400 }, phone);
  assert.deepEqual(low, { top: 180, height: 236 });
  const wide = burstBand(sheetDesktop, desktop);
  assert.equal(wide.top, 30);
  assert.ok(wide.top + wide.height <= desktop.height);
});
