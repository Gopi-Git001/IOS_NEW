// Run with: npm run test:rules
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { askJev, buildJevRequest, readJevResponse } from './jev.ts';

const answer = (choice: string, confidence: number, label = 0.97) => ({
  model: 'jev-1.14.0',
  answers: {
    is_food_label: { type: 'noul', noul: label },
    verdict: { type: 'choice', choice, confidence, probabilities: { CLEAN: 0.02, BAD: 0.08, UGLY: 0.9 } },
  },
});

test('request sends the photo as an image asset referenced from state', () => {
  const req = buildJevRequest('BASE64DATA', 'ref-123');
  assert.equal(req.model, 'jev-latest');
  assert.equal(req.state.label_photo, 'ref-123');
  assert.deepEqual(req.assets['ref-123'], { type: 'image', format: 'jpg', data_base64: 'BASE64DATA' });
  assert.equal(req.questions.verdict.type, 'choice');
  assert.deepEqual(Object.keys(req.questions.verdict.criteria), ['CLEAN', 'BAD', 'UGLY']);
  assert.equal(req.questions.is_food_label.type, 'noul');
});

test('a confident answer is the verdict', () => {
  const r = readJevResponse(answer('UGLY', 0.88));
  assert.equal(r.status, 'decided');
  if (r.status === 'decided') {
    assert.equal(r.verdict, 'UGLY');
    assert.equal(r.probabilities.UGLY, 0.9);
    assert.equal(r.model, 'jev-1.14.0');
  }
});

test('a low-confidence answer is unsure, so the app waits for the rules', () => {
  assert.equal(readJevResponse(answer('BAD', 0.2)).status, 'unsure');
});

test('a photo that is not a label is reported as such', () => {
  assert.equal(readJevResponse(answer('CLEAN', 0.9, 0.1)).status, 'not_a_label');
});

test('old OKAY answers or garbage are unavailable', () => {
  assert.equal(readJevResponse(answer('OKAY', 0.9)).status, 'unavailable');
  assert.equal(readJevResponse({ answers: {} }).status, 'unavailable');
  assert.equal(readJevResponse(null).status, 'unavailable');
});

test('missing API key skips the call', async () => {
  assert.deepEqual(await askJev('x', undefined), { status: 'unavailable', reason: 'TYPESAFE_API_KEY not set' });
});
