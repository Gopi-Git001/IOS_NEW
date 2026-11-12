import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeSwarm, quietDim, stepSwarm } from './swarm';
import { relativeBox, SPRITE, swarmFrame } from './swarmFrame';

const phone = { width: 390, height: 844 };
const around = { x: 24, y: 120, width: 342, height: 420 };
const quiet = [{ x: 0, y: 120, width: 390, height: 200 }, { x: 20, y: 480, width: 350, height: 90 }];

test('every crystal on screen is drawn once, with its own sprite and blur', () => {
  const s = makeSwarm(phone, around, quiet);
  const { crystals } = swarmFrame(s);
  assert.equal(crystals.length, s.parts.filter((p) => p.x >= -80 && p.x <= 470 && p.y >= -80 && p.y <= 924).length);
  assert.ok(crystals.length > 0);
  const p = s.parts.find((q) => q.x === crystals[0].x && q.y === crystals[0].y)!;
  assert.equal(crystals[0].kind, p.kind);
  assert.equal(crystals[0].blur, p.blur);
});

test('crystals far off screen are skipped', () => {
  const s = makeSwarm(phone, around, quiet);
  s.parts[0].x = -500;
  s.parts[1].y = phone.height + 500;
  const drawn = swarmFrame(s).crystals;
  assert.equal(drawn.length, swarmFrame({ ...s, parts: s.parts.slice(2) }).crystals.length);
});

test('a crystal is scaled from the 96 px sprite, squashed by its tumble and turned in degrees', () => {
  const s = makeSwarm(phone, around, []);
  const p = s.parts[0];
  Object.assign(p, { x: 100, y: 100, size: 48, tumble: 0, rot: Math.PI / 2 });
  const c = swarmFrame({ ...s, parts: [p] }).crystals[0];
  assert.equal(c.sy, 48 / SPRITE);
  assert.equal(c.sx, 48 / SPRITE); // facing front: no squash
  assert.equal(c.degrees, 90);
  p.tumble = Math.PI / 2; // edge on
  assert.ok(Math.abs(swarmFrame({ ...s, parts: [p] }).crystals[0].sx - 0.3 * (48 / SPRITE)) < 1e-9);
});

test('crystals behind quiet text fade like on the web', () => {
  const s = makeSwarm(phone, around, quiet);
  const p = s.parts[0];
  Object.assign(p, { x: 195, y: 200, tumble: 0 });
  const c = swarmFrame({ ...s, parts: [p] }).crystals[0];
  assert.ok(Math.abs(c.alpha - p.alpha * quietDim(195, 200, quiet)) < 1e-9);
  assert.ok(quietDim(195, 200, quiet) < 1);
});

test('glints only sparkle on sharp, near crystals', () => {
  const s = makeSwarm(phone, around, []);
  for (let i = 0; i < 300; i++) stepSwarm(s, 1 / 30);
  const seen = new Set<number>();
  for (let i = 0; i < 300; i++) {
    stepSwarm(s, 1 / 30);
    for (const g of swarmFrame(s).glints) {
      const p = s.parts.find((q) => q.x === g.x && Math.abs(q.y - q.size * 0.28 - g.y) < 1e-9)!;
      assert.equal(p.blur, 0);
      assert.ok(p.z > 0.45);
      assert.ok(g.alpha > 0 && g.alpha <= 1);
      seen.add(s.parts.indexOf(p));
    }
  }
  assert.ok(seen.size > 0, 'some crystal should glint over ten seconds');
});

test('measured boxes move into the swarm area, and empty ones are ignored', () => {
  const host = { x: 0, y: 47, width: 390, height: 797 };
  assert.deepEqual(relativeBox({ x: 24, y: 147, width: 300, height: 60 }, host), { x: 24, y: 100, width: 300, height: 60 });
  assert.equal(relativeBox({ x: 24, y: 147, width: 0, height: 60 }, host), null);
  assert.equal(relativeBox(null, host), null);
});
