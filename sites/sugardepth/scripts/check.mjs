// Post-build checks on dist/: every page has a unique title, description and canonical; JSON-LD parses;
// main content is present in the HTML (no JS needed); internal links resolve; robots and sitemap exist.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const pages = walk(dist).filter((f) => f.endsWith('.html'));
const errors = [];
const seen = { title: new Map(), desc: new Map() };
// The only pages that carry the crystal swarm canvas and its script.
const SWARM_PAGES = ['/index.html', '/how-it-works/index.html', '/about/index.html'];

for (const file of pages) {
  const rel = `/${file.slice(dist.length).split(sep).join('/')}`;
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
  // One exact Google tag is allowed. replace() drops a single copy; a second copy or any other script still fails.
  const allowedGtm = [
    '<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-K8262PBN"></script>',
    "<script> window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date());</script>",
  ];
  let scripts = html;
  for (const tag of allowedGtm) scripts = scripts.replace(tag, '');
  // The home page may load one bundled module: the "try it" widget (components/TryIt.astro).
  if (rel === '/index.html') scripts = scripts.replace(/<script type="module" src="\/_astro\/TryIt\.[^"]+\.js"><\/script>/, '');
  // Three pages may load one more bundled module: the crystal swarm (components/CrystalSwarm.astro, lib/swarm.ts).
  // replace() drops a single copy, and only on these pages; the file itself is checked below.
  if (SWARM_PAGES.includes(rel)) scripts = scripts.replace(/<script type="module" src="\/_astro\/CrystalSwarm\.[^"]+\.js"><\/script>/, '');
  if (/<script(?![^>]*(?:application\/ld\+json|data-motion))[^>]*>/.test(scripts)) errors.push(`${rel}: ships a non-JSON-LD <script> (only the data-motion helper, the two approved Google tag scripts, the home page's try-it module and the crystal swarm module on the home page, /how-it-works and /about are allowed)`);
}
{
  // The swarm is a self-contained canvas script: it must not import another chunk or reach the network.
  for (const f of readdirSync(join(dist, '_astro')).filter((n) => /^CrystalSwarm\..+\.js$/.test(n))) {
    const js = readFileSync(join(dist, '_astro', f), 'utf8');
    if (/\bimport\s*[("'{*]|\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|https?:\/\//.test(js)) errors.push(`/_astro/${f}: the crystal swarm module must not import other modules or make network requests`);
  }
  // The alias tiles must read without the script: every name and its answer are in the home page's HTML.
  const home = readFileSync(join(dist, 'index.html'), 'utf8');
  const tiles = (home.match(/<button class="tile" type="button" aria-pressed="false"><span class="tile-face tile-front"><span class="tile-alias">[^<]+<\/span><\/span><span class="tile-face tile-back"><span class="tile-tag">Added sugar<\/span><span class="tile-reveal">That's sugar\.<\/span><\/span><\/button>/g) || []).length;
  if (tiles === 0) errors.push(`/index.html: expected the alias tiles (name and "That's sugar.") in the static HTML, found ${tiles}`);
  // Every swarm canvas is decoration.
  for (const rel of SWARM_PAGES) {
    const html = readFileSync(join(dist, rel), 'utf8');
    for (const m of html.matchAll(/<canvas\b[^>]*>/g)) if (!/aria-hidden="true"/.test(m[0])) errors.push(`${rel}: a <canvas> without aria-hidden="true"`);
  }
}
{
  // The try-it widget must be useful before its script runs: the sample verdicts are in the HTML.
  const home = readFileSync(join(dist, 'index.html'), 'utf8');
  const panels = (home.match(/class="sheet facts tryit-facts tone-[a-z]+" data-verdict="(?:CLEAN|OKAY|BAD)"/g) || []).length;
  if (panels === 0) errors.push(`/index.html: expected the try-it sample verdicts in the static HTML, found ${panels}`);
}
for (const f of ['robots.txt', 'sitemap-index.xml', 'og/default.png', 'favicon.svg', 'how-it-works/index.html', 'privacy/index.html', 'terms/index.html']) if (!existsSync(join(dist, f))) errors.push(`missing ${f}`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`check: ${pages.length} pages OK`);
