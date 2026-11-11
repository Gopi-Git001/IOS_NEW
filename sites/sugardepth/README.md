# Sugar Depth marketing site

Static Astro site for **sugardepth.com**: home, the verdict rules page, ingredient guides, hidden sugar names, about, FAQ, privacy and terms drafts, contact, a 404, and `/llms.txt` for AI answer engines. Every page is plain HTML and CSS with self-hosted fonts (Libre Franklin, Newsreader via `@fontsource`). The only bundled client JavaScript is the home page's "try it" widget and the crystal swarm (home, `/how-it-works`, `/about`); the phone scan bar and the `/how-it-works` expanders use a few lines of inline script each (`<script is:inline data-motion>`). Every page reads and works without JavaScript.

## Run it

Needs Node 22.23.4 or newer (Astro 7).

```bash
cd sites/sugardepth
npm install
npm run dev        # http://localhost:4321
npm run build      # builds dist/ and runs scripts/check.mjs
npm run preview
```

`scripts/check.mjs` fails the build if a page is missing a title, description or canonical, has duplicate titles or descriptions, has more than one `<h1>`, has invalid JSON-LD, links to a missing internal page, or ships a `<script>` other than JSON-LD, the `data-motion` helpers, the approved Google tag scripts, the home page's try-it module and the crystal swarm module (one copy, only on the home page, `/how-it-works` and `/about`). It also fails if the try-it sample verdicts or the alias tiles are missing from the home page's static HTML, if the swarm module imports another chunk or reaches the network, or if a canvas on those pages is not `aria-hidden`. For the short pages it fails if the home page is not exactly three sections, if the meta description of `/`, `/how-it-works`, `/faq`, `/about` or `/contact` is longer than 155 characters, or if `/llms.txt` is missing, does not start with `# Sugar Depth` or links to a page the build did not make.

## Where things live

| What | Where |
|---|---|
| Site URL, scanner URL (`APP_URL`), company details, content date | `src/config.ts`. Keep it free of imports: `astro.config.mjs` loads it with plain Node. The rules and registry versions come from the generated data (`src/data/ingredients.ts`) |
| Rule table on `/how-it-works` | `src/data/rules.ts`: plain-word conditions written by hand from `RULES.md`; ids, order and outcomes are checked against `policy.ts` by `tests/unit/site-rules.test.ts` |
| The three verdicts in one line each (home, top of `/how-it-works`, `/llms.txt`) | `VERDICTS` in `src/data/rules.ts`. Written once; the numbers are checked against `policy.ts` by `tests/unit/site-rules.test.ts` |
| "Ingredient examples" table on `/how-it-works` | `TREATMENT_ROWS` in `src/data/rules.ts` lists registry ids (a short pick, not every row in `RULES.md`); the cells come from the generated data |
| Mission line (home `<h1>`, `/about`, `/llms.txt`) | `src/data/mission.ts` |
| FAQ questions and answers | `src/data/faq.ts`; `/faq` prints this list and nothing else. Each answer leads with the direct answer, in two sentences and about 35 words at most (checked by `tests/unit/site-rules.test.ts`). The page ships no FAQPage JSON-LD on purpose |
| `/llms.txt` | `src/pages/llms.txt.ts`, built from `MISSION`, `VERDICTS` and the featured guides |
| Short-page styles: home sections 2 and 3, the `Sources (n)` disclosure, phone table labels, `/faq`, `/about` | `src/styles/brief-pages.css`, imported last by `index.astro`, `how-it-works.astro`, `faq.astro` and `about.astro`; `src/components/SourcesBrief.astro` |
| Ingredient pages, added-sugar names, registry and rules versions | `src/data/ingredients.generated.json`, generated from `supabase/functions/_shared/ingredients.ts` and `policy.ts` by `scripts/sync-ingredients.ts`. Read through `src/data/ingredients.ts`. Never edit the JSON by hand |
| One-line blurbs on `/hidden-sugar-names` | `src/data/sugars.ts` (keyed by registry id) |
| Home page "try it" widget | `src/components/TryIt.astro`, `src/lib/tryIt.ts`, `src/styles/tryit.css`; tests in `tests/unit/try-it.test.ts` at the repo root |
| Crystal swarm: the dark bands, the canvas and the home page's alias tiles | `src/components/CrystalSwarm.astro`, `src/lib/swarm.ts`, `src/styles/swarm.css`; bands are marked `class="swarm-band" data-swarm="hero"` or `"accent"` in `src/pages/index.astro`, `how-it-works.astro` and `about.astro`. Rules in `DESIGN.md` ("Crystal swarm") |
| Hero layout, verdict disclosures, `/how-it-works` expanders, phone scan bar | `src/styles/interactive.css`; markup in `src/pages/index.astro`, `src/pages/how-it-works.astro` and `src/layouts/Base.astro` (the scan bar) |
| Government sources | `src/data/sources.ts` |
| Hand-written ingredient guides | `src/content/ingredients/*.mdx`, merged with the generated page in `src/data/guides.ts` |
| JSON-LD (Organization, WebSite, WebApplication, BreadcrumbList; Article on guides) | `src/data/schema.ts`, pages |
| robots.txt | `src/pages/robots.txt.ts`. Every crawler is allowed; search, AI answer and AI training crawlers are also named one by one, so opting one out is a one-line change |
| Share image and favicons | `public/og/default.png`, `public/favicon*`, generated by `scripts/og.mjs` |

When the scanner's rules or registry change, regenerate the ingredient data (below), which also updates the versions shown in the footer, then update `src/data/rules.ts` (the rule table and `VERDICTS`), `src/data/faq.ts`, the prose on `/how-it-works`, the matching guide, and `CONTENT_UPDATED` in `src/config.ts`. `npm run test:unit` in the repo root fails while the rule table or the old verdict names are out of step with `policy.ts`.

### Short pages

The home page is three sections and no more: the mission (the hero band, whose `<h1>` is the mission line), "How it works" (three steps, three verdict lines with their rules behind `<details>`, and the try-it widget as the live demonstration) and "Explore" (the eight alias tiles, five links and one scan button). `/how-it-works` shows the three verdict lines and keeps everything else in collapsed `<details>`; `/faq` and `/about` are short on purpose. Before adding copy to any of them, cut something else.

On phones the tables on `/how-it-works` stack. Column names come from each cell's `data-label` attribute through CSS, so the HTML holds every value once; the rule table drops the labels and sets the order number beside the condition.

### Ingredient pages

Every entry in the scanner's ingredient registry gets `/ingredients/<slug>`, plus the two juice entries the scanner matches by grammar. The name, class, label names, E numbers, US label treatment, registry note, sources, and the verdicts and rule ids on each page are generated; the verdicts come from running `policy.ts` on a one-ingredient label, not from a copied table.

- After a registry or rules change, run `npm run ingredients` in the repo root and commit `src/data/ingredients.generated.json`. `npm run ingredients -- --check` exits 1 when the file is out of date, and so does `npm run test:unit` (`tests/unit/ingredient-pages.test.ts`).
- The generator lives in `scripts/ingredient-pages.ts`. It runs with `tsx` from the repo root because it imports the registry; the site build only reads the committed JSON, so Vercel can keep building from `sites/sugardepth` alone.
- To write a guide by hand for an entry, add `src/content/ingredients/<slug>.mdx` with `entry: <registry id>`. The file name must be the entry's slug. The body replaces the generated "What it is" and "How US labels count it" sections; the facts panel, names, verdict table and sources still come from the registry. `casing` lists registry names to print with capitals (`Splenda`, `E955`).
- A guide about one name of an entry (`evaporated-cane-juice.mdx`, `entry: sugar`) uses its own file name as the slug and sets `name` and `aliases`, which must be aliases of that entry.
- The build fails if a guide points at an entry, alias, code, source or related page that does not exist.

The try-it widget is the exception: `src/lib/tryIt.ts` imports the scanner's rules directly from `supabase/functions/_shared/` (`normalize.ts`, `ingredients.ts`, `policy.ts`), so it needs the whole repository at build time and picks up rule changes on the next site build. The sample verdicts are rendered at build time and switch with CSS, so they work without JavaScript; the paste box runs the same rules in the browser and sends nothing anywhere. With JavaScript, a tap on a sample (or a pasted list) plays the result: each ingredient lights up in label order, then the verdict word lands. Only classes change, so nothing moves, and `prefers-reduced-motion` skips straight to the finished panel.

### What visitors don't see

Rule ids and version strings are for maintainers, not readers. The try-it result carries its rule id as a `data-rule` attribute, the rule table on `/how-it-works` shows the order number (each row keeps its `id="rule-…"` anchor for the ingredient pages' "See the rule" links), and the hand-written guides name their rule ids in MDX comments (`{/* rule … */}`), which `tests/unit/ingredient-pages.test.ts` reads. The rules and registry versions appear only in small provenance lines (footer, table captions).

### Phone scan bar

`Base.astro` renders a fixed "Scan a label" bar below 760px on every page except `/privacy` and `/terms`. It steps aside while anything marked `data-sticky-hide` (another scan button, the try-it paste form, the closing call to action) or the footer is on screen, so it never covers them, and it pads itself by `env(safe-area-inset-bottom)`. Mark any new bottom-of-screen control with `data-sticky-hide`.

### Media

Never ship a film or screenshot that shows old verdict words. The pre-rules-change three-steps film and app screenshots were removed in round 1; the live try-it widget stands in for them. Re-record before adding any back.

`public/og/default.png` (1200×630) is the default share image. The scanner app links to `https://sugardepth.com/og/default.png`, so keep that path. To regenerate it, convert the `@fontsource` `.woff` files to TTF (see the comment in `scripts/og.mjs`), then run `OG_FONT_DIR=/path/to/ttf npm run og` and commit the output.

## URLs

No trailing slashes: `/how-it-works`, `/privacy`, `/terms`, `/ingredients/stevia`. Astro builds each page as `name/index.html`, and `vercel.json` sets `trailingSlash: false` so `/how-it-works/` redirects to `/how-it-works`.

## Deploy (Vercel)

- New Vercel project from this repo, **Root Directory = `sites/sugardepth`**. Framework preset: Astro. Build command `npm run build`, output `dist`. Node 22.x or newer.
- Ignored build step (optional, so scanner commits don't rebuild the site): `git diff --quiet HEAD^ HEAD -- .`

## Domain plan

- `sugardepth.com`: this site (production). `www.sugardepth.com` redirects to it.
- `app.sugardepth.com`: the scanner web build, when it moves. Then change `APP_URL` in `src/config.ts`.
- `quickgob-web.vercel.app`: 301 to `app.sugardepth.com` once that is live.
- `SITE_URL` in `src/config.ts` drives canonicals, the sitemap, OG URLs and JSON-LD ids.
