// The marketing site's rule table (sites/sugardepth/src/data/rules.ts) is written in plain words by hand.
// These tests keep its ids, order, outcomes and numbers in step with policy.ts, and keep the verdict names of
// earlier rule versions out of the site's source. Pure: no network.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { REGISTRY } from '../../supabase/functions/_shared/ingredients.ts';
import { MAX_NON_ALCOHOLIC_ABV, MAX_OKAY_ADDED_G, MAX_UNKNOWN_FOR_CLEAN, POLICY_VERSION } from '../../supabase/functions/_shared/policy.ts';
import { buildIngredientData } from '../../sites/sugardepth/scripts/ingredient-pages.ts';
import { RULES, ruleHref, TREATMENT_ROWS } from '../../sites/sugardepth/src/data/rules.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const site = join(root, 'sites/sugardepth');
const data = buildIngredientData();
// Conditions keep a number and its unit on one line with a no-break space; compare them as plain spaces.
const rule = (id: string) => {
  const r = RULES.find((x) => x.id === id);
  assert.ok(r, `no rule ${id} in the site's rule table`);
  return { ...r, condition: r.condition.replace(/\u00a0/g, ' ') };
};

// Every rule policy.ts can return, in the order evaluate() checks them, with its verdict.
const policySource = readFileSync(join(root, 'supabase/functions/_shared/policy.ts'), 'utf8');
const policyRules = [...policySource.matchAll(/\b(?:retry\(|decided\('(CLEAN|OKAY|BAD)',\s*)'([A-Z]\d+-[a-z0-9-]+)'/g)]
  .map((m) => ({ key: m[2], outcome: m[1] ?? 'RETAKE' }));

describe("the site's rule table", () => {
  test('policy.ts still names its rules the way this test reads them', () => {
    assert.ok(policyRules.length >= 10, `only found ${policyRules.length} rules in policy.ts`);
    assert.equal(new Set(policyRules.map((r) => r.key)).size, policyRules.length, 'a rule id is returned from two places in policy.ts');
    assert.equal(POLICY_VERSION, 'rules-v3', 'the rules version changed: review sites/sugardepth/src/data/rules.ts and the prose on /how-it-works, /faq and the home page, then update this line');
  });

  test('lists every rule in policy.ts, in the order they are checked, with the same verdict', () => {
    assert.deepEqual(RULES.map((r) => ({ key: r.policyId, outcome: r.outcome })), policyRules);
  });

  test('short ids are the start of the policy id and are unique', () => {
    for (const r of RULES) assert.equal(r.policyId.split('-')[0], r.id);
    assert.equal(new Set(RULES.map((r) => r.id)).size, RULES.length);
  });

  test('a decided rule shows its verdict; a retake rule shows no verdict word', () => {
    for (const r of RULES) {
      if (r.outcome === 'RETAKE') assert.doesNotMatch(r.result, /CLEAN|OKAY|BAD/);
      else assert.equal(r.result, r.outcome);
    }
  });

  test('the numbers in the conditions are the limits in policy.ts', () => {
    assert.ok(rule('X1').condition.includes(`more than ${MAX_OKAY_ADDED_G} g`));
    assert.ok(rule('O1').condition.includes(`${MAX_OKAY_ADDED_G} g or less`));
    assert.ok(rule('X4').condition.includes(`more than ${MAX_NON_ALCOHOLIC_ABV}% ABV`));
    assert.equal(MAX_UNKNOWN_FOR_CLEAN, 2, 'O5 says "Two or more": update its condition and this line');
    assert.ok(rule('O5').condition.startsWith('Two or more'));
  });

  test('X3, O2 and O3 name every registry entry that fires them, and nothing else from those classes', () => {
    const sweeteners = data.pages.filter((p) => ['non_sugar_sweetener', 'sugar_alcohol', 'rare_sugar'].includes(p.cls));
    for (const id of ['X3', 'O2', 'O3']) {
      const { policyId: key, condition } = rule(id);
      const firing = sweeteners.filter((p) => p.outcomes.some((o) => o.rule === key));
      assert.ok(firing.length > 0, `no registry entry fires ${key}`);
      for (const p of sweeteners) {
        const named = condition.toLowerCase().includes(p.name.toLowerCase());
        assert.equal(named, firing.includes(p), `${id} ${named ? 'names' : 'does not name'} ${p.name}`);
      }
    }
  });

  test('every rule id on an ingredient page links to its row in the table', () => {
    for (const p of data.pages) {
      for (const o of p.outcomes) assert.equal(ruleHref(o.rule), `/how-it-works#rule-${o.rule.split('-')[0]}`, `${p.slug}: ${o.rule}`);
    }
    assert.equal(ruleHref('Z9-not-a-rule'), undefined);
  });

  test('each row of the identity table is registry entries that share a class, a label treatment and a verdict', () => {
    const ids = new Set([...REGISTRY.map((e) => e.id), ...data.pages.map((p) => p.id)]);
    const seen = new Set<string>();
    for (const row of TREATMENT_ROWS) {
      assert.ok(row.length > 0);
      const pages = row.map((id) => {
        assert.ok(ids.has(id), `"${id}" is not a registry id`);
        assert.ok(!seen.has(id), `"${id}" is in the identity table twice`);
        seen.add(id);
        return data.pages.find((p) => p.id === id)!;
      });
      for (const key of ['classLabel', 'labelingLabel'] as const) {
        assert.equal(new Set(pages.map((p) => p[key])).size, 1, `${row.join(', ')} do not share one ${key}`);
      }
      assert.equal(new Set(pages.map((p) => p.verdict.label)).size, 1, `${row.join(', ')} do not share one verdict`);
    }
  });
});

describe("the site's source", () => {
  // Text the site ships or documents: pages, components, data, guides, scripts and the README.
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return name === 'node_modules' || name === 'dist' || name === '.astro' ? [] : walk(path);
      return /\.(astro|ts|mjs|mdx|md|json)$/.test(name) ? [path] : [];
    });
  const files = [...walk(join(site, 'src')), ...walk(join(site, 'scripts')), join(site, 'README.md')];
  // Verdict names and claims from rules-v2.1. Lower-case "ugly" is left alone: it is still the name of the red
  // colour class and token (brand/tokens.json) and of older media files.
  const stale: [RegExp, string][] = [
    [/\bUGLY\b/, 'the old verdict name UGLY (now BAD)'],
    [/\bUgly\b/, 'the old verdict name Ugly (now BAD)'],
    [/rules-v[0-2]\b/, 'an older rules version'],
    [/gram cut-?off/i, '"no gram cutoff" (rules-v3 draws a line at the added-sugar grams per serving)'],
    [/\bin any amount\b/i, '"in any amount" (rules-v3 counts added-sugar grams per serving)'],
  ];

  test('reads enough of the site to mean something', () => {
    assert.ok(files.length > 40, `only ${files.length} files`);
    for (const page of ['src/pages/index.astro', 'src/pages/how-it-works.astro', 'src/pages/faq.astro', 'src/components/CrystalVerdict.astro']) {
      assert.ok(files.includes(join(site, page)), `${page} was not read`);
    }
  });

  test('does not use the verdict names or claims of earlier rule versions', () => {
    const hits: string[] = [];
    for (const file of files) {
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        for (const [re, what] of stale) if (re.test(line)) hits.push(`${relative(root, file)}:${i + 1} has ${what}`);
      });
    }
    assert.deepEqual(hits, []);
  });

  test('the versions shown on the site come from the generated registry data, not a typed string', () => {
    const config = readFileSync(join(site, 'src/config.ts'), 'utf8');
    assert.match(config, /export \{ POLICY_VERSION, REGISTRY_VERSION \} from '\.\/data\/ingredients';/);
    assert.doesNotMatch(config, /['"](rules-v|registry-)/);
  });
});
