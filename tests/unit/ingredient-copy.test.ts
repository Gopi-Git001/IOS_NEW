// The short copy on the ingredient pages is written by the site's read layer (sites/sugardepth/src/data/ingredients.ts)
// from the generated page data. These tests keep it short, self-contained and in step with the rules.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { MAX_OKAY_ADDED_G } from '../../supabase/functions/_shared/policy.ts';
import { answerFor, GROUPS, isPlural, PAGES, shortWhen, tagFor } from '../../sites/sugardepth/src/data/ingredients.ts';
import { ADDED_SUGARS } from '../../sites/sugardepth/src/data/sugars.ts';

const site = join(dirname(fileURLToPath(import.meta.url)), '../../sites/sugardepth');
const words = (s: string) => s.trim().split(/\s+/).length;
// The same limits src/data/guides.ts enforces at build time (it imports astro:content, so it can't be loaded here).
const MAX_ANSWER_CHARS = 155;
const MAX_TAG_WORDS = 6;

describe('ingredient page answers', () => {
  test('every page gets one self-contained sentence that names the ingredient and Sugar Depth', () => {
    for (const p of PAGES) {
      const a = answerFor(p);
      assert.ok(a.length <= MAX_ANSWER_CHARS, `${p.slug}: ${a.length} characters`);
      assert.ok(words(a) <= 27, `${p.slug}: ${words(a)} words`);
      assert.match(a, /^[A-Z].*\.$/, p.slug);
      assert.equal((a.match(/\. /g) ?? []).length, 0, `${p.slug}: one sentence`);
      assert.ok(a.startsWith(p.name) || p.id === 'lactose_added', `${p.slug}: starts with the name`);
      assert.match(a, /Sugar Depth|added sugar when/, p.slug);
      assert.doesNotMatch(a, /\u2014|\u2013/, `${p.slug}: no dashes`);
    }
  });

  test('answers are unique, because they are also the meta descriptions', () => {
    const all = PAGES.map(answerFor);
    assert.equal(new Set(all).size, all.length);
  });

  test('the verdict named in the answer is one the page can get', () => {
    for (const p of PAGES) {
      const a = answerFor(p);
      const named = ['BAD', 'OKAY', 'CLEAN'].filter((v) => new RegExp(`\\b${v}\\b`).test(a));
      const possible = new Set(p.outcomes.map((o) => o.verdict));
      for (const v of named) assert.ok(possible.has(v), `${p.slug}: says ${v}, outcomes are ${[...possible].join(', ')}`);
      if (p.group === 'added_sugar' && named.length) assert.ok(a.includes(`above ${MAX_OKAY_ADDED_G} g of added sugar per serving`) && a.includes(`${MAX_OKAY_ADDED_G} g or less`), p.slug);
    }
  });

  test('plural names take plural verbs', () => {
    assert.equal(isPlural('Flavors'), true);
    assert.equal(isPlural('Isomaltooligosaccharides (IMO)'), true);
    assert.equal(isPlural('Corn syrup'), false);
    assert.equal(isPlural('Acesulfame K'), false);
    for (const p of PAGES) assert.match(answerFor(p), isPlural(p.name) ? / (are|have) / : / (is|has|makes) /, p.slug);
  });
});

describe('index cards', () => {
  test(`a card tag is at most ${MAX_TAG_WORDS} words`, () => {
    for (const p of PAGES) {
      const t = tagFor(p);
      assert.ok(t.length > 0 && words(t) <= MAX_TAG_WORDS, `${p.slug}: "${t}"`);
      assert.doesNotMatch(t, /\.$/, p.slug);
    }
  });

  test('group blurbs are one short line', () => {
    for (const g of GROUPS) assert.ok(words(g.blurb) <= 24 && (g.blurb.match(/\. /g) ?? []).length <= 1, g.id);
  });

  test('hidden-name group blurbs are at most six words', () => {
    for (const g of ADDED_SUGARS) if (g.blurb) assert.ok(words(g.blurb) <= 6, `${g.page.slug}: "${g.blurb}"`);
  });
});

describe('rule rows', () => {
  test('only the lead-in is dropped from a rule condition', () => {
    assert.equal(shortWhen('It is listed, and the panel shows more than 4 g of added sugar per serving'), 'More than 4 g of added sugar per serving');
    assert.equal(shortWhen('Some wording nobody has seen yet'), 'Some wording nobody has seen yet');
    for (const p of PAGES) {
      for (const o of p.outcomes) {
        const s = shortWhen(o.when);
        assert.ok(s.length > 0 && s.length <= o.when.length, `${p.slug} ${o.rule}`);
        // Every number in the generated condition survives.
        assert.deepEqual(s.match(/[\d.]+/g) ?? [], o.when.match(/[\d.]+/g) ?? [], `${p.slug} ${o.rule}`);
      }
    }
  });
});

describe('hand-written guides stay short', () => {
  const dir = join(site, 'src/content/ingredients');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.mdx'))) {
    test(file, () => {
      const [, front, body] = readFileSync(join(dir, file), 'utf8').split(/^---$/m);
      const field = (k: string) => JSON.parse(new RegExp(`^${k}: (".*")$`, 'm').exec(front)![1]) as string;
      assert.ok(field('description').length <= MAX_ANSWER_CHARS, 'description is the one-sentence answer');
      assert.ok(words(field('summary')) <= MAX_TAG_WORDS, 'summary is the card tag');
      const text = body.replace(/\{\/\*.*?\*\/\}/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*#]|^- /gm, '');
      assert.ok(words(text) <= 100, `body is ${words(text)} words`);
      assert.doesNotMatch(body, /\u2014/, 'no em dashes');
    });
  }
});
