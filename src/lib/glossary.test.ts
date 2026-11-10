import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addedAmount, gramsLine, lookup } from './glossary.ts';

test('aliases reveal sugar with a specific line', () => {
  const e = lookup('Evaporated Cane Juice', 'added');
  assert.equal(e.reveal, "That's sugar.");
  assert.match(e.blurb, /cane sugar/);
  assert.equal(e.effect, 'Over 4 g of added sugar per serving makes it BAD; less makes it OKAY.');
});

test('longest name wins: high fructose corn syrup is not just "syrup"', () => {
  assert.match(lookup('High Fructose Corn Syrup', 'added').blurb, /corn syrup, about half fructose/);
});

test('sweeteners carry their verdict effect', () => {
  assert.equal(lookup('Erythritol (sugar alcohol)', 'sweetener').effect, 'Makes it OKAY.');
  assert.equal(lookup('Stevia Leaf Extract', 'sweetener').effect, 'Makes it OKAY.');
  assert.equal(lookup('Sucralose', 'sweetener').reveal, "That's an artificial sweetener.");
});

test('unknown names fall back to the section default', () => {
  assert.equal(lookup('Mystery Nectar', 'added').reveal, "That's sugar.");
  assert.equal(lookup('Lactose', 'natural').effect, "Doesn't count against it.");
});

test('grams line converts to teaspoons', () => {
  assert.equal(gramsLine(['Sugar', '6 g added per serving']), '6 g added per serving · about 1½ teaspoons');
  assert.equal(gramsLine(['4 g added per serving']), '4 g added per serving · about 1 teaspoon');
  assert.equal(gramsLine(['1 g added per serving']), '1 g added per serving · under ½ teaspoon');
  assert.equal(gramsLine(['2 g added per serving']), '2 g added per serving · about ½ teaspoon');
  assert.equal(gramsLine(['Honey']), null);
});


test('addedAmount splits grams and teaspoons for the panel', () => {
  assert.deepEqual(addedAmount(['cane sugar', '6 g added per serving']), { grams: '6 g', amount: 'about 1½ teaspoons' });
  assert.equal(addedAmount(['cane sugar']), null);
});
