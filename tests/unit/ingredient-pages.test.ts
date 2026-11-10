// The marketing site's /ingredients/<slug> pages are generated from the ingredient registry and policy.ts
// (sites/sugardepth/scripts/ingredient-pages.ts). These tests keep the committed page data, the URLs and the
// hand-written guides in step with the rules. Pure: no network.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { juiceEntries, REGISTRY, REGISTRY_VERSION } from '../../supabase/functions/_shared/ingredients.ts';
import { MAX_OKAY_ADDED_G, POLICY_VERSION } from '../../supabase/functions/_shared/policy.ts';
import { allEntries, buildIngredientData, inline, MAX_DESCRIPTION, publicNote, serialize, slugFor, slugify } from '../../sites/sugardepth/scripts/ingredient-pages.ts';

const site = join(dirname(fileURLToPath(import.meta.url)), '../../sites/sugardepth');
const data = buildIngredientData();
const bySlug = (slug: string) => {
  const p = data.pages.find((x) => x.slug === slug);
  assert.ok(p, `no page with slug ${slug}`);
  return p;
};
const rules = (slug: string) => bySlug(slug).outcomes.map((o) => `${o.verdict} ${o.rule}`);

const RULE_IDS = ['R1', 'R2', 'R3', 'R4', 'X1', 'X2', 'X3', 'X4', 'O1', 'O2', 'O3', 'O4', 'O5', 'C1'];

// Front matter of the hand-written guides, read without Astro. Only the flat keys these tests need.
const guideDir = join(site, 'src/content/ingredients');
const guides = readdirSync(guideDir).filter((f) => f.endsWith('.mdx')).map((file) => {
  const raw = readFileSync(join(guideDir, file), 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  assert.ok(m, `${file}: no front matter`);
  const field = (key: string) => new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(m[1])?.[1].trim().replace(/^(['"])(.*)\1$/, '$2');
  const list = (key: string) => {
    const v = new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`, 'm').exec(m[1])?.[1];
    return v ? v.split(',').map((s) => s.trim().replace(/^(['"])(.*)\1$/, '$2')).filter(Boolean) : [];
  };
  return { file, slug: file.replace(/\.mdx$/, ''), front: m[1], body: m[2], raw, field, list };
});

describe('ingredient page data', () => {
  test('the committed JSON is what the registry and rules generate today', () => {
    const committed = readFileSync(join(site, 'src/data/ingredients.generated.json'), 'utf8');
    assert.equal(committed, serialize(data), 'ingredients.generated.json is out of date. Run: npm run ingredients');
  });

  test('carries the versions and limits of the rules it was built from', () => {
    assert.equal(data.policyVersion, POLICY_VERSION);
    assert.equal(data.registryVersion, REGISTRY_VERSION);
    assert.equal(data.maxOkayAddedG, MAX_OKAY_ADDED_G);
  });

  test('every registry entry, and both juice entries matched by grammar, has a page', () => {
    assert.equal(allEntries().length, REGISTRY.length + 2);
    assert.deepEqual(data.pages.map((p) => p.id), [...REGISTRY, juiceEntries.reconstituted, juiceEntries.single].map((e) => e.id));
    for (const e of allEntries()) assert.equal(data.pages.find((p) => p.id === e.id)?.slug, slugFor(e));
  });

  test('slugs are unique, URL-safe and keep the URLs that were already live', () => {
    const slugs = data.pages.map((p) => p.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const s of slugs) assert.match(s, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const live of ['acesulfame-k', 'allulose', 'aspartame', 'erythritol', 'juice-concentrate', 'maltodextrin', 'monk-fruit', 'stevia', 'sucralose', 'xylitol']) {
      assert.ok(slugs.includes(live), `${live} was a live URL and must stay`);
    }
    assert.equal(slugify('Rice syrup'), 'rice-syrup');
    assert.equal(slugify('Thickeners & emulsifiers'), 'thickeners-emulsifiers');
  });

  test('every registry alias is printed on exactly one page', () => {
    const where = new Map<string, string[]>();
    for (const p of data.pages) for (const a of p.aliases) where.set(a, [...(where.get(a) ?? []), p.slug]);
    for (const e of allEntries()) for (const a of e.aliases) assert.deepEqual(where.get(a), [slugFor(e)], `alias "${a}"`);
    assert.deepEqual(where.get('brown rice syrup'), ['rice-syrup']);
    assert.deepEqual(where.get('evaporated cane juice'), ['sugar']);
    assert.deepEqual(where.get('dextrose'), ['dextrose']);
  });

  test('the added-sugar name count is the number of aliases treated as added sugar', () => {
    const n = REGISTRY.filter((e) => e.treatment === 'added_sugar').reduce((sum, e) => sum + e.aliases.length, 0);
    assert.equal(data.addedSugarAliasCount, n);
    assert.ok(n > 100);
  });

  test('outcomes are the verdicts and rule ids policy.ts gives', () => {
    const sugar = ['BAD X1-added-sugar-over-4g', 'BAD X2-added-sugar-no-grams', 'OKAY O1-added-sugar-up-to-4g'];
    assert.deepEqual(rules('sugar'), sugar);
    assert.deepEqual(rules('rice-syrup'), sugar);
    assert.deepEqual(rules('sucralose'), ['BAD X3-artificial-sweetener']);
    assert.deepEqual(rules('erythritol'), ['OKAY O2-sugar-alcohol']);
    assert.deepEqual(rules('allulose'), ['OKAY O2-sugar-alcohol']);
    assert.deepEqual(rules('stevia'), ['OKAY O3-plant-sweetener']);
    assert.deepEqual(rules('water'), ['CLEAN C1-clean']);
    assert.deepEqual(rules('maltodextrin'), ['CLEAN C1-clean']);
    assert.deepEqual(rules('alcohol'), ['BAD X4-alcohol', 'CLEAN C1-clean']);
    // A concentrate is added sugar when it sweetens another food, and plain juice when it is the whole product.
    for (const slug of ['juice-concentrate', 'juice-from-concentrate', 'fruit-puree-concentrate']) assert.deepEqual(rules(slug), [...sugar, 'CLEAN C1-clean'], slug);
  });

  test('the headline verdict agrees with the outcomes', () => {
    for (const p of data.pages) {
      const verdicts = new Set(p.outcomes.map((o) => o.verdict));
      assert.ok(p.outcomes.length > 0, p.id);
      for (const o of p.outcomes) assert.ok(RULE_IDS.includes(o.rule.split('-')[0]), `${p.id}: ${o.rule}`);
      if (p.verdict.tone === 'mixed') assert.ok(verdicts.size > 1, `${p.id} is shown as mixed but has one outcome`);
      else if (p.cls === 'drinking_alcohol') assert.deepEqual([p.verdict.word, p.outcomes[0].verdict], ['BAD', 'BAD']);
      else assert.deepEqual([...verdicts], [p.verdict.word], p.id);
    }
  });

  test('groups follow the registry treatment', () => {
    for (const p of data.pages) {
      if (p.treatment === 'added_sugar' || p.treatment === 'bad' || p.treatment === 'okay') assert.equal(p.group, p.treatment);
      if (p.treatment === 'needs_context') assert.equal(p.group, 'depends');
      if (p.treatment === 'clean_ok') assert.match(p.group, /^clean_/);
      for (const r of p.related) assert.equal(bySlug(r).group, p.group);
      assert.ok(!p.related.includes(p.slug));
    }
  });

  test('notes are the registry notes, without developer wording', () => {
    for (const e of allEntries()) {
      const p = data.pages.find((x) => x.id === e.id)!;
      assert.equal(p.note, publicNote(e.note));
      if (p.note) assert.doesNotMatch(p.note, /policy\.ts|open items|QuickGOB|\.ts\b/i, e.id);
    }
    assert.equal(publicNote(undefined), undefined);
    assert.equal(publicNote('Plain note.'), 'Plain note.');
  });

  test('titles, descriptions and summaries are present and unique where they must be', () => {
    const titles = data.pages.map((p) => p.title);
    const descriptions = data.pages.map((p) => p.description);
    assert.equal(new Set(titles).size, titles.length);
    assert.equal(new Set(descriptions).size, descriptions.length);
    for (const p of data.pages) {
      assert.ok(p.title.includes(p.name), p.id);
      assert.ok(p.description.startsWith(`${p.name} on food labels: `), p.id);
      assert.ok(p.description.length <= MAX_DESCRIPTION + 10, `${p.id}: description is ${p.description.length} characters`);
      assert.ok(p.summary.length > 20, p.id);
      assert.doesNotMatch(`${p.title} ${p.description} ${p.summary}`, /UGLY|undefined|null/, p.id);
    }
  });

  test('every source key exists on the site', () => {
    const sources = readFileSync(join(site, 'src/data/sources.ts'), 'utf8');
    for (const p of data.pages) {
      assert.ok(p.sources.includes('addedSugarsRule'), p.id);
      for (const k of p.sources) assert.match(sources, new RegExp(`^\\s+${k}: \\{`, 'm'), `${p.id}: source ${k}`);
    }
  });

  test('codes are printed as E numbers and names read right mid-sentence', () => {
    for (const p of data.pages) for (const c of p.codes) assert.match(c, /^(E|INS )\d+[a-z]?$/i, `${p.id}: ${c}`);
    assert.ok(bySlug('sucralose').codes.includes('E955'));
    assert.equal(inline('Rice syrup'), 'rice syrup');
    assert.equal(inline('HFCS'), 'HFCS');
    assert.equal(inline('Acesulfame K'), 'acesulfame K');
  });
});

describe('hand-written ingredient guides', () => {
  test('each guide points at a registry entry', () => {
    assert.equal(guides.length, 11);
    for (const g of guides) {
      const id = g.field('entry');
      const page = data.pages.find((p) => p.id === id);
      assert.ok(page, `${g.file}: entry "${id}" is not in the registry`);
      // Same file name as the entry's slug: the guide is that entry's page. Otherwise it is about one alias.
      if (g.slug !== page.slug) {
        assert.ok(!data.pages.some((p) => p.slug === g.slug), `${g.file} collides with a registry page`);
        const aliases = g.list('aliases');
        assert.ok(aliases.length > 0, `${g.file}: an alias guide lists its aliases`);
        for (const a of aliases) assert.ok(page.aliases.includes(a.toLowerCase()), `${g.file}: "${a}" is not an alias of ${page.id}`);
      }
    }
    assert.equal(guides.find((g) => g.slug === 'evaporated-cane-juice')?.field('entry'), 'sugar');
  });

  // "rule O2", "rules X1 and X2": every rule id a guide names.
  const named = (text: string) => [...text.matchAll(/\brules?\s+([A-Z]\d)(?:\s+and\s+([A-Z]\d))?/g)].flatMap((m) => [m[1], m[2]].filter(Boolean));

  test('no guide states a rules-v2 verdict or rule id', () => {
    for (const g of guides) {
      assert.doesNotMatch(g.raw, /\bUGLY\b/, `${g.file} still says UGLY`);
      assert.doesNotMatch(g.raw, /rules-v2/, g.file);
      for (const id of named(g.raw)) assert.ok(RULE_IDS.includes(id), `${g.file}: rule ${id} is not a rules-v3 rule`);
    }
  });

  test('a guide that names rules names the ones its own entry gets', () => {
    for (const g of guides) {
      const page = data.pages.find((p) => p.id === g.field('entry'))!;
      const ids = named(g.raw);
      assert.ok(ids.length > 0, `${g.file} names no rule`);
      // A guide may also mention a neighbour's rule (stevia blended with erythritol), so only its own must be there.
      const own = page.outcomes.filter((o) => o.verdict !== 'CLEAN' || page.outcomes.length === 1).map((o) => o.rule.split('-')[0]);
      for (const id of own) assert.ok(ids.includes(id), `${g.file} should name rule ${id}, which ${page.id} gets`);
    }
  });
});
