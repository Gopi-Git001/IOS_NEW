// Post-build checks on dist/: every page has a unique title, description and canonical; JSON-LD parses;
// main content is present in the HTML (no JS needed); internal links resolve; robots and sitemap exist.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const pages = walk(dist).filter((f) => f.endsWith('.html'));
const errors = [];
const seen = { title: new Map(), desc: new Map() };

for (const file of pages) {
  const rel = file.slice(dist.length - 1);
  const html = readFileSync(file, 'utf8');
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  const is404 = rel === '/404.html';
  if (!title) errors.push(`${rel}: missing <title>`);
  if (!desc) errors.push(`${rel}: missing meta description`);
  if (!is404 && !/<link rel="canonical" href="https:\/\/[^"]+"/.test(html)) errors.push(`${rel}: missing canonical`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) errors.push(`${rel}: expected exactly one <h1>`);
  for (const [k, v] of [['title', title], ['desc', desc]]) {
    if (!v) continue;
    if (seen[k].has(v)) errors.push(`${rel}: duplicate ${k} with ${seen[k].get(v)}`);
    seen[k].set(v, rel);
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { errors.push(`${rel}: invalid JSON-LD (${e.message})`); }
  }
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const p = m[1];
    if (p.startsWith('//')) continue;
    const ok = [join(dist, p), join(dist, p, 'index.html')].some((t) => existsSync(t) && (statSync(t).isFile()));
    if (!ok) errors.push(`${rel}: broken internal link ${p}`);
    if (p.length > 1 && p.endsWith('/')) errors.push(`${rel}: internal link with trailing slash ${p} (site uses no trailing slashes)`);
  }
  if (/<script(?![^>]*(?:application\/ld\+json|data-motion))[^>]*>/.test(html)) errors.push(`${rel}: ships a non-JSON-LD <script> (only the data-motion reduced-motion helper is allowed)`);
}
for (const f of ['robots.txt', 'sitemap-index.xml', 'og/default.png', 'favicon.svg', 'how-it-works/index.html', 'privacy/index.html', 'terms/index.html']) if (!existsSync(join(dist, f))) errors.push(`missing ${f}`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`check: ${pages.length} pages OK`);
