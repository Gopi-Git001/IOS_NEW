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
    "<script> window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('set', { allow_google_signals: false, allow_ad_personalization_signals: false }); gtag('js', new Date());</script>",
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
  // The alias band must read without the script: every real name links to its guide in the home page's HTML.
  // (Replaced the flip-tile rule, then the static-grid rule: the section now renders a two-row moving band
  // whose looping copies are decoration. Those copies must stay out of the tab order and the a11y tree.)
  // EXPLORE_MARQUEE = false keeps the older 8-card grid reachable, so that documented fallback is checked too.
  const home = readFileSync(join(dist, 'index.html'), 'utf8');
  const registry = JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/ingredients.generated.json', import.meta.url)), 'utf8'));
  const registryPages = registry.pages ?? registry;
  const slugExists = new Set(registryPages.map((p) => p.slug));
  const addedSugarAliases = new Set(
    registryPages.filter((p) => p.treatment === 'added_sugar').flatMap((p) => p.aliases.map((a) => a.toLowerCase())),
  );
  const isMarquee = /data-marquee/.test(home);
  // The real cards: the marquee marks exactly one copy with data-real-card; the grid has no copies.
  const cards = [
    ...home.matchAll(
      isMarquee
        ? /<a class="name-card" href="\/ingredients\/([^"]+)" data-real-card[^>]*><span class="name-card-title"[^>]*>([^<]+)<\/span>/g
        : /<a class="name-card" href="\/ingredients\/([^"]+)"><span class="name-card-title"[^>]*>([^<]+)<\/span>/g,
    ),
  ];
  const expectedCards = isMarquee ? 16 : 8;
  if (cards.length !== expectedCards) {
    errors.push(`/index.html: expected ${expectedCards} alias cards in the static HTML, found ${cards.length}`);
  }
  const names = cards.map(([, , name]) => name.toLowerCase());
  if (new Set(names).size !== names.length) errors.push('/index.html: the alias band repeats a sugar name among its real cards');
  for (const [, slug, name] of cards) {
    if (!slugExists.has(slug)) errors.push(`/index.html: alias card "${name}" links to /ingredients/${slug}, which is not in the ingredient registry`);
    if (!addedSugarAliases.has(name.toLowerCase())) errors.push(`/index.html: alias card "${name}" is not an added-sugar alias in the ingredient registry`);
  }
  if (isMarquee) {
    // The looping copies are decoration: aria-hidden + inert on the <li>, tabindex="-1" on the <a>.
    // They must number exactly as many as the real cards, so a broken loop cannot pass unnoticed.
    const copies = [
      ...home.matchAll(/<li aria-hidden="true" inert[^>]*><a class="name-card" href="\/ingredients\/[^"]+" tabindex="-1"/g),
    ];
    if (copies.length !== cards.length) {
      errors.push(`/index.html: expected ${cards.length} hidden looping copies of the alias cards, found ${copies.length}`);
    }
    // Nothing else in the band may be tabbable: exactly 16 focusable card links, not 32.
    const cardLinks = (home.match(/<a class="name-card"/g) || []).length;
    if (cardLinks !== cards.length * 2) {
      errors.push(`/index.html: expected ${cards.length * 2} alias card links (real + copies), found ${cardLinks}`);
    }
  }
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
for (const f of ['robots.txt', 'llms.txt', 'sitemap-index.xml', 'og/default.png', 'favicon.svg', 'how-it-works/index.html', 'faq/index.html', 'about/index.html', 'privacy/index.html', 'terms/index.html']) if (!existsSync(join(dist, f))) errors.push(`missing ${f}`);
{
  // The short pages keep an answer-sized meta description, and the home page stays three sections with the
  // mission as its one heading.
  for (const rel of ['index.html', 'how-it-works/index.html', 'faq/index.html', 'about/index.html', 'contact/index.html']) {
    const file = join(dist, rel);
    if (!existsSync(file)) continue;
    const desc = readFileSync(file, 'utf8').match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
    if (desc.length > 155) errors.push(`/${rel}: meta description is ${desc.length} characters (155 at most)`);
  }
  const main = readFileSync(join(dist, 'index.html'), 'utf8').match(/<main[\s\S]*<\/main>/)?.[0] ?? '';
  const sections = (main.match(/<section[\s>]/g) || []).length;
  if (sections !== 3) errors.push(`/index.html: expected three sections (mission, how it works, explore), found ${sections}`);
  // llms.txt: starts with the site name, and every link in it is a page this build made.
  const llmsFile = join(dist, 'llms.txt');
  const llms = existsSync(llmsFile) ? readFileSync(llmsFile, 'utf8') : '';
  if (llms && !llms.startsWith('# Sugar Depth\n')) errors.push('/llms.txt: must start with "# Sugar Depth"');
  for (const m of llms.matchAll(/\]\(https:\/\/[^/)]+(\/[^)#?]*)\)/g)) {
    const ok = [join(dist, m[1]), join(dist, m[1], 'index.html')].some((t) => existsSync(t) && statSync(t).isFile());
    if (!ok) errors.push(`/llms.txt: link to a page that was not built: ${m[1]}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`check: ${pages.length} pages OK`);
