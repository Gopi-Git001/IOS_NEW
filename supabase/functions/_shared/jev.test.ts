// Run with: npm run test:rules
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { askJev, buildJevRequest, readJevResponse } from './jev.ts';
import type { LabelReading } from './rules.ts';

const reading: LabelReading = {
  is_food_label: true,
  natural_sugars: [],
  added_sugars: ['Sucrose'],
  artificial_sweeteners: ['Aspartame'],
  sugar_alcohols: [],
  other_sweeteners: [],
  contains_alcohol: false,
  added_sugar_grams: 39,
};

test('request matches the TypeSafe choice-question shape', () => {
  const req = buildJevRequest(reading);
  assert.equal(req.model, 'jev-latest');
  assert.equal(req.questions.verdict.type, 'choice');
  assert.deepEqual(Object.keys(req.questions.verdict.criteria), ['CLEAN', 'OKAY', 'BAD']);
  assert.equal(req.state.label.added_sugar_grams_per_serving, 39);
});

test('agreeing answer', () => {
  const body = { model: 'jev-1.14.0', answers: { verdict: { type: 'choice', choice: 'BAD', confidence: 0.91 } } };
  assert.deepEqual(readJevResponse(body, 'BAD'), { status: 'agrees', jevVerdict: 'BAD', confidence: 0.91, model: 'jev-1.14.0' });
});

test('disagreeing answer is reported, not obeyed', () => {
  const body = { model: 'jev-1.14.0', answers: { verdict: { type: 'choice', choice: 'OKAY', confidence: 0.6 } } };
  assert.equal(readJevResponse(body, 'BAD').status, 'disagrees');
});

test('garbage response is treated as unavailable', () => {
  assert.equal(readJevResponse({ answers: {} }, 'BAD').status, 'unavailable');
  assert.equal(readJevResponse(null, 'BAD').status, 'unavailable');
});

test('missing API key skips the call', async () => {
  assert.deepEqual(await askJev(reading, 'BAD', undefined), { status: 'unavailable', reason: 'TYPESAFE_API_KEY not set' });
});
