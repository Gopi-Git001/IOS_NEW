import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nutriScore, yukaScore, type Per100 } from './yukaScore.ts';

const zero: Per100 = { energyKj: 0, sugarsG: 0, saturatedFatG: 0, sodiumMg: 0, fiberG: 0, proteinG: 0, fruitVegPct: 0 };

test('fresh apple: 90 conventional, 100 organic (matches BBC Good Food observation)', () => {
  const apple = { ...zero, energyKj: 218, sugarsG: 10.4, sodiumMg: 1, fiberG: 2.4, proteinG: 0.3, fruitVegPct: 100 };
  const n = nutriScore('general', apple);
  assert.equal(n.points, -5);
  assert.equal(n.letter, 'A');
  assert.equal(yukaScore({ category: 'general', per100: apple, additives: [], organic: false }).score, 90);
  assert.equal(yukaScore({ category: 'general', per100: apple, additives: [], organic: true }).score, 100);
});

test('cola-style soft drink lands in Bad', () => {
  const cola = { ...zero, energyKj: 180, sugarsG: 10.6, sodiumMg: 4 };
  const n = nutriScore('beverage', cola);
  assert.equal(n.n, 14); // energy 6 + sugars 8
  assert.equal(n.letter, 'E');
  const r = yukaScore({ category: 'beverage', per100: cola, additives: ['orange', 'yellow'], organic: false });
  assert.equal(r.parts.nutrition, 0);
  assert.equal(r.parts.additives, 9);
  assert.equal(r.score, 9);
  assert.equal(r.rating, 'Bad');
});

test('a red additive caps an otherwise excellent product at 49', () => {
  const r = yukaScore({ category: 'general', per100: { ...zero, fiberG: 5, proteinG: 9 }, additives: ['red'], organic: true });
  assert.equal(r.nutri.letter, 'A');
  assert.equal(r.capped, true);
  assert.equal(r.score, 49);
});

test('best possible D (11 points) reaches exactly 49 without the cap', () => {
  // N = 11 with no positive points: energy 1676 kJ (5), sugars 22.6 (5), sat 1.5 (1), sodium 0.
  const d = { ...zero, energyKj: 1676, sugarsG: 22.6, saturatedFatG: 1.5 };
  const r = yukaScore({ category: 'general', per100: d, additives: [], organic: true });
  assert.equal(r.nutri.points, 11);
  assert.equal(r.nutri.letter, 'D');
  assert.equal(r.score, 49);
  assert.equal(r.capped, false);
});

test('protein is dropped when N >= 11, except for cheese', () => {
  const x = { ...zero, energyKj: 1500, saturatedFatG: 19, sodiumMg: 650, proteinG: 25 }; // N = 4 + 10 + 7 = 21
  assert.equal(nutriScore('general', x).points, 21);
  assert.equal(nutriScore('cheese', x).points, 16);
});

test('fats use the saturated / total fat ratio', () => {
  const olive = { ...zero, energyKj: 3700, fatG: 100, saturatedFatG: 14 };
  assert.equal(nutriScore('fat', olive).n, 10 + 1); // energy 10, ratio 14% -> 1
});

test('additive penalties add up and floor at 0', () => {
  const r = yukaScore({ category: 'general', per100: zero, additives: ['orange', 'orange', 'yellow'], organic: false });
  assert.equal(r.parts.additives, 0);
});

test('water is A and scores 90 with no additives or organic bonus', () => {
  assert.equal(yukaScore({ category: 'water', per100: zero, additives: [], organic: false }).score, 90);
});
