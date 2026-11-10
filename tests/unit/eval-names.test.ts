// The eval compares sugar names the way the rules match them.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonicalName } from '../eval/names.ts';

test('eval names: case and qualifiers are ignored', () => {
  assert.equal(canonicalName('PURE CANE SUGAR'), canonicalName('Cane Sugar'));
  assert.equal(canonicalName('Organic Brown Rice Syrup'), canonicalName('Brown Rice Syrup'));
  assert.equal(canonicalName('organic unsulphured molasses'), canonicalName('Molasses'));
  assert.equal(canonicalName('Erythritol (sugar alcohol)'), canonicalName('erythritol'));
  assert.equal(canonicalName('cane sugar*♦'), canonicalName('Cane Sugar'));
});

test('eval names: different sugars stay different', () => {
  assert.notEqual(canonicalName('Brown Sugar Syrup'), canonicalName('Sugar'));
  assert.notEqual(canonicalName('Cane Sugar'), canonicalName('Coconut Sugar'));
  assert.notEqual(canonicalName('Honey'), canonicalName('Sugar'));
});
