// The home page "try it" widget (sites/sugardepth/src/lib/tryIt.ts): pasted text -> the shared rules -> the panel.
// The verdicts themselves are covered by verdict-rules.test.ts; these tests cover the paste path around them and
// check that the widget gives exactly what the scanner's rules give. Pure: no DOM, no network.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { evaluate } from '../../supabase/functions/_shared/policy.ts';
import { decide } from '../../supabase/functions/_shared/rules.ts';
import {
  labelFromText,
  MAX_PASTE_CHARS,
  parseGrams,
  renderResult,
  SAMPLES,
  scanText,
  toIngredientText,
  type TryResult,
} from '../../sites/sugardepth/src/lib/tryIt.ts';

type Verdict = Extract<TryResult, { kind: 'verdict' }>;

function verdict(pasted: string, grams: number | null = null): Verdict {
  const r = scanText(pasted, grams);
  assert.equal(r.kind, 'verdict', `expected a verdict for ${JSON.stringify(pasted)}`);
  return r as Verdict;
}

const tagged = (r: Verdict) => Object.fromEntries(r.items.filter((i) => i.tag).map((i) => [i.name, i.tag]));
const deciders = (r: Verdict) => r.items.filter((i) => i.decided).map((i) => i.name);

describe('pasted text becomes an ingredient list', () => {
  test('a comma list is passed through as typed', () => {
    assert.equal(toIngredientText('  Water, Cane Sugar, Salt.  '), 'Water, Cane Sugar, Salt.');
  });

  test('a list wrapped over several lines keeps its commas and its wording', () => {
    assert.equal(toIngredientText('Water, Cane\nSugar, Salt'), 'Water, Cane\nSugar, Salt');
    assert.deepEqual(deciders(verdict('Water, Cane\r\nSugar, Salt')), ['Cane Sugar']);
  });

  test('one ingredient per line, with or without bullets, becomes a comma list', () => {
    assert.equal(toIngredientText('Water\nCane sugar\n\nSalt'), 'Water, Cane sugar, Salt');
    assert.equal(toIngredientText('- Water\n• Cane sugar\n3. Salt\n* Honey'), 'Water, Cane sugar, Salt, Honey');
    assert.deepEqual(deciders(verdict('Water\r\nCane sugar\r\nSalt')), ['Cane sugar']);
  });

  test('invisible characters copied from a web page do not hide an ingredient', () => {
    assert.equal(toIngredientText('\uFEFFWater, Su\u200Bcralose'), 'Water, Sucralose');
    assert.equal(verdict('Water, Su\u200Bcralose').ruleId, 'X3-artificial-sweetener');
  });

  test('"Ingredients:" and "Contains 2% or less of" are read the way the scanner reads them', () => {
    const r = verdict('INGREDIENTS: WATER, CONTAINS 2% OR LESS OF: NATURAL FLAVOR, SUCRALOSE (SPLENDA).');
    assert.deepEqual(r.items.map((i) => i.name), ['WATER', 'NATURAL FLAVOR', 'SUCRALOSE']);
    assert.equal(r.verdict, 'BAD');
  });

  test('a paste longer than the limit is cut, not rejected', () => {
    const long = `Water, ${'x'.repeat(MAX_PASTE_CHARS)}, Sucralose`;
    assert.equal(toIngredientText(long).length, MAX_PASTE_CHARS);
    assert.equal(verdict(long).verdict, 'CLEAN'); // The sucralose past the limit is not read; the textarea has the same limit.
  });

  test('nothing pasted gives no verdict', () => {
    for (const blank of ['', '   ', '\n\n', '\u200B']) assert.deepEqual(scanText(blank), { kind: 'empty' });
  });

  test('text with no known ingredient gives no verdict instead of CLEAN', () => {
    assert.deepEqual(scanText('hello'), { kind: 'unrecognised' });
    assert.deepEqual(scanText('This is a sentence, with commas, about nothing'), { kind: 'unrecognised' });
    // One known ingredient is enough to be read as a list.
    assert.equal(verdict('Almonds').verdict, 'CLEAN');
  });
});

describe('the grams box', () => {
  test('reads a plain number of grams', () => {
    assert.equal(parseGrams('6'), 6);
    assert.equal(parseGrams(' 2.5 '), 2.5);
    assert.equal(parseGrams('2,5'), 2.5);
    assert.equal(parseGrams('0'), 0);
    assert.equal(parseGrams('7g'), 7);
    assert.equal(parseGrams('7 grams'), 7);
  });

  test('empty or not a number means "not given", never 0', () => {
    for (const v of ['', '  ', 'abc', '-3', '1e3', '4 to 6', null, undefined]) assert.equal(parseGrams(v), null);
  });

  test('grams are passed to the rules as a per-serving figure', () => {
    assert.deepEqual(
      { g: labelFromText('Sugar', 3).added_sugars_g, basis: labelFromText('Sugar', 3).quantity_basis },
      { g: 3, basis: 'per_serving' },
    );
    assert.deepEqual(
      { g: labelFromText('Sugar', null).added_sugars_g, basis: labelFromText('Sugar', null).quantity_basis },
      { g: null, basis: 'unknown' },
    );
  });

  test('the same list is graded by its grams', () => {
    const list = 'Oats, Honey, Salt';
    assert.deepEqual([verdict(list).verdict, verdict(list).ruleId], ['BAD', 'X2-added-sugar-no-grams']);
    assert.deepEqual([verdict(list, 3).verdict, verdict(list, 3).ruleId], ['OKAY', 'O1-added-sugar-up-to-4g']);
    assert.deepEqual([verdict(list, 9).verdict, verdict(list, 9).ruleId], ['BAD', 'X1-added-sugar-over-4g']);
    assert.match(verdict(list).notes.join(' '), /No grams were entered/);
    assert.deepEqual(verdict(list, 9).notes, []);
  });
});

describe('the widget shows what the rules decided', () => {
  const pastes: [string, number | null][] = [
    ['Water, Cane Sugar, Natural Flavors', null],
    ['Water, Cane Sugar, Natural Flavors', 2],
    ['Carbonated Water, Erythritol, Stevia Leaf Extract', 0],
    ['Filtered Water, Apple Juice Concentrate, Vitamin C', null],
    ['Milk, Cream, Xylofructose Blend', null],
    ['Peanuts, Salt', null],
    ['Water, Zorblax, Quuxine, Salt', null],
  ];

  test('verdict, rule and explanation are the scanner rules\' own for the same label', () => {
    for (const [text, grams] of pastes) {
      const r = verdict(text, grams);
      const ev = evaluate(labelFromText(text, grams));
      assert.deepEqual([r.verdict, r.ruleId, r.why], [ev.verdict, ev.ruleId, ev.explanation], text);
      const d = decide(labelFromText(text, grams));
      assert.equal(d.status === 'decided' && d.result.verdict, r.verdict, text);
    }
  });

  test('each matched ingredient carries its class, and the one that decided is marked', () => {
    const r = verdict('Cultured Nonfat Milk, Cane Sugar, Maltodextrin, Erythritol, Stevia Leaf Extract, Sucralose, Allulose, Water', 2);
    assert.deepEqual(tagged(r), {
      'Cultured Nonfat Milk': 'Natural sugar',
      'Cane Sugar': 'Added sugar',
      Maltodextrin: 'Not sugar',
      Erythritol: 'Sugar alcohol',
      'Stevia Leaf Extract': 'Plant sweetener',
      Sucralose: 'Artificial sweetener',
      Allulose: 'Rare sugar',
    });
    assert.equal(r.ruleId, 'X3-artificial-sweetener');
    assert.deepEqual(deciders(r), ['Sucralose']);
  });

  test('every printed occurrence is listed, with the compound it sits in', () => {
    const r = verdict('Oats, Sugar, Chocolate Chips (Sugar, Cocoa Butter), Organic Sugar', 8);
    assert.deepEqual(
      r.items.map((i) => [i.name, i.within, i.decided]),
      [['Oats', undefined, false], ['Sugar', undefined, true], ['Sugar', 'Chocolate Chips', true], ['Cocoa Butter', 'Chocolate Chips', false], ['Organic Sugar', undefined, true]],
    );
  });

  test('ingredients the registry does not know are marked, and a sweet-sounding one says so', () => {
    const r = verdict('Water, Zorblax, Yacon Syrup Blend');
    assert.deepEqual(tagged(r), { Zorblax: 'Not in registry', 'Yacon Syrup Blend': 'May sweeten' });
    assert.equal(r.ruleId, 'O4-unknown-sweetener');
  });

  test('juice concentrate is tagged the way the rules filed it', () => {
    assert.equal(tagged(verdict('Water, Apple Juice Concentrate, Oats'))['Apple Juice Concentrate'], 'Added sugar');
    assert.equal(tagged(verdict('Water, Apple Juice Concentrate, Vitamin C'))['Apple Juice Concentrate'], 'Natural sugar');
  });
});

describe('the sample labels', () => {
  test('cover all three verdicts, each decided by the rule the label is there to show', () => {
    const got = Object.fromEntries(SAMPLES.map((s) => [s.id, verdict(s.ingredients, s.addedSugarsG).ruleId]));
    assert.deepEqual(got, {
      yogurt: 'X1-added-sugar-over-4g',
      hydration: 'O3-plant-sweetener',
      'granola-bar': 'X1-added-sugar-over-4g',
      'peanut-butter': 'C1-clean',
    });
    assert.deepEqual(SAMPLES.map((s) => verdict(s.ingredients, s.addedSugarsG).verdict), ['BAD', 'OKAY', 'BAD', 'CLEAN']);
  });

  test('every sample ingredient is in the registry, and the rules raise no warning', () => {
    for (const s of SAMPLES) {
      const r = verdict(s.ingredients, s.addedSugarsG);
      assert.deepEqual(r.items.filter((i) => i.unknown).map((i) => i.name), [], s.id);
      assert.deepEqual(r.notes, [], s.id);
    }
  });

  test('there are at most four (the no-JavaScript styles show one panel per sample, up to four)', () => {
    assert.ok(SAMPLES.length >= 3 && SAMPLES.length <= 4);
    assert.equal(new Set(SAMPLES.map((s) => s.id)).size, SAMPLES.length);
  });
});

describe('the result panel markup', () => {
  test('shows the verdict word, the reason, the rule and each class tag', () => {
    const html = renderResult(scanText('Water, Sucralose'), 'Your list');
    assert.match(html, /data-verdict="BAD"/);
    assert.match(html, /<span class="sr-only">Verdict: <\/span>BAD/);
    assert.match(html, /Contains an artificial sweetener: Sucralose\./);
    assert.match(html, /<li class="hit ugly"><span class="name">Sucralose<\/span> <span class="tag">Artificial sweetener<\/span><\/li>/);
    assert.match(html, /rule X3-artificial-sweetener · rules-v3 · registry-/);
    assert.match(html, /added sugar grams not given/);
  });

  test('uses the amber tone for OKAY and the green tone for CLEAN', () => {
    assert.match(renderResult(scanText('Water, Stevia'), 'Your list'), /tone-bad" data-verdict="OKAY"/);
    assert.match(renderResult(scanText('Peanuts, Salt', 0), 'Your list'), /tone-clean" data-verdict="CLEAN"/);
    assert.match(renderResult(scanText('Peanuts, Salt', 0), 'Your list'), /0 g added sugars per serving/);
  });

  test('pasted markup is shown as text, never as HTML', () => {
    const html = renderResult(scanText('Water, <img src=x onerror=boom>, "Sugar" & <u>Salt</u>'), '<i>Your list</i>');
    assert.doesNotMatch(html, /<img|<u>|<i>/);
    assert.match(html, /&lt;img src=x onerror=boom&gt;/);
    assert.match(html, /&quot;Sugar&quot; &amp; &lt;u&gt;Salt&lt;\/u&gt;/);
    assert.match(html, /&lt;i&gt;Your list&lt;\/i&gt;/);
  });

  test('says there is no verdict when there is none', () => {
    assert.match(renderResult(scanText(''), 'Your list'), /No verdict.*Paste an ingredient list first\./);
    assert.match(renderResult(scanText('lorem ipsum'), 'Your list'), /No verdict.*None of that matches an ingredient the rules know/);
    assert.doesNotMatch(renderResult(scanText('lorem ipsum'), 'Your list'), /data-verdict/);
  });
});
