# Sugar Depth website content

Every visible string, link, image, and meta tag on the marketing site, taken from `sites/sugardepth`. Nothing here is inferred from the live site. Non-breaking spaces in the source (before `g` and `ml`, and in a few FAQ answers) are written as ordinary spaces.

Counts from `src/data/ingredients.generated.json`: **66** registry pages, **1** extra alias guide, **67** ingredient URLs, **180** added-sugar names. Policy **rules-v3**. Registry **registry-2026.11.10b**. Added-sugar cutoff **4 g**. Content review date **2026-11-10** (`CONTENT_UPDATED` in `src/config.ts`).

## Table of contents

1. [Site identity](#site-identity)
2. [Visual system](#visual-system)
3. [Global header and navigation](#global-header-and-navigation)
4. [Sticky scan bar](#sticky-scan-bar)
5. [Footer](#footer)
6. [Shared meta, SEO, and JSON-LD](#shared-meta-seo-and-json-ld)
7. [Home](#home)
8. [How it works](#how-it-works)
9. [Hidden sugar names](#hidden-sugar-names)
10. [Ingredient guides index](#ingredient-guides-index)
11. [Ingredient page template](#ingredient-page-template)
12. [Every ingredient page](#every-ingredient-page)
13. [FAQ](#faq)
14. [About](#about)
15. [Contact](#contact)
16. [Privacy policy](#privacy-policy)
17. [Terms of use](#terms-of-use)
18. [404](#404)
19. [llms.txt](#llmstxt)
20. [robots.txt](#robotstxt)
21. [Images and media](#images-and-media)
22. [Config, build, and scripts](#config-build-and-scripts)
23. [Source catalog](#source-catalog)

## Site identity

Source: `src/config.ts`. Change the values there. `astro.config.mjs` reads this file with plain Node, so keep it free of imports.

| Key | Value | Used for |
|---|---|---|
| SITE_URL | https://sugardepth.com | Canonical URLs, sitemap, Open Graph, JSON-LD |
| APP_URL | https://app.sugardepth.com | Every "Scan a label" and "Open the scanner" link |
| SITE_NAME | Sugar Depth | Titles, wordmark, JSON-LD brand |
| TAGLINE | Read the fine print. | Footer voice line; Open Graph image |
| ORG.name | Martian Dynamics LLC | About, contact, privacy, terms, footer, JSON-LD |
| ORG.locality / region / country | Leander / TX / US | About, contact, privacy, terms, footer, JSON-LD address |
| ORG.email | support@sugardepth.com | About, contact, privacy, terms |
| CONTENT_UPDATED | 2026-11-10 | `dateModified` and `datePublished` on Article JSON-LD |

Policy and registry versions are not in `config.ts`. They are `policyVersion` and `registryVersion` in `src/data/ingredients.generated.json`, re-exported by `src/data/ingredients.ts`.

Mission, written once in `src/data/mission.ts` and printed on the home hero, About, and `/llms.txt`:

- MISSION: Sugar has a lot of aliases. We read every one.
- MISSION_DETAIL: We read the fine print on every food label and name each added sugar and sweetener; what you eat is your call.

## Visual system

Colors are the custom properties in `src/styles/tokens.css` (generated from `brand/tokens.json`; do not edit the CSS by hand). `src/styles/global.css` maps them onto the page. Fonts are loaded in `src/layouts/Base.astro` from `@fontsource`: Libre Franklin latin 400, 600, 800, and 900, and Newsreader latin 400 italic.

### Color tokens

| Token | Value | Role on the site |
|---|---|---|
| --sd-paper / --sd-background | #06080D | Page background |
| --sd-ambient-0 / -1 / -2 | #0B1220 / #06080D / #0A0B12 | Vertical background gradient |
| --sd-ink / --sd-text | #F4F6FB / #FFFFFF | Body and heading color (body uses --sd-ink) |
| --sd-ink-muted | rgba(244,246,251,0.74) | Leads, muted copy |
| --sd-ink-faint | rgba(244,246,251,0.6) | Kickers, footer headings |
| --sd-on-ink | #0A0D14 | Text on the light primary button |
| --sd-rule | rgba(255,255,255,0.34) | 1px rules (`.rule-5`, prose `h2` top border) |
| --sd-rule-strong (in global.css) | rgba(244,246,251,0.82) | Thick rules (`.rule-10`, `.rule-4`, footer top, page-head bottom) |
| --sd-hairline | rgba(255,255,255,0.12) | Header bottom border, list hairlines |
| --sd-sheet | rgba(16,20,30,0.62) | Frosted sheet fill |
| --sd-glass-border | rgba(255,255,255,0.18) | Sheet and glass borders (sheets also use a 1px rgba(255,255,255,0.16) border) |
| --sd-glow-teal | rgba(31,181,168,0.30) | Ambient light, top left |
| --sd-glow-indigo | rgba(76,99,230,0.26) | Ambient light, right |
| --sd-glow-amber | rgba(245,158,11,0.18) | Ambient light, bottom left |
| --sd-clean | #5BE49B | CLEAN word on the dark site |
| --sd-bad | #FFC24D | OKAY word on the dark site (class name is still `bad`) |
| --sd-ugly | #FF7A66 | BAD word on the dark site (class name is still `ugly`) |
| --sd-clean-ink | #176B43 | CLEAN on the warm crystal paper |
| --sd-bad-ink | #805414 | OKAY on the warm crystal paper |
| --sd-ugly-ink | #AF3223 | BAD on the warm crystal paper |
| --sd-crystal-paper | #F4F2EB | `theme-color` meta; crystal editorial paper |
| --sd-crystal-ink | #141613 | Crystal-stage ink |
| --sd-crystal-muted | #52564F | Crystal-stage muted text |
| --sd-crystal-rule | rgba(20,22,19,0.18) | Crystal-stage rules |

Verdict class names predate the current words. `toneClass()` in `src/data/ingredients.ts` maps BAD and `bad` to `ugly`, OKAY and `okay` to `bad`, and CLEAN and `clean` to `clean`.

### Type

| Use | Font | Weight / style |
|---|---|---|
| Body | Libre Franklin, then ui-sans-serif, system-ui, Segoe UI, Roboto | 400; size 17px; line-height 1.6 |
| Headings | Libre Franklin | 900 |
| Buttons | Libre Franklin | 800 |
| Nav | Libre Franklin | 600 |
| Kickers and footer column titles | Libre Franklin | 800, uppercase, letter-spacing 0.16–0.18em |
| Voice lines (mission on About, footer tagline, crystal signoff) | Newsreader | 400 italic |
| Codes and E numbers | ui-monospace, SF Mono, Menlo, Consolas | class `mono` |

### Rules, sheets, and borders

The layout uses horizontal rules rather than boxes for the verdict panel. Classes are in `src/styles/global.css`.

| Class or element | What you see |
|---|---|
| .rule-10 | 2px strong rule under a panel title |
| .rule-5 | 1px rule between blocks |
| .rule-4 | 2px rule that closes a panel |
| .sheet | Frosted panel, 14px radius, blur 28px, inset highlight |
| .btn / .btn.primary | Pill button. Primary is light ink fill (#F4F6FB) with dark text. A CSS shutter circle sits before "Scan a label"; it is not text. |
| .site-header | Sticky, translucent #06080D at 55% opacity, 18px blur, 1px hairline under it |
| .wordmark | "Sugar Depth" at weight 900, with a 4px ink underline drawn in CSS |
| .kicker | Small uppercase label with a 22×3px bar before the words |
| .page-head | Bottom border 2px strong rule |
| .site-footer | Top border 2px strong rule |
| .prose h2 | 1px rule along the top of each section heading |
| .how-steps li | 2px strong rule above each step (`src/styles/brief-pages.css`) |
| .explore-links | 1px rule above the list; hairline under each link |
| .breadcrumbs | Items separated by a slash drawn in CSS (`li + li::before { content: '/' }`) |
| .editorial-frame | 16px radius, cream background #f9efe4 |
| .crystal-slab | Glass slab, 2px border, tinted by the verdict |

Body background is the dark gradient plus three soft glows (teal, indigo, amber) from `body::before`. Max content width is 1200px (`.wrap`).

## Global header and navigation

Source: `src/components/Header.astro`, rendered by `src/layouts/Base.astro` on every HTML page. Change links in the `links` array.

Above the header, a skip link: **Skip to content** → `#main`. It is visually off-screen until focused.

Wordmark: **Sugar Depth** → `/` (accessible name "Sugar Depth home").

Desktop nav (`aria-label="Main"`) and the phone menu repeat the same links. The current page sets `aria-current="page"`. `/ingredients` stays current for every `/ingredients/...` URL.

| Label | Target |
|---|---|
| How it works | /how-it-works |
| Ingredients | /ingredients |
| Hidden sugar names | /hidden-sugar-names |
| FAQ | /faq |
| About | /about |

Header button: **Scan a label** → https://app.sugardepth.com

Phone menu (a `<details>` element): closed label **☰ Menu**, open label **✕ Close**. The panel repeats the five links. It does not repeat the scan button.

## Sticky scan bar

Source: `src/layouts/Base.astro`. On viewports where the CSS shows it, a fixed bar reads **Scan a label** → https://app.sugardepth.com. It is omitted on `/privacy` and `/terms`. An inline script hides it while another scan button, the try-it form, or the footer is on screen. The shutter icon is decorative.

## Footer

Source: `src/components/Footer.astro`. The year is hardcoded `2026`. The six guide links are the first six hand-written guides from `getFeaturedGuides()` (MDX files sorted by `order`).

Column 1

- Wordmark **Sugar Depth** → `/`
- Voice line: Read the fine print.
- Sugar Depth is a food-label scanner that flags added sugar and sweeteners. Its verdicts are product preferences, not medical advice, and it does not check allergens.

Column 2, heading **Product**

| Label | Target |
|---|---|
| Open the scanner | https://app.sugardepth.com |
| How verdicts work | /how-it-works |
| Hidden sugar names | /hidden-sugar-names |
| FAQ | /faq |

Column 3, heading **Ingredient guides**

| Label | Target |
|---|---|
| Sucralose | /ingredients/sucralose |
| Aspartame | /ingredients/aspartame |
| Acesulfame K | /ingredients/acesulfame-k |
| Erythritol | /ingredients/erythritol |
| Xylitol | /ingredients/xylitol |
| Stevia | /ingredients/stevia |
| All guides | /ingredients |

Column 4, heading **Company**

| Label | Target |
|---|---|
| About | /about |
| Contact | /contact |
| Privacy | /privacy |
| Terms | /terms |

Legal line: **© 2026 Martian Dynamics LLC, Leander, Texas. rules-v3 · registry-2026.11.10b**

Change the blurb in `Footer.astro`. Change the guide list by changing MDX `order` (only guides with an MDX file appear, and only the first six). Change the version string by regenerating the registry JSON.

## Shared meta, SEO, and JSON-LD

Source: `src/layouts/Base.astro`, on every HTML page. `ogType` defaults to `website`. Ingredient pages pass `article`.

| Tag | Value |
|---|---|
| html lang | en |
| charset | utf-8 |
| viewport | width=device-width, initial-scale=1 |
| color-scheme | light |
| theme-color | #F4F2EB |
| robots | `noindex` only on the 404. Other pages get a canonical link instead. |
| canonical | https://sugardepth.com plus the page path. The 404 has no canonical. |
| og:site_name | Sugar Depth |
| og:type | website, or article on ingredient pages |
| og:title | Same as the `<title>` |
| og:description | The page meta description |
| og:url | The canonical URL |
| og:image | https://sugardepth.com/og/default.png |
| og:image:width / height | 1200 / 630 |
| og:image:alt | Sugar Depth: read the fine print. Evaporated cane juice? That's sugar. |
| og:locale | en_US |
| twitter:card | summary_large_image |
| twitter:title / description / image | Same as the OG title, description, and image |
| icon | /favicon.svg, /favicon-32.png, apple-touch-icon /apple-touch-icon.png |
| sitemap link | /sitemap-index.xml |

The `<title>` is the page title unchanged when it already contains "Sugar Depth". Otherwise the layout appends ` | Sugar Depth`.

Every HTML page loads Google tag `GTM-K8262PBN` from `https://www.googletagmanager.com/gtm.js?id=GTM-K8262PBN`, with `allow_google_signals` and `allow_ad_personalization_signals` set to false. JSON-LD is whatever the page passes. The sitemap integration drops any URL containing `/404`. Astro `trailingSlash` is `never`; `vercel.json` sets `trailingSlash: false`.

### Text on the share image

`public/og/default.png` is drawn by `scripts/og.mjs` (1200×630, background #06080D). Visible text:

- Sugar Depth
- Read the fine print.
- Evaporated cane juice?
- That's sugar. (in #FF7A66)
- Food-label scanner · CLEAN (#5BE49B) OKAY (#FFC24D) BAD (#FF7A66)

The favicon is a dark rounded square, a heavy S, two white rules, and a coral square. Regenerating both is `OG_FONT_DIR=... npm run og` inside `sites/sugardepth`.

## Home

Path: `/`. Source: `src/pages/index.astro`. The page is three sections and a crystal canvas behind the first and third.

**Title:** Sugar Depth: the food-label scanner that names every hidden sugar

**Meta description:** Sugar Depth is a food-label scanner. Photograph an ingredient list and get one verdict: CLEAN, OKAY or BAD. No barcodes, no product database.

**JSON-LD:** Organization, WebSite, and WebApplication from `src/data/schema.ts`.

Organization (`https://sugardepth.com/#organization`): name Martian Dynamics LLC, url https://sugardepth.com, email support@sugardepth.com, address Leander, TX, US, brand Sugar Depth, slogan "Read the fine print."

WebSite (`https://sugardepth.com/#website`): name Sugar Depth, url https://sugardepth.com, inLanguage en-US, publisher the organization.

WebApplication (`https://sugardepth.com/#app`): name Sugar Depth, url https://app.sugardepth.com, applicationCategory LifestyleApplication, operatingSystem "Web browser", browserRequirements "Requires a camera and a modern web browser." Description: "Sugar Depth reads the ingredient list in a photo of a food label and gives one verdict: CLEAN, OKAY or BAD, based on added sugars and sweeteners. It does not use barcodes or a product database." Features: "Reads the printed ingredient list from a photo"; "Flags added sugars under any of their label names"; "Flags artificial sweeteners, sugar alcohols and plant sweeteners"; "Asks for a retake when the list is cut off or unreadable."

### Hero

Source: the first `<section>` in `index.astro`, plus `src/components/CrystalSwarm.astro` and `src/components/CrystalVerdict.astro`. The canvas has no text. Change the mission lines in `src/data/mission.ts`.

- Kicker: Our mission
- H1: Sugar has a lot of aliases. We read every one.
- Lead: We read the fine print on every food label and name each added sugar and sweetener; what you eat is your call.
- Button: Scan a label → https://app.sugardepth.com
- Note: A food-label scanner. Not medical advice; no allergen checks.

The slab is interactive, compact, and starts on CLEAN. It cycles CLEAN → OKAY → BAD. Visible controls, each a radio labeled "Show the CLEAN slab", "Show the OKAY slab", or "Show the BAD slab", with the words CLEAN, OKAY, and BAD. The glass itself is labeled Verdict plus the current word. The longer crystal caption ("Sugar Depth · Verdicts" and "Three verdicts. The worst ingredient decides.") is not rendered in this compact hero.

### How it works

- H2: How it works
- Step 1: Snap the ingredient list.
- Step 2: We check every name.
- Step 3: Get one word: CLEAN, OKAY or BAD.

The three icons are inline SVG with no text. Under them, three verdict blocks from `VERDICTS` in `src/data/rules.ts`. Each has the word, one line, and a disclosure.

**BAD** (red (class ugly)). Over 4 g added sugar, any artificial sweetener, or alcohol.

Disclosure summary: The BAD rules

- More than 4 g of added sugar per serving, under any name
- Added sugar whose grams per serving can't be read
- Any artificial sweetener: sucralose, aspartame, acesulfame K and others
- Drinking alcohol above 0.5% ABV

**OKAY** (amber (class bad)). A little added sugar, sugar alcohols or plant sweeteners.

Disclosure summary: The OKAY rules

- No BAD trigger, but added sugar at 4 g or less per serving
- A sugar alcohol such as erythritol or xylitol, or allulose
- A plant sweetener: stevia, monk fruit or thaumatin

**CLEAN** (green (class clean)). Nothing sweet added. Milk and fruit sugars don't count.

Disclosure summary: The CLEAN rules

- A complete ingredient list with nothing sweet added
- Sugar that comes with milk or fruit is fine
- Maltodextrin and starches are fine

Change those lines in `src/data/rules.ts` (`VERDICTS`). The same array is printed at the top of How it works and in `/llms.txt`.

#### Try it

Source: `src/components/TryIt.astro` and `src/lib/tryIt.ts`. It sits inside How it works, under a 2px rule. Sample verdicts are rendered at build time from the scanner rules. The paste box does not run until JavaScript loads, and the text stays in the browser.

- H3: Try it: tap a sample label
- Legend: Sample labels
- Fine print under the samples: Made-up labels, not real products.
- Paste label: Or paste an ingredient list
- Placeholder: Water, cane sugar, natural flavors, citric acid
- Grams label: Added sugars per serving, in grams (optional)
- Button (disabled until the script runs): Check this list
- Fine print: Stays in your browser.
- Without JavaScript: Checking your own list needs JavaScript. The sample labels work without it.
- Empty submit: Paste an ingredient list first.
- Unrecognised paste: None of that matches an ingredient the rules know, so there is no verdict. Paste the ingredient list as printed on the package, with commas between the ingredients.
- Panel title (hidden from assistive tech, still in the HTML): Verdict Facts
- Count line pattern: "N ingredients read, in label order"
- Mini slab text: Verdict, then the word
- Screen-reader prefix on the word: "Verdict: "

The first sample is selected. Paste limit is 4000 characters. Grams input allows 0 to 500.

**Flavored Greek yogurt** (selected). Claim: High protein, 0% milkfat. Ingredients: Cultured Nonfat Milk, Cane Sugar, Strawberries, Water, Natural Flavors, Fruit Pectin, Locust Bean Gum, Lemon Juice, Fruit and Vegetable Juice (for Color). Added sugars: 11 g.

Panel: Flavored Greek yogurt · 11 g added sugars per serving. Verdict **BAD**. Why: 11 g added sugar per serving (Cane Sugar). 9 ingredients read, in label order.

- Cultured Nonfat Milk — Natural sugar
- Cane Sugar — Added sugar (this one decides)
- Strawberries — Natural sugar
- Water
- Natural Flavors
- Fruit Pectin
- Locust Bean Gum
- Lemon Juice — Natural sugar
- Fruit and Vegetable Juice — Natural sugar

**Zero-sugar hydration stick.** Claim: Zero sugar, electrolytes. Ingredients: Citric Acid, Sodium Citrate, Potassium Citrate, Natural Flavors, Salt, Magnesium Citrate, Stevia Leaf Extract, Vitamin C (Ascorbic Acid), Vegetable Juice Color. Added sugars: 0 g.

Panel: Zero-sugar hydration stick · 0 g added sugars per serving. Verdict **OKAY**. Why: No added sugar, but sweetened with Stevia Leaf Extract. 10 ingredients read, in label order.

- Citric Acid
- Sodium Citrate
- Potassium Citrate
- Natural Flavors
- Salt
- Magnesium Citrate
- Stevia Leaf Extract — Plant sweetener (this one decides)
- Vitamin C
- Ascorbic Acid — in Vitamin C
- Vegetable Juice Color

**Kids organic granola bar.** Claim: Organic, whole grain, made with honey. Ingredients: Organic Rolled Oats, Organic Brown Rice Syrup, Organic Cane Sugar, Organic Chocolate Chips (Organic Cane Sugar, Organic Unsweetened Chocolate, Organic Cocoa Butter), Organic Sunflower Oil, Organic Honey, Organic Crisp Rice (Organic Rice Flour, Organic Cane Sugar, Sea Salt), Sea Salt, Organic Vanilla Extract. Added sugars: 7 g.

Panel: Kids organic granola bar · 7 g added sugars per serving. Verdict **BAD**. Why: 7 g added sugar per serving (Organic Brown Rice Syrup, Organic Cane Sugar, Organic Honey). 13 ingredients read, in label order.

- Organic Rolled Oats
- Organic Brown Rice Syrup — Added sugar (decides)
- Organic Cane Sugar — Added sugar (decides)
- Organic Cane Sugar — in Organic Chocolate Chips — Added sugar (decides)
- Organic Unsweetened Chocolate — in Organic Chocolate Chips
- Organic Cocoa Butter — in Organic Chocolate Chips
- Organic Sunflower Oil
- Organic Honey — Added sugar (decides)
- Organic Rice Flour — in Organic Crisp Rice
- Organic Cane Sugar — in Organic Crisp Rice — Added sugar (decides)
- Sea Salt — in Organic Crisp Rice
- Sea Salt
- Organic Vanilla Extract

**Plain peanut butter.** Claim: Two ingredients. Ingredients: Dry Roasted Peanuts, Salt. Added sugars: 0 g.

Panel: Plain peanut butter · 0 g added sugars per serving. Verdict **CLEAN**. Why: No added sugar or sweetener in the ingredient list. 2 ingredients read, in label order.

- Dry Roasted Peanuts
- Salt

Change the four samples in `SAMPLES` in `src/lib/tryIt.ts`. Verdict sentences come from `policy.ts`, not from copy in this file.

### Explore

- H2: Explore
- Hint: Eight of sugar's aliases. Tap a card to unmask it.

Eight buttons. The front is the name. The back is the tag **Added sugar** and the line **That's sugar.** Names are the registry strings with the first letter capitalized. The build throws if any of them is not an added-sugar alias.

1. Evaporated cane juice
2. Brown rice syrup
3. Agave nectar
4. Dextrose
5. Barley malt syrup
6. Fruit juice concentrate
7. Coconut sugar
8. Invert sugar

Change the eight strings in `TILE_ALIASES` in `index.astro`. The back-of-card copy is in that same file.

Links under the tiles (an arrow `→` is decorative):

| Label | Target |
|---|---|
| All 180 added-sugar names | /hidden-sugar-names |
| Ingredient guides | /ingredients |
| The full rules | /how-it-works |
| FAQ | /faq |
| About | /about |

Button: **Scan a label** → https://app.sugardepth.com

## How it works

Path: `/how-it-works`. Source: `src/pages/how-it-works.astro`. Styles: `src/styles/brief-pages.css`.

**Title:** How Sugar Depth verdicts work: the CLEAN, OKAY and BAD rules

**Meta description:** BAD: over 4 g added sugar per serving, an artificial sweetener or alcohol. OKAY: 4 g or less, sugar alcohols or stevia. CLEAN: nothing sweet added.

**JSON-LD:** Article plus breadcrumbs Home → How it works. Article headline is the title above. Description: "The ordered rules Sugar Depth uses to call a food label CLEAN, OKAY or BAD." dateModified and datePublished: 2026-11-10. image: https://sugardepth.com/og/default.png. author and publisher: the organization id.

### Page head

Crystal swarm, accent density, no readable text. Breadcrumb: Home (/) / How it works.

- Kicker: The rulebook
- H1: How verdicts work
- Voice: Three verdicts. The worst ingredient decides.

Verdict key lines (word, then the one-line summary from `VERDICTS`):

- BAD — Over 4 g added sugar, any artificial sweetener, or alcohol.
- OKAY — A little added sugar, sugar alcohols or plant sweeteners.
- CLEAN — Nothing sweet added. Milk and fruit sugars don't count.

### Photograph

`EditorialImage` name `label`. Alt: "A thick clear glass slab rests over fine print on a cream food package, with a sugar cube beside it." Files: `/media/crystal-label-800.avif`, `crystal-label-1600.avif`, and the matching `.webp` files. Change the alt in `how-it-works.astro`. Replace the files in `public/media/`.

Hint above the disclosures: **The details, one tap each.** Each block is a closed `<details>`. A hash such as `#rule-X1` or `#limits` opens the box that contains it.

### The rule table

Summary heading: **The rule table** (`#rules`).

Caption: Sugar Depth rules-v3. Checked top to bottom; the first match decides.

The visible order column is 1, 2, 3, and so on. The row id (`#rule-X1`) is the link target from ingredient pages and is not printed as the cell text. Conditions are `RULES` in `src/data/rules.ts`. The ingredient lists inside X3, O2, and O3 are filled from the registry at build time.

| Order | Anchor | When | Result |
|---|---|---|---|
| 1 | #rule-R1 | The photo isn't a food or drink label. | No verdict. Asks for a retake. |
| 2 | #rule-R2 | The ingredient text can't be read. | No verdict. Asks for a retake. |
| 3 | #rule-X1 | The Nutrition Facts panel shows more than 4 g of added sugar per serving. | BAD |
| 4 | #rule-X2 | Added sugar is listed but the grams per serving can't be read, or are printed only per 100 g or 100 ml. | BAD |
| 5 | #rule-X3 | An artificial sweetener is listed: sucralose, aspartame, acesulfame K, saccharin, cyclamate, neotame, advantame, aspartame-acesulfame salt or neohesperidin DC. | BAD |
| 6 | #rule-X4 | Drinking alcohol: more than 0.5% ABV, or beer, wine, spirits or ethanol with no non-alcoholic or "0.5% or less" statement. | BAD |
| 7 | #rule-R3 | No ingredient list is visible. | No verdict. Asks for a retake. |
| 8 | #rule-O1 | Added sugar at 4 g or less per serving on the Nutrition Facts panel, including a listed added sugar printed as 0 g. | OKAY |
| 9 | #rule-O2 | A sugar alcohol is listed (erythritol, xylitol, sorbitol, mannitol, isomalt, maltitol, lactitol or polyglycitol syrup), or allulose. | OKAY |
| 10 | #rule-O3 | A plant sweetener is listed: stevia, monk fruit or thaumatin. | OKAY |
| 11 | #rule-R4 | The list is cut off or partly unreadable, and nothing above was found in the readable part. | No verdict. Asks for a retake. |
| 12 | #rule-O4 | An unknown ingredient may be a sweetener: a sweet-sounding name, or an unknown E number from E950 to E969. | OKAY |
| 13 | #rule-O5 | Two or more ingredients aren't in the registry, so the rules can't vouch for the whole list. | OKAY |
| 14 | #rule-C1 | The list is complete and none of the above applies. Sugar from milk, fruit or vegetables is fine. | CLEAN |

Under the table, still inside the disclosure:

**Cut-off lists.** A cut-off list can only hide more ingredients. So added sugar, a sweetener or alcohol in the visible part decides; with none visible, Sugar Depth asks for a retake.

**Blends.** Every ingredient inside a blend is checked. Stevia never overrides a worse ingredient, so a blend of sucralose and stevia is BAD.

**What the rules don't do.** The rules make no guesses from an ingredient's position in the list or a brand's intent.

### What happens to your photo

Summary heading: **What happens to your photo** (`#pipeline`).

1. **Reading.** An AI vision model (Anthropic's Claude) copies the ingredient list and sugar numbers as printed.
2. **Cleaning up.** The text is split into single ingredients, including ones nested in brackets.
3. **Matching.** Each ingredient is matched to the registry by its exact name, never by a fragment.
4. **Deciding.** The ordered rules give the verdict and the printed words that triggered it.

A separate checker also looks at the photo. The stricter of the two calls is the verdict shown.

### Ingredient examples

Summary heading: **Ingredient examples** (`#identity`).

Caption: What it is, how US labels count it, and the Sugar Depth verdict

Rows are `TREATMENT_ROWS` in `src/data/rules.ts`. Cell text is read from the registry. The second name in a shared row is lowercased. The label-treatment cell links to the first source that is not `addedSugarsRule` or `euAdditives`.

| Ingredient | What it is | US label treatment | Sugar Depth |
|---|---|---|---|
| [Sucralose](/ingredients/sucralose) | Non-sugar sweetener (artificial) | Not counted as sugar | BAD |
| [Erythritol](/ingredients/erythritol), [xylitol](/ingredients/xylitol) | Sugar alcohol (polyol). Not drinking alcohol. | Not counted as sugar | OKAY |
| [Allulose](/ingredients/allulose) | Rare sugar | [Not counted as sugar](https://www.fda.gov/media/123342/download) | OKAY |
| [Tagatose](/ingredients/tagatose), [isomaltulose](/ingredients/isomaltulose) | Rare sugar | [Counted as added sugar](https://www.federalregister.gov/documents/2020/10/19/2020-22900/sugars-that-are-metabolized-differently-than-traditional-sugars) | Added sugar: the grams per serving decide |
| [Maltodextrin](/ingredients/maltodextrin) | Other carbohydrate. Not sugar. | [Not counted as sugar](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-184/subpart-B/section-184.1444) | Allowed in CLEAN |
| [Fruit juice concentrate](/ingredients/juice-concentrate) | Added sugar | [Counted as added sugar](https://www.fda.gov/media/117402/download) | Added sugar: the grams per serving decide |
| [Fruit or vegetable juice](/ingredients/fruit-or-vegetable-juice), [fruit puree](/ingredients/fruit-puree) | Naturally occurring sugar (comes with a whole food) | [Counted as total sugar only, not as added sugar](https://www.fda.gov/media/117402/download) | Allowed in CLEAN |
| [Milk](/ingredients/milk) | Naturally occurring sugar (comes with a whole food) | [Counted as total sugar only, not as added sugar](https://www.fda.gov/media/117402/download) | Allowed in CLEAN |

### How the grams count

Summary heading: **How the grams count** (`#quantities`).

- Added sugar per serving is the only amount that changes a verdict: more than 4 g is BAD, 4 g or less is OKAY.
- A printed 0 g doesn't cancel a listed added sugar: US labels may round under 0.5 g down to zero (21 CFR 101.9 → https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9). That label is OKAY.
- If the panel shows added sugar but a complete ingredient list names none, the panel grams decide.

### Limits

Summary heading: **Limits** (`#limits`).

- **Not medical advice.** Verdicts are preferences, not safety findings or a diet plan.
- **No allergen checks.** Read the label yourself for allergens.
- **Only what's printed.** There is no product database.
- **Unreadable means retake.** A blurry or cut-off list gets a retake request, not a guess.
- **Juice depends on the product.** Juice concentrate (/ingredients/juice-concentrate), juice from concentrate (/ingredients/juice-from-concentrate) and fruit puree concentrate (/ingredients/fruit-puree-concentrate) are added sugar when they sweeten another food, and natural sugar in a product made only of fruit or juice.
- **Strict mode.** On by default. With it off, a product whose only sweetener is stevia, monk fruit or thaumatin shows as CLEAN.
- **US labels first.** Label notes follow US FDA rules.

### After the disclosures

Browse the ingredient guides (/ingredients) or the full list of hidden sugar names (/hidden-sugar-names).

Sources disclosure, summary **Sources (8)**, short names from `src/components/SourcesBrief.astro`:

- [FDA: Changes to the Nutrition Facts Label](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [FDA: Added sugars questions and answers](https://www.fda.gov/media/117402/download)
- [FDA: Allulose labeling guidance](https://www.fda.gov/media/123342/download)
- [Federal Register: Sugars metabolized differently (2020)](https://www.federalregister.gov/documents/2020/10/19/2020-22900/sugars-that-are-metabolized-differently-than-traditional-sugars)
- [eCFR: 21 CFR 184.1444 Maltodextrin](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-184/subpart-B/section-184.1444)
- [FDA: Questions and answers on dietary fiber](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/questions-and-answers-dietary-fiber)
- [eCFR: 21 CFR 101.9 Nutrition labeling of food](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9)
- [FDA: Aspartame and other sweeteners in food](https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food)

Closing call to action (`ScanCta`): heading **Point it at a label.** Text **One photo. One word.** Button **Scan a label** → https://app.sugardepth.com. Decorative image `/brand/cube-scanning.webp` with an empty alt.

## Hidden sugar names

Path: `/hidden-sugar-names`. Source: `src/pages/hidden-sugar-names.astro`, blurbs in `src/data/sugars.ts`, names from the registry. Styles: `src/styles/brief.css`.

**Title:** 180 hidden names for added sugar on food labels

**Meta description:** The 180 names for added sugar on ingredient lists, from evaporated cane juice and dextrose to brown rice syrup. Every one counts as added sugar.

**JSON-LD:** Breadcrumbs only. Home → Hidden sugar names.

### Hero

Breadcrumb: Home / Hidden sugar names

- Kicker: Name the disguise
- H1: Hidden sugar names
- Lead: The 180 names Sugar Depth reads as added sugar on an ingredient list.
- Rule line: More than 4 g of added sugar per serving, or grams that can't be read, is **BAD**. 4 g or less is **OKAY**. (BAD is the red class, OKAY the amber class.)

Jump nav (`aria-label="Jump to a group"`). Each link uses the registry name, not the longer heading:

- Sugar → `#sugar`
- Dextrose → `#dextrose`
- Fructose → `#fructose`
- Maltose → `#maltose`
- Trehalose → `#trehalose`
- Galactose → `#galactose`
- Lactose (added) → `#lactose`
- Honey → `#honey`
- Maple syrup → `#maple-syrup`
- Agave syrup → `#agave-syrup`
- Corn syrup → `#corn-syrup`
- High fructose corn syrup → `#high-fructose-corn-syrup`
- Rice syrup → `#rice-syrup`
- Malt syrup → `#malt-syrup`
- Fruit juice concentrate → `#juice-concentrate`
- Isomaltooligosaccharides (IMO) → `#isomaltooligosaccharides`
- Tagatose → `#tagatose`
- Isomaltulose → `#isomaltulose`

Film (`src/components/Film.astro`, name `aliases`). Because `public/media/aliases.mp4` and `aliases-poster.jpg` exist, the video plays and the still inside it is not shown. Accessible name: "Six names, including evaporated cane juice and brown rice syrup, are each revealed as sugar." Poster: `/media/aliases-poster.jpg`. Sources: `/media/aliases.webm`, `/media/aliases.mp4`. `FilmMotion.astro` plays the video when it is on screen, unless reduced motion is requested. The unused fallback still would be `EditorialImage` name `aliases`, alt "Six glass trays hold sugar cubes, golden syrup, brown sugar, pale agave syrup, dark malt syrup and white powder."

### Name groups

Each group prints its first 12 names. The rest sit behind a disclosure **All N names**. Names are the registry strings, lowercase. A name links to `/ingredients/evaporated-cane-juice` only when that alias guide lists it. The heading links to the group's ingredient page. The line under the heading is the blurb from `src/data/sugars.ts` when one exists, otherwise the registry note.

#### Sugar (sucrose and cane or beet sugars)

Anchor `#sugar`. Heading links to /ingredients/sugar. Registry id `sugar`.

Blurb (`src/data/sugars.ts`): Table sugar and its many costumes.

Shown (12 of 78):

- sugar
- cane sugar → /ingredients/evaporated-cane-juice
- raw cane sugar → /ingredients/evaporated-cane-juice
- evaporated cane sugar → /ingredients/evaporated-cane-juice
- beet sugar
- granulated sugar
- white sugar
- brown sugar
- brown sugar syrup
- light brown sugar
- dark brown sugar
- raw sugar

Disclosure summary: **All 78 names**

- turbinado sugar
- turbinado → /ingredients/evaporated-cane-juice
- demerara sugar
- demerara → /ingredients/evaporated-cane-juice
- muscovado sugar
- muscovado → /ingredients/evaporated-cane-juice
- powdered sugar
- confectioners sugar
- confectioner's sugar
- icing sugar
- caster sugar
- sucrose
- cane juice → /ingredients/evaporated-cane-juice
- evaporated cane juice → /ingredients/evaporated-cane-juice
- dried cane syrup → /ingredients/evaporated-cane-juice
- cane syrup → /ingredients/evaporated-cane-juice
- cane juice crystals → /ingredients/evaporated-cane-juice
- rapadura → /ingredients/evaporated-cane-juice
- panela → /ingredients/evaporated-cane-juice
- jaggery → /ingredients/evaporated-cane-juice
- sucanat → /ingredients/evaporated-cane-juice
- sugar syrup
- simple syrup
- liquid sugar
- invert sugar
- invert cane sugar
- invert syrup
- invert sugar syrup
- coconut sugar
- coconut palm sugar
- palm sugar
- date sugar
- maple sugar
- golden syrup
- treacle
- molasses
- blackstrap molasses
- cane molasses
- caramel
- burnt sugar
- suiker
- rietsuiker
- kristalsuiker
- basterdsuiker
- sucre
- sucre de canne
- sucre roux
- sucre de canne roux
- zucker
- rohrzucker
- rohrohrzucker
- azucar
- azucar de cana
- azucar moreno
- zucchero
- zucchero di canna
- acucar
- acucar de cana
- cukier
- cukier trzcinowy
- socker
- sukker
- sokeri
- saccharose
- sacarosa
- saccarosio

#### Dextrose (glucose)

Anchor `#dextrose`. Heading links to /ingredients/dextrose. Registry id `dextrose`.

Blurb (`src/data/sugars.ts`): Pure glucose, usually made from corn.

Shown (11 of 11):

- dextrose
- dextrose monohydrate
- anhydrous dextrose
- glucose
- grape sugar
- dextrosa
- destrosio
- glucosa
- glucosio
- traubenzucker
- druivensuiker

#### Fructose

Anchor `#fructose`. Heading links to /ingredients/fructose. Registry id `fructose`.

Blurb (`src/data/sugars.ts`): Fruit sugar, added on its own.

Shown (7 of 7):

- fructose
- crystalline fructose
- fruit sugar
- fructosa
- fruttosio
- fruchtzucker
- vruchtensuiker

#### Maltose

Anchor `#maltose`. Heading links to /ingredients/maltose. Registry id `maltose`.

Blurb (`src/data/sugars.ts`): Malt sugar.

Shown (2 of 2):

- maltose
- malt sugar

#### Trehalose

Anchor `#trehalose`. Heading links to /ingredients/trehalose. Registry id `trehalose`.

Blurb (`src/data/sugars.ts`): A sugar of two glucose units.

Shown (1 of 1):

- trehalose

#### Galactose

Anchor `#galactose`. Heading links to /ingredients/galactose. Registry id `galactose`.

Blurb (`src/data/sugars.ts`): A simple sugar, added alone.

Shown (1 of 1):

- galactose

#### Lactose (listed on its own)

Anchor `#lactose`. Heading links to /ingredients/lactose. Registry id `lactose_added`.

Blurb (`src/data/sugars.ts`): Milk sugar sold as an ingredient.

Shown (1 of 1):

- lactose

#### Honey

Anchor `#honey`. Heading links to /ingredients/honey. Registry id `honey`.

Blurb (`src/data/sugars.ts`): Natural, and still added sugar.

Shown (12 of 13):

- honey
- raw honey
- clover honey
- wildflower honey
- manuka honey
- honey powder
- dried honey
- miel
- honig
- honing
- miele
- mel

Disclosure summary: **All 13 names**

- miod

#### Maple syrup

Anchor `#maple-syrup`. Heading links to /ingredients/maple-syrup. Registry id `maple_syrup`.

Blurb (`src/data/sugars.ts`): Tree sap boiled down to sugar.

Shown (2 of 2):

- maple syrup
- pure maple syrup

#### Agave syrup

Anchor `#agave-syrup`. Heading links to /ingredients/agave-syrup. Registry id `agave`.

Blurb (`src/data/sugars.ts`): A syrup that is mostly fructose.

Shown (6 of 6):

- agave
- agave syrup
- agave nectar
- blue agave
- blue agave syrup
- agave inulin syrup

#### Corn syrup

Anchor `#corn-syrup`. Heading links to /ingredients/corn-syrup. Registry id `corn_syrup`.

Blurb (`src/data/sugars.ts`): Corn starch broken down into syrup.

Shown (12 of 14):

- corn syrup
- corn syrup solids
- glucose syrup
- glucose syrup solids
- dried glucose syrup
- corn sweetener
- sirop de glucose
- glukosesirup
- glucosesirup
- glucosestroop
- jarabe de glucosa
- sciroppo di glucosio

Disclosure summary: **All 14 names**

- xarope de glicose
- syrop glukozowy

#### High fructose corn syrup

Anchor `#high-fructose-corn-syrup`. Heading links to /ingredients/high-fructose-corn-syrup. Registry id `hfcs`.

Blurb (`src/data/sugars.ts`): Corn syrup, partly turned into fructose.

Shown (12 of 16):

- high fructose corn syrup
- hfcs
- glucose-fructose syrup
- glucose fructose syrup
- glucose-fructose
- fructose syrup
- fructose-glucose syrup
- isoglucose
- sirop de glucose-fructose
- glukose-fruktose-sirup
- glucose-fructose-sirup
- glucose-fructosestroop

Disclosure summary: **All 16 names**

- jarabe de glucosa y fructosa
- jarabe de glucosa-fructosa
- sciroppo di glucosio-fruttosio
- syrop glukozowo-fruktozowy

#### Rice syrup and other grain, root and fruit syrups

Anchor `#rice-syrup`. Heading links to /ingredients/rice-syrup. Registry id `rice_syrup`.

Blurb (`src/data/sugars.ts`): Starch or fruit turned into syrup.

Shown (9 of 9):

- rice syrup
- brown rice syrup
- rice malt syrup
- tapioca syrup
- oat syrup
- sorghum syrup
- carob syrup
- date syrup
- fig syrup

#### Malt syrup

Anchor `#malt-syrup`. Heading links to /ingredients/malt-syrup. Registry id `malt_syrup`.

Blurb (`src/data/sugars.ts`): Sugar made from sprouted grain.

Shown (5 of 5):

- malt syrup
- barley malt syrup
- barley malt extract
- malt extract
- malted barley extract

#### Fruit juice concentrate

Anchor `#juice-concentrate`. Heading links to /ingredients/juice-concentrate. Registry id `juice_concentrate`.

Blurb (`src/data/sugars.ts`): Juice boiled down to its sugar.

Shown (5 of 5):

- fruit juice concentrate
- juice concentrate
- concentrated fruit juice
- concentrated juice
- fruit juice concentrates

Also any "[fruit] juice concentrate" or "concentrated [fruit] juice".

#### Isomaltooligosaccharides (IMO)

Anchor `#isomaltooligosaccharides`. Heading links to /ingredients/isomaltooligosaccharides. Registry id `imo`.

No blurb in `src/data/sugars.ts`. The page prints the registry note: Often sold as a fiber; counted here as added sugar.

Shown (5 of 5):

- isomaltooligosaccharide
- isomaltooligosaccharides
- isomalto-oligosaccharide
- isomalto-oligosaccharides
- imo

#### Tagatose

Anchor `#tagatose`. Heading links to /ingredients/tagatose. Registry id `tagatose`.

No blurb in `src/data/sugars.ts`. The page prints the registry note: A rare sugar that FDA still counts as added sugar.

Shown (2 of 2):

- tagatose
- d-tagatose

#### Isomaltulose

Anchor `#isomaltulose`. Heading links to /ingredients/isomaltulose. Registry id `isomaltulose`.

No blurb in `src/data/sugars.ts`. The page prints the registry note: A rare sugar that FDA still counts as added sugar.

Shown (2 of 2):

- isomaltulose
- palatinose


### Not on this list

Heading: **Not on this list**

- Sugar that comes with whole foods, like milk (/ingredients/milk), fruit (/ingredients/fruit) and single-strength juice (/ingredients/fruit-or-vegetable-juice). Allowed in CLEAN.
- Juice from concentrate (/ingredients/juice-from-concentrate) and fruit puree concentrate (/ingredients/fruit-puree-concentrate). Added sugar only when they sweeten another food.
- Sweeteners that aren't sugar. Sucralose (/ingredients/sucralose) is BAD. Erythritol (/ingredients/erythritol) and stevia (/ingredients/stevia) are OKAY.
- Maltodextrin (/ingredients/maltodextrin), a nonsweet starch polymer.

Sources disclosure, summary **Sources (4)**, full citation form from `src/components/Sources.astro`:

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Nutrition and Supplement Facts Labels: Questions and Answers Related to the Compliance Date, Added Sugars, and Declaration of Quantitative Amounts of Vitamins and Minerals, U.S. Food and Drug Administration.](https://www.fda.gov/media/117402/download)
- [Guidance for Industry: Ingredients Declared as Evaporated Cane Juice (May 2016), U.S. Food and Drug Administration.](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-ingredients-declared-evaporated-cane-juice)
- [Sugars That Are Metabolized Differently Than Traditional Sugars (2020), Federal Register.](https://www.federalregister.gov/documents/2020/10/19/2020-22900/sugars-that-are-metabolized-differently-than-traditional-sugars)

Provenance, inside that disclosure: From the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3. Names are matched exactly as whole ingredients. The full rules (/how-it-works).

Closing `ScanCta` (default copy): heading **Point it at a label.** Text **Open the scanner, photograph the ingredient list, get one verdict.** Button **Scan a label** → https://app.sugardepth.com. Decorative `/brand/cube-scanning.webp`.

## Ingredient guides index

Path: `/ingredients`. Source: `src/pages/ingredients/index.astro`. Card order is registry order, then alias guides. Styles: `src/styles/brief.css`.

**Title:** Ingredient guides: every sugar, sweetener and label name Sugar Depth knows

**Meta description:** All 67 ingredients Sugar Depth knows, from added sugars to artificial sweeteners and sugar alcohols, each with its label names and verdict.

**JSON-LD:** Breadcrumbs. Home → Ingredients.

- Breadcrumb: Home / Ingredients
- Kicker: Ingredient guides
- H1: Every sweetener has a stage name.
- Lead: 67 ingredients, each with its label names and its verdict.

Jump nav:

- Added sugar → `#g-added_sugar`
- BAD → `#g-bad`
- OKAY → `#g-okay`
- Depends → `#g-depends`
- CLEAN, sounds sweet → `#g-clean_sweet`
- CLEAN, everyday → `#g-clean_plain`

The heading of each group splits on the first colon. The part before the colon takes the group tone color. Cards show the guide name, a pill with `verdict.word`, and the card tag (`summary` from the MDX file when there is one, otherwise `tagFor()` in `src/data/ingredients.ts`).

### Added sugar: the grams decide

Anchor `#g-added_sugar`. Nav label **Added sugar**. Tone: no verdict color. 19 cards.

Over 4 g of added sugar per serving, or grams that can't be read, is BAD. 4 g or less is OKAY.

| Name | Pill | Card tag | URL |
|---|---|---|---|
| Sugar | BAD or OKAY | 78 label names | /ingredients/sugar |
| Dextrose | BAD or OKAY | 11 label names | /ingredients/dextrose |
| Fructose | BAD or OKAY | 7 label names | /ingredients/fructose |
| Maltose | BAD or OKAY | 2 label names | /ingredients/maltose |
| Trehalose | BAD or OKAY | 1 label name | /ingredients/trehalose |
| Galactose | BAD or OKAY | 1 label name | /ingredients/galactose |
| Lactose (added) | BAD or OKAY | 1 label name | /ingredients/lactose |
| Honey | BAD or OKAY | 13 label names | /ingredients/honey |
| Maple syrup | BAD or OKAY | 2 label names | /ingredients/maple-syrup |
| Agave syrup | BAD or OKAY | 6 label names | /ingredients/agave-syrup |
| Corn syrup | BAD or OKAY | 14 label names | /ingredients/corn-syrup |
| High fructose corn syrup | BAD or OKAY | 16 label names | /ingredients/high-fructose-corn-syrup |
| Rice syrup | BAD or OKAY | 9 label names | /ingredients/rice-syrup |
| Malt syrup | BAD or OKAY | 5 label names | /ingredients/malt-syrup |
| Fruit juice concentrate | BAD or OKAY | Added sugar when it sweetens | /ingredients/juice-concentrate |
| Isomaltooligosaccharides (IMO) | BAD or OKAY | 5 label names | /ingredients/isomaltooligosaccharides |
| Tagatose | BAD or OKAY | Rare sugar, 2 label names | /ingredients/tagatose |
| Isomaltulose | BAD or OKAY | Rare sugar, 2 label names | /ingredients/isomaltulose |
| Evaporated cane juice | BAD or OKAY | Not juice, just sugar | /ingredients/evaporated-cane-juice |

### BAD: artificial sweeteners and alcohol

Anchor `#g-bad`. Nav label **BAD**. Tone: red (class ugly). 10 cards.

One of these on the label is enough.

| Name | Pill | Card tag | URL |
|---|---|---|---|
| Sucralose | BAD | Artificial sweetener, sold as Splenda | /ingredients/sucralose |
| Aspartame | BAD | Artificial sweetener in NutraSweet, Equal | /ingredients/aspartame |
| Acesulfame K | BAD | Artificial sweetener, also called Ace-K | /ingredients/acesulfame-k |
| Saccharin | BAD | Artificial sweetener, E954 | /ingredients/saccharin |
| Cyclamate | BAD | Artificial sweetener, E952 | /ingredients/cyclamate |
| Neotame | BAD | Artificial sweetener, E961 | /ingredients/neotame |
| Advantame | BAD | Artificial sweetener, E969 | /ingredients/advantame |
| Aspartame-acesulfame salt | BAD | Artificial sweetener, E962 | /ingredients/aspartame-acesulfame-salt |
| Neohesperidin DC | BAD | Artificial sweetener, E959 | /ingredients/neohesperidin-dc |
| Alcohol | BAD | Drinking alcohol | /ingredients/alcohol |

### OKAY: sugar alcohols, allulose and plant sweeteners

Anchor `#g-okay`. Nav label **OKAY**. Tone: amber (class bad). 12 cards.

Not counted as sugar on US labels, but there to sweeten.

| Name | Pill | Card tag | URL |
|---|---|---|---|
| Allulose | OKAY | Rare sugar, left off sugar lines | /ingredients/allulose |
| Stevia | OKAY | Plant sweetener with nearly twenty names | /ingredients/stevia |
| Monk fruit | OKAY | Plant sweetener, also luo han guo | /ingredients/monk-fruit |
| Thaumatin | OKAY | Plant sweetener, E957 | /ingredients/thaumatin |
| Erythritol | OKAY | Sugar alcohol, not drinking alcohol | /ingredients/erythritol |
| Xylitol | OKAY | Sugar alcohol in sugar-free gum | /ingredients/xylitol |
| Sorbitol | OKAY | Sugar alcohol, E420 | /ingredients/sorbitol |
| Mannitol | OKAY | Sugar alcohol, E421 | /ingredients/mannitol |
| Isomalt | OKAY | Sugar alcohol, E953 | /ingredients/isomalt |
| Maltitol | OKAY | Sugar alcohol, E965 | /ingredients/maltitol |
| Lactitol | OKAY | Sugar alcohol, E966 | /ingredients/lactitol |
| Polyglycitol syrup | OKAY | Sugar alcohol, E964 | /ingredients/polyglycitol-syrup |

### Depends on the rest of the label

Anchor `#g-depends`. Nav label **Depends**. Tone: no verdict color. 2 cards.

Added sugar only when it sweetens another food.

| Name | Pill | Card tag | URL |
|---|---|---|---|
| Fruit puree concentrate | Depends | Added sugar when it sweetens | /ingredients/fruit-puree-concentrate |
| Juice from concentrate | Depends | Added sugar when it sweetens | /ingredients/juice-from-concentrate |

### Allowed in CLEAN: sounds sweet, isn't added sugar

Anchor `#g-clean_sweet`. Nav label **CLEAN, sounds sweet**. Tone: green (class clean). 10 cards.

Starches, fibers and whole foods that carry their own sugar.

| Name | Pill | Card tag | URL |
|---|---|---|---|
| Maltodextrin | CLEAN | Sounds like sugar, isn't one | /ingredients/maltodextrin |
| Resistant maltodextrin | CLEAN | Carbohydrate, not sugar | /ingredients/resistant-maltodextrin |
| Added fiber | CLEAN | Carbohydrate, not sugar | /ingredients/added-fiber |
| Starch | CLEAN | Carbohydrate, not sugar | /ingredients/starch |
| Milk | CLEAN | Natural sugar, not added | /ingredients/milk |
| Fruit | CLEAN | Natural sugar, not added | /ingredients/fruit |
| Fruit puree | CLEAN | Natural sugar, not added | /ingredients/fruit-puree |
| Vegetables | CLEAN | Natural sugar, not added | /ingredients/vegetables |
| Malted barley | CLEAN | No sweetening role | /ingredients/malted-barley |
| Fruit or vegetable juice | CLEAN | Natural sugar, not added | /ingredients/fruit-or-vegetable-juice |

### Allowed in CLEAN: everyday ingredients

Anchor `#g-clean_plain`. Nav label **CLEAN, everyday**. Tone: green (class clean). 14 cards.

No sweetening role.

| Name | Pill | Card tag | URL |
|---|---|---|---|
| Water | CLEAN | 24 label names | /ingredients/water |
| Salt | CLEAN | 6 label names | /ingredients/salt |
| Food acids | CLEAN | 16 label names | /ingredients/food-acids |
| Flavors | CLEAN | 37 label names | /ingredients/flavors |
| Thickeners and emulsifiers | CLEAN | 19 label names | /ingredients/thickeners-and-emulsifiers |
| Preservatives | CLEAN | 17 label names | /ingredients/preservatives |
| Vitamins and minerals | CLEAN | 55 label names | /ingredients/vitamins-and-minerals |
| Colors | CLEAN | 15 label names | /ingredients/colors |
| Fats and oils | CLEAN | 17 label names | /ingredients/fats-and-oils |
| Proteins | CLEAN | 28 label names | /ingredients/proteins |
| Grains, nuts and seeds | CLEAN | 46 label names | /ingredients/grains-nuts-and-seeds |
| Spices and seasonings | CLEAN | 39 label names | /ingredients/spices-and-seasonings |
| Cheese, eggs and cultures | CLEAN | 47 label names | /ingredients/cheese-eggs-and-cultures |
| Other additives | CLEAN | 65 label names | /ingredients/other-additives |


Closing line: Every added-sugar name on one page: hidden sugar names (/hidden-sugar-names). The rules: how it works (/how-it-works).

Default `ScanCta`: **Point it at a label.** / **Open the scanner, photograph the ingredient list, get one verdict.** / **Scan a label** → https://app.sugardepth.com.

## Ingredient page template

Source: `src/pages/ingredients/[slug].astro`. One static page per guide from `src/data/guides.ts`. There are 67 paths: 66 registry entries plus `/ingredients/evaporated-cane-juice`.

Shared chrome: header, footer, sticky scan bar, and the meta pattern above. `og:type` is `article`.

**Title tag:** the guide title, plus ` | Sugar Depth` when the title does not already contain "Sugar Depth".

**Meta description and the sentence under the H1** are the same string. With an MDX file, that string is the frontmatter `description`. Without one, it is `answerFor()` in `src/data/ingredients.ts`. The `description` field stored in the generated JSON is not what the page prints.

**JSON-LD:** Article plus breadcrumbs Home → Ingredients → the guide name. Article headline is the guide title (not the suffixed `<title>`). description is the answer sentence. inLanguage en-US. dateModified and datePublished 2026-11-10. image https://sugardepth.com/og/default.png. about is a Thing named with the guide name. author and publisher are the organization. isPartOf is the website id.

### Page sections, in order

1. Breadcrumb: Home / Ingredients / {name}. The current crumb is not a link.
2. H1: the guide name (registry `name`, or the alias guide's `name`).
3. Answer sentence.
4. Facts sheet, accessible name "Sugar Depth verdict".
   - Kicker: Sugar Depth verdict
   - Verdict word (`page.verdict.word`)
   - Verdict label, only when it differs from the word
   - A `.rule-5` divider
   - What it is: `classLabel`
   - US label treatment: `labelingLabel`
5. Body. If the guide has an MDX file, the markdown body. Otherwise the registry `note`, when the entry has one. Entries with neither show no paragraph here.
6. **On labels.**
   - Alias guides add: One of the {parent alias count} names for {parent name, lowercased}. → the parent URL.
   - Names first, then codes. The first 8 of that combined list are visible. The rest are behind a disclosure whose summary is "All N names", "All N related names" on an alias guide, and "and M codes" when there are codes.
   - Patterns, registry pages only: Any "{pattern}", such as {example}
   - If there is at least one code: E numbers are EU codes. US labels usually print the name.
7. **Verdict rules.** Caption: The worst ingredient on a label decides. Columns When, Verdict, Rule. The rule cell is the link text **See the rule** (accessible name "See the rule: {verdict}, {when}") pointing at `/how-it-works#rule-{id}`.
8. **Related.** Up to three guides, then one hub. Name-specific guides for this entry come first, then `related` slugs. Added-sugar entries hub to **All hidden sugar names** (/hidden-sugar-names). Every other entry hubs to **All ingredients** (/ingredients).
9. **Sources (N).** Collapsed. Each item is "{title}, {publisher}." linking to the source URL. Then: Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.
10. Disclaimer: Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.
11. Default scan call to action, as on the index.

### How to change an ingredient page

- Names, class, label treatment, codes, patterns, outcomes, and the verdict word come from the scanner registry. Regenerate `src/data/ingredients.generated.json` with `npm run ingredients` at the repo root. Do not edit the JSON by hand.
- The answer sentence and card tag for a page with no MDX file are `answerFor()` and `tagFor()` in `src/data/ingredients.ts`.
- A hand-written guide is `src/content/ingredients/<slug>.mdx` with `entry` set to the registry id. `title`, `description`, and `summary` replace the title, the answer, and the index card tag. The body replaces the registry note. `casing` only changes capitalization of registry aliases or codes. `related` is placed before registry neighbours and the list is cut at six. `sources` are printed before the registry's own sources. `order` controls the footer and `/llms.txt` (hand-written guides only).
- An alias guide uses a different file name, and must set `name` and `aliases`. Those aliases must already belong to `entry`.

## Every ingredient page

### Sugar

URL: `/ingredients/sugar`. Registry id `sugar`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Sugar on food labels: added sugar under 78 names | Sugar Depth
- **Meta description and answer:** Sugar is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 78 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

No guide body and no registry note.

**On labels**


Shown:

- sugar
- cane sugar
- raw cane sugar
- evaporated cane sugar
- beet sugar
- granulated sugar
- white sugar
- brown sugar

Disclosure summary: **All 78 names**

- brown sugar syrup
- light brown sugar
- dark brown sugar
- raw sugar
- turbinado sugar
- turbinado
- demerara sugar
- demerara
- muscovado sugar
- muscovado
- powdered sugar
- confectioners sugar
- confectioner's sugar
- icing sugar
- caster sugar
- sucrose
- cane juice
- evaporated cane juice
- dried cane syrup
- cane syrup
- cane juice crystals
- rapadura
- panela
- jaggery
- sucanat
- sugar syrup
- simple syrup
- liquid sugar
- invert sugar
- invert cane sugar
- invert syrup
- invert sugar syrup
- coconut sugar
- coconut palm sugar
- palm sugar
- date sugar
- maple sugar
- golden syrup
- treacle
- molasses
- blackstrap molasses
- cane molasses
- caramel
- burnt sugar
- suiker
- rietsuiker
- kristalsuiker
- basterdsuiker
- sucre
- sucre de canne
- sucre roux
- sucre de canne roux
- zucker
- rohrzucker
- rohrohrzucker
- azucar
- azucar de cana
- azucar moreno
- zucchero
- zucchero di canna
- acucar
- acucar de cana
- cukier
- cukier trzcinowy
- socker
- sukker
- sokeri
- saccharose
- sacarosa
- saccarosio

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Evaporated cane juice](/ingredients/evaporated-cane-juice)
- [Dextrose](/ingredients/dextrose)
- [Fructose](/ingredients/fructose)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Dextrose

URL: `/ingredients/dextrose`. Registry id `dextrose`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Dextrose on food labels: added sugar under 11 names | Sugar Depth
- **Meta description and answer:** Dextrose is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 11 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

No guide body and no registry note.

**On labels**


Shown:

- dextrose
- dextrose monohydrate
- anhydrous dextrose
- glucose
- grape sugar
- dextrosa
- destrosio
- glucosa

Disclosure summary: **All 11 names**

- glucosio
- traubenzucker
- druivensuiker

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Fructose](/ingredients/fructose)
- [Maltose](/ingredients/maltose)
- [Trehalose](/ingredients/trehalose)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Fructose

URL: `/ingredients/fructose`. Registry id `fructose`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Fructose on food labels: added sugar under 7 names | Sugar Depth
- **Meta description and answer:** Fructose is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 7 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

No guide body and no registry note.

**On labels**


Shown:

- fructose
- crystalline fructose
- fruit sugar
- fructosa
- fruttosio
- fruchtzucker
- vruchtensuiker

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Maltose](/ingredients/maltose)
- [Trehalose](/ingredients/trehalose)
- [Galactose](/ingredients/galactose)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Maltose

URL: `/ingredients/maltose`. Registry id `maltose`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Maltose on food labels: added sugar under 2 names | Sugar Depth
- **Meta description and answer:** Maltose is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 2 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

No guide body and no registry note.

**On labels**


Shown:

- maltose
- malt sugar

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Trehalose](/ingredients/trehalose)
- [Galactose](/ingredients/galactose)
- [Lactose (added)](/ingredients/lactose)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Trehalose

URL: `/ingredients/trehalose`. Registry id `trehalose`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Trehalose on food labels: added sugar | Sugar Depth
- **Meta description and answer:** Trehalose is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 1 label name
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

No guide body and no registry note.

**On labels**


Shown:

- trehalose

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Galactose](/ingredients/galactose)
- [Lactose (added)](/ingredients/lactose)
- [Honey](/ingredients/honey)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Galactose

URL: `/ingredients/galactose`. Registry id `galactose`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Galactose on food labels: added sugar | Sugar Depth
- **Meta description and answer:** Galactose is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 1 label name
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

No guide body and no registry note.

**On labels**


Shown:

- galactose

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Lactose (added)](/ingredients/lactose)
- [Honey](/ingredients/honey)
- [Maple syrup](/ingredients/maple-syrup)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Lactose (added)

URL: `/ingredients/lactose`. Registry id `lactose_added`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Lactose (added) on food labels: added sugar | Sugar Depth
- **Meta description and answer:** Lactose listed on its own is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 1 label name
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

Registry note (shown, because there is no guide): Lactose listed as its own ingredient is added sugar (FDA). Lactose that comes with milk is not.

**On labels**


Shown:

- lactose

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Honey](/ingredients/honey)
- [Maple syrup](/ingredients/maple-syrup)
- [Agave syrup](/ingredients/agave-syrup)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Nutrition and Supplement Facts Labels: Questions and Answers Related to the Compliance Date, Added Sugars, and Declaration of Quantitative Amounts of Vitamins and Minerals, U.S. Food and Drug Administration.](https://www.fda.gov/media/117402/download)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Honey

URL: `/ingredients/honey`. Registry id `honey`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Honey on food labels: added sugar under 13 names | Sugar Depth
- **Meta description and answer:** Honey is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 13 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

No guide body and no registry note.

**On labels**


Shown:

- honey
- raw honey
- clover honey
- wildflower honey
- manuka honey
- honey powder
- dried honey
- miel

Disclosure summary: **All 13 names**

- honig
- honing
- miele
- mel
- miod

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Maple syrup](/ingredients/maple-syrup)
- [Agave syrup](/ingredients/agave-syrup)
- [Corn syrup](/ingredients/corn-syrup)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Maple syrup

URL: `/ingredients/maple-syrup`. Registry id `maple_syrup`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Maple syrup on food labels: added sugar under 2 names | Sugar Depth
- **Meta description and answer:** Maple syrup is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 2 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

No guide body and no registry note.

**On labels**


Shown:

- maple syrup
- pure maple syrup

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Agave syrup](/ingredients/agave-syrup)
- [Corn syrup](/ingredients/corn-syrup)
- [High fructose corn syrup](/ingredients/high-fructose-corn-syrup)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Agave syrup

URL: `/ingredients/agave-syrup`. Registry id `agave`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Agave syrup on food labels: added sugar under 6 names | Sugar Depth
- **Meta description and answer:** Agave syrup is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 6 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

No guide body and no registry note.

**On labels**


Shown:

- agave
- agave syrup
- agave nectar
- blue agave
- blue agave syrup
- agave inulin syrup

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Corn syrup](/ingredients/corn-syrup)
- [High fructose corn syrup](/ingredients/high-fructose-corn-syrup)
- [Rice syrup](/ingredients/rice-syrup)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Corn syrup

URL: `/ingredients/corn-syrup`. Registry id `corn_syrup`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Corn syrup on food labels: added sugar under 14 names | Sugar Depth
- **Meta description and answer:** Corn syrup is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 14 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

No guide body and no registry note.

**On labels**


Shown:

- corn syrup
- corn syrup solids
- glucose syrup
- glucose syrup solids
- dried glucose syrup
- corn sweetener
- sirop de glucose
- glukosesirup

Disclosure summary: **All 14 names**

- glucosesirup
- glucosestroop
- jarabe de glucosa
- sciroppo di glucosio
- xarope de glicose
- syrop glukozowy

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [High fructose corn syrup](/ingredients/high-fructose-corn-syrup)
- [Rice syrup](/ingredients/rice-syrup)
- [Malt syrup](/ingredients/malt-syrup)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### High fructose corn syrup

URL: `/ingredients/high-fructose-corn-syrup`. Registry id `hfcs`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** High fructose corn syrup on food labels: added sugar under 16 names | Sugar Depth
- **Meta description and answer:** High fructose corn syrup is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 16 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

No guide body and no registry note.

**On labels**


Shown:

- high fructose corn syrup
- hfcs
- glucose-fructose syrup
- glucose fructose syrup
- glucose-fructose
- fructose syrup
- fructose-glucose syrup
- isoglucose

Disclosure summary: **All 16 names**

- sirop de glucose-fructose
- glukose-fruktose-sirup
- glucose-fructose-sirup
- glucose-fructosestroop
- jarabe de glucosa y fructosa
- jarabe de glucosa-fructosa
- sciroppo di glucosio-fruttosio
- syrop glukozowo-fruktozowy

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Rice syrup](/ingredients/rice-syrup)
- [Malt syrup](/ingredients/malt-syrup)
- [Fruit juice concentrate](/ingredients/juice-concentrate)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Rice syrup

URL: `/ingredients/rice-syrup`. Registry id `rice_syrup`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Rice syrup on food labels: added sugar under 9 names | Sugar Depth
- **Meta description and answer:** Rice syrup is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 9 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

No guide body and no registry note.

**On labels**


Shown:

- rice syrup
- brown rice syrup
- rice malt syrup
- tapioca syrup
- oat syrup
- sorghum syrup
- carob syrup
- date syrup

Disclosure summary: **All 9 names**

- fig syrup

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Malt syrup](/ingredients/malt-syrup)
- [Fruit juice concentrate](/ingredients/juice-concentrate)
- [Isomaltooligosaccharides (IMO)](/ingredients/isomaltooligosaccharides)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Malt syrup

URL: `/ingredients/malt-syrup`. Registry id `malt_syrup`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Malt syrup on food labels: added sugar under 5 names | Sugar Depth
- **Meta description and answer:** Malt syrup is added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 5 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

No guide body and no registry note.

**On labels**


Shown:

- malt syrup
- barley malt syrup
- barley malt extract
- malt extract
- malted barley extract

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Fruit juice concentrate](/ingredients/juice-concentrate)
- [Isomaltooligosaccharides (IMO)](/ingredients/isomaltooligosaccharides)
- [Tagatose](/ingredients/tagatose)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Fruit juice concentrate

URL: `/ingredients/juice-concentrate`. Registry id `juice_concentrate`. Group `added_sugar`. Registry page plus `src/content/ingredients/juice-concentrate.mdx`.

- **Title tag:** Is fruit juice concentrate added sugar? FDA's rule and Sugar Depth's verdict
- **Meta description and answer:** Fruit juice concentrate is added sugar when it sweetens another food, and natural sugar in a product made only of fruit or juice.
- **Index card tag:** Added sugar when it sweetens
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

Guide copy:

- Juice concentrate is fruit or vegetable juice with most of the water removed. What's left is mostly the fruit's sugar.
- FDA's definition of added sugars includes sugars from concentrated fruit or vegetable juices that are in excess of what would be expected from the same volume of 100 percent juice of the same type.
- When it sweetens another food, more than 4 g of added sugar per serving, or grams that can't be read, is BAD, and 4 g or less is OKAY. A product made only of fruit or vegetable juice or puree can be CLEAN.

**On labels**


Shown:

- fruit juice concentrate
- juice concentrate
- concentrated fruit juice
- concentrated juice
- fruit juice concentrates

- Any "[fruit] juice concentrate", such as apple juice concentrate
- Any "concentrated [fruit] juice", such as concentrated white grape juice

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It sweetens another food, with more than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| It sweetens another food, and the grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| It sweetens another food, with 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |
| The product is made only of fruit or vegetable juice or puree (water, acids, vitamins, flavors and similar extras are fine). | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Juice from concentrate](/ingredients/juice-from-concentrate)
- [Fruit puree concentrate](/ingredients/fruit-puree-concentrate)
- [Evaporated cane juice](/ingredients/evaporated-cane-juice)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (2)**

- [Nutrition and Supplement Facts Labels: Questions and Answers Related to the Compliance Date, Added Sugars, and Declaration of Quantitative Amounts of Vitamins and Minerals, U.S. Food and Drug Administration.](https://www.fda.gov/media/117402/download)
- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title, answer, card tag, and bullets in `src/content/ingredients/juice-concentrate.mdx`. Change names, facts, and the verdict table by regenerating the registry.

### Isomaltooligosaccharides (IMO)

URL: `/ingredients/isomaltooligosaccharides`. Registry id `imo`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Isomaltooligosaccharides (IMO) on food labels: added sugar under 5 names | Sugar Depth
- **Meta description and answer:** Isomaltooligosaccharides (IMO) are added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** 5 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

Registry note (shown, because there is no guide): Often sold as a fiber; counted here as added sugar.

**On labels**


Shown:

- isomaltooligosaccharide
- isomaltooligosaccharides
- isomalto-oligosaccharide
- isomalto-oligosaccharides
- imo

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Tagatose](/ingredients/tagatose)
- [Isomaltulose](/ingredients/isomaltulose)
- [Sugar](/ingredients/sugar)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Tagatose

URL: `/ingredients/tagatose`. Registry id `tagatose`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Tagatose on food labels: added sugar under 2 names | Sugar Depth
- **Meta description and answer:** Tagatose is a rare sugar counted as added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** Rare sugar, 2 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Rare sugar
- **US label treatment:** Counted as added sugar

Registry note (shown, because there is no guide): A rare sugar that FDA still counts as added sugar.

**On labels**


Shown:

- tagatose
- d-tagatose

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Isomaltulose](/ingredients/isomaltulose)
- [Sugar](/ingredients/sugar)
- [Dextrose](/ingredients/dextrose)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Sugars That Are Metabolized Differently Than Traditional Sugars (2020), Federal Register.](https://www.federalregister.gov/documents/2020/10/19/2020-22900/sugars-that-are-metabolized-differently-than-traditional-sugars)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Isomaltulose

URL: `/ingredients/isomaltulose`. Registry id `isomaltulose`. Group `added_sugar`. Registry page. No MDX file.

- **Title tag:** Isomaltulose on food labels: added sugar under 2 names | Sugar Depth
- **Meta description and answer:** Isomaltulose is a rare sugar counted as added sugar: BAD on Sugar Depth above 4 g of added sugar per serving, OKAY at 4 g or less.
- **Index card tag:** Rare sugar, 2 label names
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Rare sugar
- **US label treatment:** Counted as added sugar

Registry note (shown, because there is no guide): A rare sugar that FDA still counts as added sugar.

**On labels**


Shown:

- isomaltulose
- palatinose

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Sugar](/ingredients/sugar)
- [Dextrose](/ingredients/dextrose)
- [Fructose](/ingredients/fructose)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Sugars That Are Metabolized Differently Than Traditional Sugars (2020), Federal Register.](https://www.federalregister.gov/documents/2020/10/19/2020-22900/sugars-that-are-metabolized-differently-than-traditional-sugars)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Allulose

URL: `/ingredients/allulose`. Registry id `allulose`. Group `okay`. Registry page plus `src/content/ingredients/allulose.mdx`.

- **Title tag:** Allulose on food labels: the sugar FDA lets labels leave out, and Sugar Depth's verdict
- **Meta description and answer:** Allulose is a rare sugar that labels can leave out of Total and Added Sugars under FDA guidance, and it is OKAY on Sugar Depth.
- **Index card tag:** Rare sugar, left off sugar lines
- **Index pill:** OKAY (amber (class bad))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Rare sugar
- **US label treatment:** Not counted as sugar

Guide copy:

- Allulose is a rare sugar: chemically a sugar, found in small amounts in some foods, and now made for use as a sweetener.
- In its October 2020 guidance, FDA said it intends to use enforcement discretion so manufacturers can leave allulose out of the Total Sugars and Added Sugars lines, pending future rulemaking. It must still be counted in Total Carbohydrate and declared in the ingredient list.
- Allulose is OKAY under Sugar Depth's rules: not an added sugar on the label, but there to sweeten. This is a product preference, not a health claim.

**On labels**


Shown:

- allulose
- D-allulose
- psicose
- D-psicose

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| Nothing on the label earns a stricter verdict. | OKAY | See the rule → /how-it-works#rule-O2 |

**Related**

- [Stevia](/ingredients/stevia)
- [Monk fruit](/ingredients/monk-fruit)
- [Erythritol](/ingredients/erythritol)
- [All ingredients](/ingredients)

**Sources (3)**

- [The Declaration of Allulose and Calories from Allulose on Nutrition and Supplement Facts Labels: Guidance for Industry, U.S. Food and Drug Administration.](https://www.fda.gov/media/123342/download)
- [Sugars That Are Metabolized Differently Than Traditional Sugars (2020), Federal Register.](https://www.federalregister.gov/documents/2020/10/19/2020-22900/sugars-that-are-metabolized-differently-than-traditional-sugars)
- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title, answer, card tag, and bullets in `src/content/ingredients/allulose.mdx`. Change names, facts, and the verdict table by regenerating the registry.

### Sucralose

URL: `/ingredients/sucralose`. Registry id `sucralose`. Group `bad`. Registry page plus `src/content/ingredients/sucralose.mdx`.

- **Title tag:** Sucralose (Splenda, E955) on food labels: what it is and why it's BAD | Sugar Depth
- **Meta description and answer:** Sucralose (Splenda) is an artificial sweetener, not sugar, and any label that lists it is BAD on Sugar Depth.
- **Index card tag:** Artificial sweetener, sold as Splenda
- **Index pill:** BAD (red (class ugly))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Non-sugar sweetener (artificial)
- **US label treatment:** Not counted as sugar

Guide copy:

- Sucralose is an artificial sweetener, sold as Splenda. FDA describes it as about 600 times sweeter than table sugar.
- It is not a sugar, so a drink sweetened only with sucralose can print 0 g Added Sugars. You will only see it in the ingredient list.
- Any artificial sweetener makes a label BAD, however small the amount. That is a product preference, not a safety finding: FDA permits sucralose in food under its conditions of use.

**On labels**


Shown:

- sucralose
- Splenda
- E955 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is listed anywhere in the ingredients. | BAD | See the rule → /how-it-works#rule-X3 |

**Related**

- [Acesulfame K](/ingredients/acesulfame-k)
- [Aspartame](/ingredients/aspartame)
- [Erythritol](/ingredients/erythritol)
- [All ingredients](/ingredients)

**Sources (4)**

- [Aspartame and Other Sweeteners in Food, U.S. Food and Drug Administration.](https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food)
- [21 CFR 101.9 Nutrition labeling of food, Electronic Code of Federal Regulations (eCFR).](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9)
- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title, answer, card tag, and bullets in `src/content/ingredients/sucralose.mdx`. Change names, facts, and the verdict table by regenerating the registry.

### Aspartame

URL: `/ingredients/aspartame`. Registry id `aspartame`. Group `bad`. Registry page plus `src/content/ingredients/aspartame.mdx`.

- **Title tag:** Aspartame (NutraSweet, Equal, E951) on labels and Sugar Depth's verdict
- **Meta description and answer:** Aspartame is an artificial sweetener, not sugar, and any label that lists it is BAD on Sugar Depth.
- **Index card tag:** Artificial sweetener in NutraSweet, Equal
- **Index pill:** BAD (red (class ugly))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Non-sugar sweetener (artificial)
- **US label treatment:** Not counted as sugar

Guide copy:

- Aspartame is an artificial sweetener. FDA describes it as about 200 times sweeter than table sugar. Brand names include NutraSweet, Equal and Sugar Twin.
- People with phenylketonuria (PKU) should avoid or restrict it, so FDA requires labels to say the product contains phenylalanine. If you see that line, aspartame is in the list.
- It is not counted in Total Sugars or Added Sugars. Any artificial sweetener makes a label BAD. This is Sugar Depth's preference about sweeteners, not a medical finding.

**On labels**


Shown:

- aspartame
- E951 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is listed anywhere in the ingredients. | BAD | See the rule → /how-it-works#rule-X3 |

**Related**

- [Acesulfame K](/ingredients/acesulfame-k)
- [Sucralose](/ingredients/sucralose)
- [Saccharin](/ingredients/saccharin)
- [All ingredients](/ingredients)

**Sources (3)**

- [Aspartame and Other Sweeteners in Food, U.S. Food and Drug Administration.](https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food)
- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title, answer, card tag, and bullets in `src/content/ingredients/aspartame.mdx`. Change names, facts, and the verdict table by regenerating the registry.

### Acesulfame K

URL: `/ingredients/acesulfame-k`. Registry id `acesulfame_k`. Group `bad`. Registry page plus `src/content/ingredients/acesulfame-k.mdx`.

- **Title tag:** Acesulfame K (Ace-K, acesulfame potassium, E950): label names and verdict | Sugar Depth
- **Meta description and answer:** Acesulfame K (Ace-K) is an artificial sweetener, not sugar, and any label that lists it is BAD on Sugar Depth.
- **Index card tag:** Artificial sweetener, also called Ace-K
- **Index pill:** BAD (red (class ugly))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Non-sugar sweetener (artificial)
- **US label treatment:** Not counted as sugar

Guide copy:

- Acesulfame potassium is an artificial sweetener. FDA describes it as about 200 times sweeter than table sugar and heat stable. Brand names include Sunett and Sweet One.
- It is not a sugar, so it is not part of Total Sugars or Added Sugars. You find it only in the ingredient list.
- It is often combined with other sweeteners, such as sucralose (/ingredients/sucralose) or aspartame (/ingredients/aspartame). One artificial sweetener is enough to make a label BAD. This is a product preference, not a safety finding.

**On labels**


Shown:

- acesulfame K
- acesulfame-K
- acesulfame potassium
- acesulfame
- Ace-K
- Ace K
- E950 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is listed anywhere in the ingredients. | BAD | See the rule → /how-it-works#rule-X3 |

**Related**

- [Sucralose](/ingredients/sucralose)
- [Aspartame](/ingredients/aspartame)
- [Saccharin](/ingredients/saccharin)
- [All ingredients](/ingredients)

**Sources (3)**

- [Aspartame and Other Sweeteners in Food, U.S. Food and Drug Administration.](https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food)
- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title, answer, card tag, and bullets in `src/content/ingredients/acesulfame-k.mdx`. Change names, facts, and the verdict table by regenerating the registry.

### Saccharin

URL: `/ingredients/saccharin`. Registry id `saccharin`. Group `bad`. Registry page. No MDX file.

- **Title tag:** Saccharin (E954) on food labels: an artificial sweetener, BAD on Sugar Depth
- **Meta description and answer:** Saccharin is an artificial sweetener, not sugar, and any label that lists it is BAD on Sugar Depth.
- **Index card tag:** Artificial sweetener, E954
- **Index pill:** BAD (red (class ugly))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Non-sugar sweetener (artificial)
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- saccharin
- sodium saccharin
- calcium saccharin
- E954 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is listed anywhere in the ingredients. | BAD | See the rule → /how-it-works#rule-X3 |

**Related**

- [Cyclamate](/ingredients/cyclamate)
- [Neotame](/ingredients/neotame)
- [Advantame](/ingredients/advantame)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Cyclamate

URL: `/ingredients/cyclamate`. Registry id `cyclamate`. Group `bad`. Registry page. No MDX file.

- **Title tag:** Cyclamate (E952) on food labels: an artificial sweetener, BAD on Sugar Depth
- **Meta description and answer:** Cyclamate is an artificial sweetener, not sugar, and any label that lists it is BAD on Sugar Depth.
- **Index card tag:** Artificial sweetener, E952
- **Index pill:** BAD (red (class ugly))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Non-sugar sweetener (artificial)
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- cyclamate
- sodium cyclamate
- calcium cyclamate
- E952 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is listed anywhere in the ingredients. | BAD | See the rule → /how-it-works#rule-X3 |

**Related**

- [Neotame](/ingredients/neotame)
- [Advantame](/ingredients/advantame)
- [Aspartame-acesulfame salt](/ingredients/aspartame-acesulfame-salt)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Neotame

URL: `/ingredients/neotame`. Registry id `neotame`. Group `bad`. Registry page. No MDX file.

- **Title tag:** Neotame (E961) on food labels: an artificial sweetener, BAD on Sugar Depth
- **Meta description and answer:** Neotame is an artificial sweetener, not sugar, and any label that lists it is BAD on Sugar Depth.
- **Index card tag:** Artificial sweetener, E961
- **Index pill:** BAD (red (class ugly))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Non-sugar sweetener (artificial)
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- neotame
- E961 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is listed anywhere in the ingredients. | BAD | See the rule → /how-it-works#rule-X3 |

**Related**

- [Advantame](/ingredients/advantame)
- [Aspartame-acesulfame salt](/ingredients/aspartame-acesulfame-salt)
- [Neohesperidin DC](/ingredients/neohesperidin-dc)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Advantame

URL: `/ingredients/advantame`. Registry id `advantame`. Group `bad`. Registry page. No MDX file.

- **Title tag:** Advantame (E969) on food labels: an artificial sweetener, BAD on Sugar Depth
- **Meta description and answer:** Advantame is an artificial sweetener, not sugar, and any label that lists it is BAD on Sugar Depth.
- **Index card tag:** Artificial sweetener, E969
- **Index pill:** BAD (red (class ugly))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Non-sugar sweetener (artificial)
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- advantame
- E969 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is listed anywhere in the ingredients. | BAD | See the rule → /how-it-works#rule-X3 |

**Related**

- [Aspartame-acesulfame salt](/ingredients/aspartame-acesulfame-salt)
- [Neohesperidin DC](/ingredients/neohesperidin-dc)
- [Alcohol](/ingredients/alcohol)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Aspartame-acesulfame salt

URL: `/ingredients/aspartame-acesulfame-salt`. Registry id `aspartame_acesulfame`. Group `bad`. Registry page. No MDX file.

- **Title tag:** Aspartame-acesulfame salt (E962) on food labels: an artificial sweetener, BAD on Sugar Depth
- **Meta description and answer:** Aspartame-acesulfame salt is an artificial sweetener, not sugar, and any label that lists it is BAD on Sugar Depth.
- **Index card tag:** Artificial sweetener, E962
- **Index pill:** BAD (red (class ugly))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Non-sugar sweetener (artificial)
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- aspartame-acesulfame salt
- aspartame acesulfame salt
- E962 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is listed anywhere in the ingredients. | BAD | See the rule → /how-it-works#rule-X3 |

**Related**

- [Neohesperidin DC](/ingredients/neohesperidin-dc)
- [Alcohol](/ingredients/alcohol)
- [Sucralose](/ingredients/sucralose)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Neohesperidin DC

URL: `/ingredients/neohesperidin-dc`. Registry id `nhdc`. Group `bad`. Registry page. No MDX file.

- **Title tag:** Neohesperidin DC (E959) on food labels: an artificial sweetener, BAD on Sugar Depth
- **Meta description and answer:** Neohesperidin DC is an artificial sweetener, not sugar, and any label that lists it is BAD on Sugar Depth.
- **Index card tag:** Artificial sweetener, E959
- **Index pill:** BAD (red (class ugly))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Non-sugar sweetener (artificial)
- **US label treatment:** Not counted as sugar

Registry note (shown, because there is no guide): Chemically modified from citrus; grouped with artificial sweeteners (an assumption in Sugar Depth's rules, not a regulatory class).

**On labels**


Shown:

- neohesperidin dc
- neohesperidine dc
- neohesperidin dihydrochalcone
- nhdc
- E959 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is listed anywhere in the ingredients. | BAD | See the rule → /how-it-works#rule-X3 |

**Related**

- [Alcohol](/ingredients/alcohol)
- [Sucralose](/ingredients/sucralose)
- [Aspartame](/ingredients/aspartame)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Stevia

URL: `/ingredients/stevia`. Registry id `stevia`. Group `okay`. Registry page plus `src/content/ingredients/stevia.mdx`.

- **Title tag:** Stevia and steviol glycosides (Reb A, Reb M, E960) on labels: Sugar Depth's verdict
- **Meta description and answer:** Stevia is a plant sweetener that US labels do not count as sugar, and it is OKAY on Sugar Depth.
- **Index card tag:** Plant sweetener with nearly twenty names
- **Index pill:** OKAY (amber (class bad))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Non-sugar sweetener (plant-derived)
- **US label treatment:** Not counted as sugar

Guide copy:

- Stevia sweeteners are steviol glycosides, such as rebaudioside A (Reb A), taken from the leaves of the stevia plant or made by fermentation. FDA describes them as 200 to 400 times sweeter than table sugar.
- They are not sugars and are not counted in Total Sugars or Added Sugars.
- Plant sweeteners are OKAY: not sugar and not an artificial sweetener, but still a sweetener. Stevia is often blended with erythritol (/ingredients/erythritol). That blend is OKAY too.

**On labels**


Shown:

- stevia
- stevia extract
- stevia leaf extract
- purified stevia leaf extract
- stevia leaf
- stevia rebaudiana
- stevia rebaudiana leaf extract
- steviol glycosides

Disclosure summary: **All 19 names and 5 codes**

- steviol glycoside
- steviol glycosides from stevia
- rebaudioside A
- Reb A
- rebaudioside M
- Reb M
- rebaudioside D
- Reb D
- rebiana
- enzyme modified stevia
- glucosylated steviol glycosides
- E960 (code)
- E960a (code)
- E960b (code)
- E960c (code)
- E960d (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| Nothing on the label earns a stricter verdict. | OKAY | See the rule → /how-it-works#rule-O3 |

**Related**

- [Monk fruit](/ingredients/monk-fruit)
- [Erythritol](/ingredients/erythritol)
- [Allulose](/ingredients/allulose)
- [All ingredients](/ingredients)

**Sources (3)**

- [Aspartame and Other Sweeteners in Food, U.S. Food and Drug Administration.](https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food)
- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title, answer, card tag, and bullets in `src/content/ingredients/stevia.mdx`. Change names, facts, and the verdict table by regenerating the registry.

### Monk fruit

URL: `/ingredients/monk-fruit`. Registry id `monk_fruit`. Group `okay`. Registry page plus `src/content/ingredients/monk-fruit.mdx`.

- **Title tag:** Monk fruit (luo han guo, mogrosides) on food labels and Sugar Depth's verdict
- **Meta description and answer:** Monk fruit is a plant sweetener that US labels do not count as sugar, and it is OKAY on Sugar Depth.
- **Index card tag:** Plant sweetener, also luo han guo
- **Index pill:** OKAY (amber (class bad))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Non-sugar sweetener (plant-derived)
- **US label treatment:** Not counted as sugar

Guide copy:

- Monk fruit sweetener is an extract of the fruit of Siraitia grosvenorii, also called luo han guo. Its sweetness comes mainly from compounds called mogrosides. FDA describes it as 100 to 250 times sweeter than sugar.
- It is not counted in Total Sugars or Added Sugars.
- Plant sweeteners are OKAY. Many "monk fruit sweeteners" sold in bags are mostly erythritol (/ingredients/erythritol) with a little monk fruit. Erythritol is OKAY too.

**On labels**


Shown:

- monk fruit
- monk fruit extract
- monkfruit
- monkfruit extract
- monk fruit sweetener
- luo han guo
- luo han guo extract
- luo han guo fruit extract

Disclosure summary: **All 15 names**

- lo han guo
- Siraitia grosvenorii
- Siraitia grosvenorii fruit extract
- mogroside
- mogrosides
- mogroside V
- swingle fruit extract

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| Nothing on the label earns a stricter verdict. | OKAY | See the rule → /how-it-works#rule-O3 |

**Related**

- [Stevia](/ingredients/stevia)
- [Erythritol](/ingredients/erythritol)
- [Allulose](/ingredients/allulose)
- [All ingredients](/ingredients)

**Sources (2)**

- [Aspartame and Other Sweeteners in Food, U.S. Food and Drug Administration.](https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food)
- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title, answer, card tag, and bullets in `src/content/ingredients/monk-fruit.mdx`. Change names, facts, and the verdict table by regenerating the registry.

### Thaumatin

URL: `/ingredients/thaumatin`. Registry id `thaumatin`. Group `okay`. Registry page. No MDX file.

- **Title tag:** Thaumatin (E957) on food labels: a plant sweetener, OKAY on Sugar Depth
- **Meta description and answer:** Thaumatin is a plant sweetener that US labels do not count as sugar, and it is OKAY on Sugar Depth.
- **Index card tag:** Plant sweetener, E957
- **Index pill:** OKAY (amber (class bad))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Non-sugar sweetener (plant-derived)
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- thaumatin
- E957 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| Nothing on the label earns a stricter verdict. | OKAY | See the rule → /how-it-works#rule-O3 |

**Related**

- [Erythritol](/ingredients/erythritol)
- [Xylitol](/ingredients/xylitol)
- [Sorbitol](/ingredients/sorbitol)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Erythritol

URL: `/ingredients/erythritol`. Registry id `erythritol`. Group `okay`. Registry page plus `src/content/ingredients/erythritol.mdx`.

- **Title tag:** Erythritol (E968) on labels: a sugar alcohol, and why Sugar Depth calls it OKAY
- **Meta description and answer:** Erythritol is a sugar alcohol that US labels do not count as sugar, and it is OKAY on Sugar Depth.
- **Index card tag:** Sugar alcohol, not drinking alcohol
- **Index pill:** OKAY (amber (class bad))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Sugar alcohol (polyol). Not drinking alcohol.
- **US label treatment:** Not counted as sugar

Guide copy:

- Erythritol is a sugar alcohol. It is not the alcohol in beer or wine. It is common in "zero sugar" and "keto" products, often blended with stevia (/ingredients/stevia) or monk fruit (/ingredients/monk-fruit).
- Sugar alcohols are not counted in Total Sugars or Added Sugars. A "Sugar alcohol" line on the panel is voluntary, but required when the label makes a claim about sugar alcohol, total sugars or added sugars and sugar alcohols are present (21 CFR 101.9(c)(6)(iv)).
- Sugar Depth treats every sugar alcohol as OKAY. This is a product preference, not a safety finding. FDA permits erythritol.

**On labels**


Shown:

- erythritol
- non-GMO erythritol
- E968 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| Nothing on the label earns a stricter verdict. | OKAY | See the rule → /how-it-works#rule-O2 |

**Related**

- [Xylitol](/ingredients/xylitol)
- [Stevia](/ingredients/stevia)
- [Monk fruit](/ingredients/monk-fruit)
- [All ingredients](/ingredients)

**Sources (4)**

- [Aspartame and Other Sweeteners in Food, U.S. Food and Drug Administration.](https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food)
- [21 CFR 101.9 Nutrition labeling of food, Electronic Code of Federal Regulations (eCFR).](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9)
- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title, answer, card tag, and bullets in `src/content/ingredients/erythritol.mdx`. Change names, facts, and the verdict table by regenerating the registry.

### Xylitol

URL: `/ingredients/xylitol`. Registry id `xylitol`. Group `okay`. Registry page plus `src/content/ingredients/xylitol.mdx`.

- **Title tag:** Xylitol (birch xylitol, E967) on food labels and Sugar Depth's verdict
- **Meta description and answer:** Xylitol is a sugar alcohol that US labels do not count as sugar, and it is OKAY on Sugar Depth.
- **Index card tag:** Sugar alcohol in sugar-free gum
- **Index pill:** OKAY (amber (class bad))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Sugar alcohol (polyol). Not drinking alcohol.
- **US label treatment:** Not counted as sugar

Guide copy:

- Xylitol is a sugar alcohol (polyol), used in foods such as sugar-free candies, cookies and chewing gum. "Birch xylitol" names where it was made from, not a different ingredient.
- Like other sugar alcohols, it is not part of Total Sugars or Added Sugars. A label may show it on a voluntary "Sugar alcohol" line (21 CFR 101.9(c)(6)(iv)).
- Sugar Depth puts xylitol and the other sugar alcohols, such as erythritol (/ingredients/erythritol) and sorbitol (/ingredients/sorbitol), in OKAY. This is a product preference, not a medical finding.

**On labels**


Shown:

- xylitol
- birch xylitol
- E967 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| Nothing on the label earns a stricter verdict. | OKAY | See the rule → /how-it-works#rule-O2 |

**Related**

- [Erythritol](/ingredients/erythritol)
- [Sucralose](/ingredients/sucralose)
- [Sorbitol](/ingredients/sorbitol)
- [All ingredients](/ingredients)

**Sources (4)**

- [Aspartame and Other Sweeteners in Food, U.S. Food and Drug Administration.](https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food)
- [21 CFR 101.9 Nutrition labeling of food, Electronic Code of Federal Regulations (eCFR).](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9)
- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title, answer, card tag, and bullets in `src/content/ingredients/xylitol.mdx`. Change names, facts, and the verdict table by regenerating the registry.

### Sorbitol

URL: `/ingredients/sorbitol`. Registry id `sorbitol`. Group `okay`. Registry page. No MDX file.

- **Title tag:** Sorbitol (E420) on food labels: a sugar alcohol, OKAY on Sugar Depth
- **Meta description and answer:** Sorbitol is a sugar alcohol that US labels do not count as sugar, and it is OKAY on Sugar Depth.
- **Index card tag:** Sugar alcohol, E420
- **Index pill:** OKAY (amber (class bad))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Sugar alcohol (polyol). Not drinking alcohol.
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- sorbitol
- sorbitol syrup
- sorbitol solution
- E420 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| Nothing on the label earns a stricter verdict. | OKAY | See the rule → /how-it-works#rule-O2 |

**Related**

- [Mannitol](/ingredients/mannitol)
- [Isomalt](/ingredients/isomalt)
- [Maltitol](/ingredients/maltitol)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Mannitol

URL: `/ingredients/mannitol`. Registry id `mannitol`. Group `okay`. Registry page. No MDX file.

- **Title tag:** Mannitol (E421) on food labels: a sugar alcohol, OKAY on Sugar Depth
- **Meta description and answer:** Mannitol is a sugar alcohol that US labels do not count as sugar, and it is OKAY on Sugar Depth.
- **Index card tag:** Sugar alcohol, E421
- **Index pill:** OKAY (amber (class bad))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Sugar alcohol (polyol). Not drinking alcohol.
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- mannitol
- E421 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| Nothing on the label earns a stricter verdict. | OKAY | See the rule → /how-it-works#rule-O2 |

**Related**

- [Isomalt](/ingredients/isomalt)
- [Maltitol](/ingredients/maltitol)
- [Lactitol](/ingredients/lactitol)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Isomalt

URL: `/ingredients/isomalt`. Registry id `isomalt`. Group `okay`. Registry page. No MDX file.

- **Title tag:** Isomalt (E953) on food labels: a sugar alcohol, OKAY on Sugar Depth
- **Meta description and answer:** Isomalt is a sugar alcohol that US labels do not count as sugar, and it is OKAY on Sugar Depth.
- **Index card tag:** Sugar alcohol, E953
- **Index pill:** OKAY (amber (class bad))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Sugar alcohol (polyol). Not drinking alcohol.
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- isomalt
- E953 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| Nothing on the label earns a stricter verdict. | OKAY | See the rule → /how-it-works#rule-O2 |

**Related**

- [Maltitol](/ingredients/maltitol)
- [Lactitol](/ingredients/lactitol)
- [Polyglycitol syrup](/ingredients/polyglycitol-syrup)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Maltitol

URL: `/ingredients/maltitol`. Registry id `maltitol`. Group `okay`. Registry page. No MDX file.

- **Title tag:** Maltitol (E965) on food labels: a sugar alcohol, OKAY on Sugar Depth
- **Meta description and answer:** Maltitol is a sugar alcohol that US labels do not count as sugar, and it is OKAY on Sugar Depth.
- **Index card tag:** Sugar alcohol, E965
- **Index pill:** OKAY (amber (class bad))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Sugar alcohol (polyol). Not drinking alcohol.
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- maltitol
- maltitol syrup
- E965 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| Nothing on the label earns a stricter verdict. | OKAY | See the rule → /how-it-works#rule-O2 |

**Related**

- [Lactitol](/ingredients/lactitol)
- [Polyglycitol syrup](/ingredients/polyglycitol-syrup)
- [Allulose](/ingredients/allulose)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Lactitol

URL: `/ingredients/lactitol`. Registry id `lactitol`. Group `okay`. Registry page. No MDX file.

- **Title tag:** Lactitol (E966) on food labels: a sugar alcohol, OKAY on Sugar Depth
- **Meta description and answer:** Lactitol is a sugar alcohol that US labels do not count as sugar, and it is OKAY on Sugar Depth.
- **Index card tag:** Sugar alcohol, E966
- **Index pill:** OKAY (amber (class bad))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Sugar alcohol (polyol). Not drinking alcohol.
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- lactitol
- E966 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| Nothing on the label earns a stricter verdict. | OKAY | See the rule → /how-it-works#rule-O2 |

**Related**

- [Polyglycitol syrup](/ingredients/polyglycitol-syrup)
- [Allulose](/ingredients/allulose)
- [Stevia](/ingredients/stevia)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Polyglycitol syrup

URL: `/ingredients/polyglycitol-syrup`. Registry id `polyglycitol`. Group `okay`. Registry page. No MDX file.

- **Title tag:** Polyglycitol syrup (E964) on food labels: a sugar alcohol, OKAY on Sugar Depth
- **Meta description and answer:** Polyglycitol syrup is a sugar alcohol that US labels do not count as sugar, and it is OKAY on Sugar Depth.
- **Index card tag:** Sugar alcohol, E964
- **Index pill:** OKAY (amber (class bad))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Sugar alcohol (polyol). Not drinking alcohol.
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- polyglycitol
- polyglycitol syrup
- hydrogenated starch hydrolysate
- hydrogenated starch hydrolysates
- E964 (code)

E numbers are EU codes. US labels usually print the name.

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| Nothing on the label earns a stricter verdict. | OKAY | See the rule → /how-it-works#rule-O2 |

**Related**

- [Allulose](/ingredients/allulose)
- [Stevia](/ingredients/stevia)
- [Monk fruit](/ingredients/monk-fruit)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969), EUR-Lex, European Union.](https://eur-lex.europa.eu/eli/reg/2008/1333/oj)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Maltodextrin

URL: `/ingredients/maltodextrin`. Registry id `maltodextrin`. Group `clean_sweet`. Registry page plus `src/content/ingredients/maltodextrin.mdx`.

- **Title tag:** Is maltodextrin sugar? What labels say, and why Sugar Depth allows it in CLEAN
- **Meta description and answer:** Maltodextrin is not sugar: it is a nonsweet starch polymer, and Sugar Depth allows it in CLEAN.
- **Index card tag:** Sounds like sugar, isn't one
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Other carbohydrate. Not sugar.
- **US label treatment:** Not counted as sugar

Guide copy:

- Federal regulations define maltodextrin as a nonsweet polymer of glucose units, made by partially breaking down corn, potato or rice starch (21 CFR 184.1444 (https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-184/subpart-B/section-184.1444)). It is a carbohydrate but not a sugar, so it is not counted in Total Sugars or Added Sugars.
- It is not dextrose (/ingredients/dextrose), which is glucose, an added sugar. Resistant maltodextrin (/ingredients/resistant-maltodextrin) is treated by FDA as a dietary fiber.
- A label with maltodextrin and nothing sweet can be CLEAN. Tabletop packets often pair it with sucralose (/ingredients/sucralose), which makes the label BAD.

**On labels**


Shown:

- maltodextrin
- corn maltodextrin
- tapioca maltodextrin
- rice maltodextrin
- potato maltodextrin
- dextrin

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Fruit juice concentrate](/ingredients/juice-concentrate)
- [Evaporated cane juice](/ingredients/evaporated-cane-juice)
- [Allulose](/ingredients/allulose)
- [All ingredients](/ingredients)

**Sources (3)**

- [21 CFR 184.1444 Maltodextrin, Electronic Code of Federal Regulations (eCFR).](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-184/subpart-B/section-184.1444)
- [Questions and Answers on Dietary Fiber, U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/questions-and-answers-dietary-fiber)
- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title, answer, card tag, and bullets in `src/content/ingredients/maltodextrin.mdx`. Change names, facts, and the verdict table by regenerating the registry.

### Resistant maltodextrin

URL: `/ingredients/resistant-maltodextrin`. Registry id `resistant_maltodextrin`. Group `clean_sweet`. Registry page. No MDX file.

- **Title tag:** Resistant maltodextrin on food labels: a carbohydrate, not sugar, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Resistant maltodextrin is a carbohydrate, not sugar, and Sugar Depth allows it in CLEAN.
- **Index card tag:** Carbohydrate, not sugar
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Other carbohydrate. Not sugar.
- **US label treatment:** Not counted as sugar

Registry note (shown, because there is no guide): A fiber (FDA 2018), different from ordinary maltodextrin.

**On labels**


Shown:

- resistant maltodextrin
- resistant dextrin
- soluble corn fiber
- soluble wheat fiber
- wheat dextrin
- resistant wheat dextrin

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Added fiber](/ingredients/added-fiber)
- [Starch](/ingredients/starch)
- [Milk](/ingredients/milk)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Questions and Answers on Dietary Fiber, U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/questions-and-answers-dietary-fiber)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Added fiber

URL: `/ingredients/added-fiber`. Registry id `fiber_other`. Group `clean_sweet`. Registry page. No MDX file.

- **Title tag:** Added fiber on food labels: a carbohydrate, not sugar, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Added fiber is a carbohydrate, not sugar, and Sugar Depth allows it in CLEAN.
- **Index card tag:** Carbohydrate, not sugar
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Other carbohydrate. Not sugar.
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- polydextrose
- inulin
- chicory root fiber
- chicory root inulin
- chicory root extract
- oligofructose
- fructooligosaccharides
- fos

Disclosure summary: **All 22 names**

- galactooligosaccharides
- gos
- acacia fiber
- oat fiber
- psyllium husk
- citrus fiber
- soluble tapioca fiber
- short-chain fructooligosaccharides
- prebiotic fiber
- prebiotic fibre
- sugarcane fiber
- bamboo fiber
- pea fiber
- apple fiber

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Starch](/ingredients/starch)
- [Milk](/ingredients/milk)
- [Fruit](/ingredients/fruit)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Starch

URL: `/ingredients/starch`. Registry id `starch`. Group `clean_sweet`. Registry page. No MDX file.

- **Title tag:** Starch on food labels: a carbohydrate, not sugar, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Starch is a carbohydrate, not sugar, and Sugar Depth allows it in CLEAN.
- **Index card tag:** Carbohydrate, not sugar
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Other carbohydrate. Not sugar.
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- corn starch
- cornstarch
- tapioca starch
- potato starch
- rice starch
- wheat starch
- modified food starch
- modified corn starch

Disclosure summary: **All 12 names**

- modified tapioca starch
- tapioca
- arrowroot
- pea starch

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Milk](/ingredients/milk)
- [Fruit](/ingredients/fruit)
- [Fruit puree](/ingredients/fruit-puree)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Milk

URL: `/ingredients/milk`. Registry id `milk`. Group `clean_sweet`. Registry page. No MDX file.

- **Title tag:** Milk on food labels: natural sugar, not added sugar, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Milk has natural sugar that US labels do not count as added sugar, and Sugar Depth allows it in CLEAN.
- **Index card tag:** Natural sugar, not added
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Naturally occurring sugar (comes with a whole food)
- **US label treatment:** Counted as total sugar only, not as added sugar

Registry note (shown, because there is no guide): Lactose that comes with milk is naturally occurring, not added.

**On labels**


Shown:

- milk
- whole milk
- skim milk
- nonfat milk
- low fat milk
- lowfat milk
- reduced fat milk
- fat free milk

Disclosure summary: **All 76 names**

- cultured milk
- cultured pasteurized milk
- cultured pasteurized grade a milk
- pasteurized milk
- grade a milk
- milk powder
- whole milk powder
- skim milk powder
- nonfat dry milk
- dry milk
- condensed skim milk
- ultra-filtered milk
- ultrafiltered milk
- yogurt
- plain yogurt
- whey
- sweet whey
- whey powder
- buttermilk
- kefir
- goat milk
- skimmed milk
- skimmed milk powder
- semi-skimmed milk
- reduced minerals whey
- part-skim milk
- part skim milk
- pasteurized part-skim milk
- cultured nonfat milk
- cultured skim milk
- cultured whole milk
- cultured lowfat milk
- cultured low fat milk
- cultured reduced fat milk
- nonfat milk powder
- nonfat dry milk powder
- milk solids
- nonfat milk solids
- greek yogurt
- nonfat yogurt
- whole milk yogurt
- sour cream
- cream cheese
- cottage cheese
- lait
- lait ecreme
- lait ecreme en poudre
- lait en poudre
- lait entier
- melk
- magere melk
- melkpoeder
- mageremelkpoeder
- milch
- magermilch
- magermilchpulver
- vollmilchpulver
- milchpulver
- leche
- leche desnatada
- leche en polvo
- leche desnatada en polvo
- latte
- latte scremato
- latte in polvere
- latte scremato in polvere
- leite
- leite em po

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Fruit](/ingredients/fruit)
- [Fruit puree](/ingredients/fruit-puree)
- [Vegetables](/ingredients/vegetables)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Nutrition and Supplement Facts Labels: Questions and Answers Related to the Compliance Date, Added Sugars, and Declaration of Quantitative Amounts of Vitamins and Minerals, U.S. Food and Drug Administration.](https://www.fda.gov/media/117402/download)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Fruit

URL: `/ingredients/fruit`. Registry id `fruit`. Group `clean_sweet`. Registry page. No MDX file.

- **Title tag:** Fruit on food labels: natural sugar, not added sugar, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Fruit has natural sugar that US labels do not count as added sugar, and Sugar Depth allows it in CLEAN.
- **Index card tag:** Natural sugar, not added
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Naturally occurring sugar (comes with a whole food)
- **US label treatment:** Counted as total sugar only, not as added sugar

Registry note (shown, because there is no guide): Whole and dried fruit carry their own sugar. Dried fruit with added sugar lists the sugar separately.

**On labels**


Shown:

- apple
- apples
- banana
- bananas
- strawberries
- strawberry
- blueberries
- blueberry

Disclosure summary: **All 43 names**

- raspberries
- raspberry
- blackberries
- cherries
- cherry
- mango
- pineapple
- peach
- peaches
- pear
- pears
- grapes
- orange
- oranges
- lemon
- lime
- cranberries
- pomegranate
- kiwi
- coconut
- raisins
- dates
- date
- medjool dates
- figs
- dried figs
- prunes
- apricots
- dried apricots
- dried cranberries
- dried fruit
- fruit
- mixed fruit
- currants
- goji berries

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Fruit puree](/ingredients/fruit-puree)
- [Vegetables](/ingredients/vegetables)
- [Malted barley](/ingredients/malted-barley)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Nutrition and Supplement Facts Labels: Questions and Answers Related to the Compliance Date, Added Sugars, and Declaration of Quantitative Amounts of Vitamins and Minerals, U.S. Food and Drug Administration.](https://www.fda.gov/media/117402/download)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Fruit puree

URL: `/ingredients/fruit-puree`. Registry id `fruit_puree`. Group `clean_sweet`. Registry page. No MDX file.

- **Title tag:** Fruit puree on food labels: natural sugar, not added sugar, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Fruit puree has natural sugar that US labels do not count as added sugar, and Sugar Depth allows it in CLEAN.
- **Index card tag:** Natural sugar, not added
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Naturally occurring sugar (comes with a whole food)
- **US label treatment:** Counted as total sugar only, not as added sugar

Registry note (shown, because there is no guide): FDA does not count single-strength fruit puree or paste as added sugar.

**On labels**


Shown:

- fruit puree
- apple puree
- banana puree
- mango puree
- pear puree
- strawberry puree
- peach puree
- pumpkin puree

Disclosure summary: **All 14 names**

- applesauce
- unsweetened applesauce
- date paste
- fig paste
- fruit paste
- fruit powder

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Vegetables](/ingredients/vegetables)
- [Malted barley](/ingredients/malted-barley)
- [Fruit or vegetable juice](/ingredients/fruit-or-vegetable-juice)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Nutrition and Supplement Facts Labels: Questions and Answers Related to the Compliance Date, Added Sugars, and Declaration of Quantitative Amounts of Vitamins and Minerals, U.S. Food and Drug Administration.](https://www.fda.gov/media/117402/download)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Vegetables

URL: `/ingredients/vegetables`. Registry id `vegetable`. Group `clean_sweet`. Registry page. No MDX file.

- **Title tag:** Vegetables on food labels: natural sugar, not added sugar, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Vegetables have natural sugar that US labels do not count as added sugar, and Sugar Depth allows them in CLEAN.
- **Index card tag:** Natural sugar, not added
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Naturally occurring sugar (comes with a whole food)
- **US label treatment:** Counted as total sugar only, not as added sugar

No guide body and no registry note.

**On labels**


Shown:

- carrots
- carrot
- tomatoes
- tomato
- tomato paste
- tomato puree
- sweet potato
- sweet potatoes

Disclosure summary: **All 64 names**

- beets
- pumpkin
- onion
- onions
- garlic
- celery
- spinach
- peppers
- red peppers
- corn
- peas
- potatoes
- potato
- potato flakes
- dehydrated potatoes
- green peppers
- bell peppers
- jalapeno peppers
- chili peppers
- cucumbers
- cucumber
- cabbage
- kale
- broccoli
- cauliflower
- zucchini
- mushrooms
- olives
- black olives
- green olives
- basil
- parsley
- cilantro
- oregano
- thyme
- rosemary
- dill
- mint
- chives
- shallots
- leeks
- horseradish
- ginger
- onion powder
- garlic powder
- dehydrated onion
- dehydrated garlic
- dried onion
- dried garlic
- tomato powder
- diced tomatoes
- crushed tomatoes
- whole peeled tomatoes
- italian tomatoes
- plum tomatoes
- peeled tomatoes

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Malted barley](/ingredients/malted-barley)
- [Fruit or vegetable juice](/ingredients/fruit-or-vegetable-juice)
- [Maltodextrin](/ingredients/maltodextrin)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Fruit puree concentrate

URL: `/ingredients/fruit-puree-concentrate`. Registry id `puree_concentrate`. Group `depends`. Registry page. No MDX file.

- **Title tag:** Fruit puree concentrate on food labels: when it counts as added sugar | Sugar Depth
- **Meta description and answer:** Fruit puree concentrate is added sugar when it sweetens another food, and natural sugar in a product made only of fruit or juice.
- **Index card tag:** Added sugar when it sweetens
- **Index pill:** Depends (no verdict color)
- **Facts label (shown, because it differs from the word):** Depends on the rest of the label
- **What it is:** Depends on how it is used
- **US label treatment:** Depends on how it is used

Registry note (shown, because there is no guide): Counts as added sugar when it sweetens another food; in a product made only of fruit it does not (Sugar Depth decides from the rest of the ingredient list).

**On labels**


Shown:

- fruit puree concentrate
- puree concentrate
- apple puree concentrate
- strawberry puree concentrate
- pear puree concentrate
- banana puree concentrate

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It sweetens another food, with more than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| It sweetens another food, and the grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| It sweetens another food, with 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |
| The product is made only of fruit or vegetable juice or puree (water, acids, vitamins, flavors and similar extras are fine). | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Juice from concentrate](/ingredients/juice-from-concentrate)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Nutrition and Supplement Facts Labels: Questions and Answers Related to the Compliance Date, Added Sugars, and Declaration of Quantitative Amounts of Vitamins and Minerals, U.S. Food and Drug Administration.](https://www.fda.gov/media/117402/download)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Alcohol

URL: `/ingredients/alcohol`. Registry id `drinking_alcohol`. Group `bad`. Registry page. No MDX file.

- **Title tag:** Alcohol on food and drink labels: BAD on Sugar Depth above 0.5% ABV
- **Meta description and answer:** Alcohol makes a label BAD on Sugar Depth unless the label says non-alcoholic or 0.5% ABV or less.
- **Index card tag:** Drinking alcohol
- **Index pill:** BAD (red (class ugly))
- **Facts label:** same as the word, so it is not shown again.
- **What it is:** Drinking alcohol
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- alcohol
- ethanol
- ethyl alcohol
- beer
- wine
- red wine
- white wine
- rum

Disclosure summary: **All 20 names**

- vodka
- whiskey
- whisky
- bourbon
- brandy
- gin
- tequila
- sake
- liqueur
- malt beverage
- cider
- hard cider

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| The label has no "0.5% ABV or less" or non-alcoholic statement. | BAD | See the rule → /how-it-works#rule-X4 |
| The label says non-alcoholic or 0.5% ABV or less. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Sucralose](/ingredients/sucralose)
- [Aspartame](/ingredients/aspartame)
- [Acesulfame K](/ingredients/acesulfame-k)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Water

URL: `/ingredients/water`. Registry id `water`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Water on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Water has no sweetening role, and Sugar Depth allows it in CLEAN.
- **Index card tag:** 24 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- water
- filtered water
- purified water
- carbonated water
- sparkling water
- spring water
- mineral water
- coconut water

Disclosure summary: **All 24 names**

- vapor distilled water
- distilled water
- reverse osmosis water
- purified carbonated water
- carbonated filtered water
- carbonated purified water
- sparkling mineral water
- natural mineral water
- natural spring water
- artesian water
- alkaline water
- carbonated mineral water
- ice
- carbon dioxide
- carbonation
- nitrogen

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Salt](/ingredients/salt)
- [Food acids](/ingredients/food-acids)
- [Flavors](/ingredients/flavors)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Salt

URL: `/ingredients/salt`. Registry id `salt`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Salt on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Salt has no sweetening role, and Sugar Depth allows it in CLEAN.
- **Index card tag:** 6 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- salt
- sea salt
- kosher salt
- himalayan pink salt
- pink salt
- iodized salt

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Food acids](/ingredients/food-acids)
- [Flavors](/ingredients/flavors)
- [Thickeners and emulsifiers](/ingredients/thickeners-and-emulsifiers)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Food acids

URL: `/ingredients/food-acids`. Registry id `acids`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Food acids on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Food acids have no sweetening role, and Sugar Depth allows them in CLEAN.
- **Index card tag:** 16 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- citric acid
- malic acid
- lactic acid
- tartaric acid
- phosphoric acid
- fumaric acid
- ascorbic acid
- acetic acid

Disclosure summary: **All 16 names**

- vinegar
- apple cider vinegar
- distilled vinegar
- white vinegar
- wine vinegar
- red wine vinegar
- rice vinegar
- balsamic vinegar

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Flavors](/ingredients/flavors)
- [Thickeners and emulsifiers](/ingredients/thickeners-and-emulsifiers)
- [Preservatives](/ingredients/preservatives)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Flavors

URL: `/ingredients/flavors`. Registry id `flavors`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Flavors on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Flavors have no sweetening role, and Sugar Depth allows them in CLEAN.
- **Index card tag:** 37 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- natural flavor
- natural flavors
- natural flavour
- natural flavours
- artificial flavor
- artificial flavors
- flavor
- flavors

Disclosure summary: **All 37 names**

- flavoring
- natural flavoring
- natural and artificial flavors
- natural and artificial flavor
- naturally essenced
- natural essence
- natural essences
- other natural flavors
- vanilla flavor
- natural vanilla flavor
- natural vanilla flavor with other natural flavors
- vanilla extract
- vanilla
- vanilla bean
- cinnamon
- spices
- spice
- herbs
- cocoa
- cocoa powder
- cocoa butter
- cacao
- unsweetened chocolate
- chocolate liquor
- coffee
- tea
- green tea
- black tea
- caffeine

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Thickeners and emulsifiers](/ingredients/thickeners-and-emulsifiers)
- [Preservatives](/ingredients/preservatives)
- [Vitamins and minerals](/ingredients/vitamins-and-minerals)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Thickeners and emulsifiers

URL: `/ingredients/thickeners-and-emulsifiers`. Registry id `gums`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Thickeners and emulsifiers on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Thickeners and emulsifiers have no sweetening role, and Sugar Depth allows them in CLEAN.
- **Index card tag:** 19 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- xanthan gum
- guar gum
- gellan gum
- gum arabic
- acacia gum
- locust bean gum
- carrageenan
- pectin

Disclosure summary: **All 19 names**

- agar
- gelatin
- cellulose
- cellulose gum
- microcrystalline cellulose
- methylcellulose
- lecithin
- soy lecithin
- sunflower lecithin
- mono and diglycerides
- mono- and diglycerides

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Preservatives](/ingredients/preservatives)
- [Vitamins and minerals](/ingredients/vitamins-and-minerals)
- [Colors](/ingredients/colors)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Preservatives

URL: `/ingredients/preservatives`. Registry id `preservatives`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Preservatives on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Preservatives have no sweetening role, and Sugar Depth allows them in CLEAN.
- **Index card tag:** 17 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- potassium sorbate
- potassium benzoate
- sodium phosphate
- disodium phosphate
- calcium chloride
- calcium lactate
- d-alpha-tocopherol
- calcium disodium edta

Disclosure summary: **All 17 names**

- edta
- sodium benzoate
- calcium propionate
- sorbic acid
- rosemary extract
- tocopherols
- mixed tocopherols
- vitamin e
- nisin

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Vitamins and minerals](/ingredients/vitamins-and-minerals)
- [Colors](/ingredients/colors)
- [Fats and oils](/ingredients/fats-and-oils)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Vitamins and minerals

URL: `/ingredients/vitamins-and-minerals`. Registry id `minerals_vitamins`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Vitamins and minerals on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Vitamins and minerals have no sweetening role, and Sugar Depth allows them in CLEAN.
- **Index card tag:** 55 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- calcium carbonate
- tricalcium phosphate
- calcium phosphate
- dipotassium phosphate
- potassium citrate
- sodium citrate
- magnesium citrate
- sodium bicarbonate

Disclosure summary: **All 55 names**

- baking soda
- baking powder
- potassium chloride
- magnesium oxide
- zinc oxide
- reduced iron
- iron
- ferrous sulfate
- niacin
- niacinamide
- thiamine
- thiamine mononitrate
- riboflavin
- folic acid
- vitamin a
- vitamin a palmitate
- vitamin c
- vitamin d
- vitamin d2
- vitamin d3
- vitamin b6
- vitamin b12
- pyridoxine hydrochloride
- cyanocobalamin
- biotin
- zinc
- calcium
- potassium
- magnesium
- sodium
- magnesium chloride
- potassium bicarbonate
- electrolytes
- electrolyte sources
- monopotassium phosphate
- tripotassium phosphate
- magnesium lactate
- potassium phosphate
- zinc gluconate
- calcium pantothenate
- d-calcium pantothenate
- ferric orthophosphate
- thiamin mononitrate
- vitamin b1
- vitamin b2
- vitamin b3
- vitamin b5

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Colors](/ingredients/colors)
- [Fats and oils](/ingredients/fats-and-oils)
- [Proteins](/ingredients/proteins)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Colors

URL: `/ingredients/colors`. Registry id `colors`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Colors on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Colors have no sweetening role, and Sugar Depth allows them in CLEAN.
- **Index card tag:** 15 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- caramel color
- annatto
- turmeric
- paprika
- paprika extract
- beta carotene
- beet juice color
- vegetable juice color

Disclosure summary: **All 15 names**

- fruit and vegetable juice color
- spirulina extract
- titanium dioxide
- red 40
- yellow 5
- yellow 6
- blue 1

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Fats and oils](/ingredients/fats-and-oils)
- [Proteins](/ingredients/proteins)
- [Grains, nuts and seeds](/ingredients/grains-nuts-and-seeds)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Fats and oils

URL: `/ingredients/fats-and-oils`. Registry id `fats`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Fats and oils on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Fats and oils have no sweetening role, and Sugar Depth allows them in CLEAN.
- **Index card tag:** 17 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- olive oil
- extra virgin olive oil
- canola oil
- sunflower oil
- high oleic sunflower oil
- safflower oil
- palm oil
- palm kernel oil

Disclosure summary: **All 17 names**

- coconut oil
- vegetable oil
- soybean oil
- avocado oil
- butter
- cream
- heavy cream
- ghee
- shortening

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Proteins](/ingredients/proteins)
- [Grains, nuts and seeds](/ingredients/grains-nuts-and-seeds)
- [Spices and seasonings](/ingredients/spices-and-seasonings)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Proteins

URL: `/ingredients/proteins`. Registry id `proteins`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Proteins on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Proteins have no sweetening role, and Sugar Depth allows them in CLEAN.
- **Index card tag:** 28 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- egg
- eggs
- egg whites
- egg yolks
- whey protein isolate
- whey protein concentrate
- milk protein concentrate
- milk protein isolate

Disclosure summary: **All 28 names**

- casein
- sodium caseinate
- soy protein isolate
- pea protein
- pea protein isolate
- rice protein
- collagen
- cheese
- cheddar cheese
- cultures
- live and active cultures
- live cultures
- live active cultures
- active cultures
- live active yogurt cultures
- yogurt cultures
- enzymes
- rennet
- yeast
- nutritional yeast

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Grains, nuts and seeds](/ingredients/grains-nuts-and-seeds)
- [Spices and seasonings](/ingredients/spices-and-seasonings)
- [Cheese, eggs and cultures](/ingredients/cheese-eggs-and-cultures)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Grains, nuts and seeds

URL: `/ingredients/grains-nuts-and-seeds`. Registry id `grains_nuts`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Grains, nuts and seeds on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Grains, nuts and seeds have no sweetening role, and Sugar Depth allows them in CLEAN.
- **Index card tag:** 46 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- oats
- rolled oats
- whole grain oats
- whole grain rolled oats
- oat flour
- milled corn
- wheat flour
- enriched flour

Disclosure summary: **All 46 names**

- enriched wheat flour
- whole wheat flour
- whole grain wheat
- bleached flour
- unbleached flour
- rice
- brown rice
- rice flour
- brown rice flour
- corn flour
- cornmeal
- quinoa
- barley
- rye
- wheat
- hops
- almonds
- almond butter
- almond flour
- peanuts
- peanut butter
- cashews
- cashew butter
- walnuts
- pecans
- hazelnuts
- pistachios
- sunflower seeds
- pumpkin seeds
- chia seeds
- flax seeds
- flaxseed
- sesame seeds
- hemp seeds
- soybeans
- chickpeas
- black beans
- lentils

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Spices and seasonings](/ingredients/spices-and-seasonings)
- [Cheese, eggs and cultures](/ingredients/cheese-eggs-and-cultures)
- [Other additives](/ingredients/other-additives)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Spices and seasonings

URL: `/ingredients/spices-and-seasonings`. Registry id `seasonings`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Spices and seasonings on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Spices and seasonings have no sweetening role, and Sugar Depth allows them in CLEAN.
- **Index card tag:** 39 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- black pepper
- white pepper
- ground black pepper
- cracked black pepper
- red pepper
- red pepper flakes
- crushed red pepper
- cayenne pepper

Disclosure summary: **All 39 names**

- chili powder
- cumin
- coriander
- nutmeg
- cloves
- allspice
- cardamom
- mustard
- mustard seed
- mustard flour
- celery seed
- fennel
- bay leaves
- sage
- smoked paprika
- spice extracts
- spice and spice extracts
- spices and spice extracts
- natural spices
- dried herbs
- herbs and spices
- yeast extract
- autolyzed yeast extract
- soy sauce
- tamari
- disodium guanylate
- disodium inosinate
- monosodium glutamate
- msg
- smoke flavor
- natural smoke flavor

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Cheese, eggs and cultures](/ingredients/cheese-eggs-and-cultures)
- [Other additives](/ingredients/other-additives)
- [Water](/ingredients/water)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Cheese, eggs and cultures

URL: `/ingredients/cheese-eggs-and-cultures`. Registry id `dairy_proteins`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Cheese, eggs and cultures on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Cheese, eggs and cultures have no sweetening role, and Sugar Depth allows them in CLEAN.
- **Index card tag:** 47 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- cheese cultures
- bacterial cultures
- probiotic cultures
- parmesan cheese
- romano cheese
- mozzarella cheese
- swiss cheese
- cheddar

Disclosure summary: **All 47 names**

- aged cheddar cheese
- blue cheese
- feta cheese
- goat cheese
- microbial enzymes
- microbial rennet
- animal rennet
- enzyme modified egg yolks
- egg yolk
- whole eggs
- whole egg
- liquid egg whites
- dried egg whites
- chicken eggs
- free-range eggs
- cage-free eggs
- large eggs
- whey protein
- milk protein
- soy protein
- beef
- chicken
- pork
- turkey
- tuna
- salmon
- anchovies
- gelatin capsules
- l-theanine
- theanine
- taurine
- inositol
- l-carnitine
- l-carnitine l-tartrate
- glucuronolactone
- d-glucuronolactone
- creatine
- creatine monohydrate
- electrolyte blend

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Other additives](/ingredients/other-additives)
- [Water](/ingredients/water)
- [Salt](/ingredients/salt)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Other additives

URL: `/ingredients/other-additives`. Registry id `additives`. Group `clean_plain`. Registry page. No MDX file.

- **Title tag:** Other additives on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Other additives have no sweetening role, and Sugar Depth allows them in CLEAN.
- **Index card tag:** 65 label names
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

No guide body and no registry note.

**On labels**


Shown:

- modified cornstarch
- carob bean gum
- fruit pectin
- sodium alginate
- alginate
- konjac
- konjac gum
- tara gum

Disclosure summary: **All 65 names**

- thickener
- stabilizer
- emulsifier
- polysorbate 80
- calcium silicate
- silicon dioxide
- anticaking agent
- sodium hexametaphosphate
- sodium sorbate
- calcium sorbate
- sodium nitrite
- sodium erythorbate
- potassium lactate
- sodium diacetate
- sodium acid pyrophosphate
- monocalcium phosphate
- sodium aluminum phosphate
- ammonium bicarbonate
- glycerol ester of rosin
- ester gum
- gum acacia
- sucrose acetate isobutyrate
- brominated vegetable oil
- vitamin e acetate
- dl-alpha tocopheryl acetate
- tocopheryl acetate
- beta-carotene
- manganese citrate
- sodium selenate
- magnesium malate
- chromium picolinate
- pyridoxine
- vitamin b6 hydrochloride
- zinc citrate
- calcium citrate
- potassium sorbate and sodium benzoate
- cocoa processed with alkali
- alkalized cocoa
- dutch processed cocoa
- cocoa powder processed with alkali
- natural cocoa
- cocoa nibs
- cacao nibs
- cacao butter
- guarana extract
- guarana seed extract
- panax ginseng extract
- ginseng extract
- green tea extract
- coffee extract
- decaffeinated coffee
- brewed coffee
- brewed tea
- brewed green tea
- brewed black tea
- matcha
- yerba mate

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Water](/ingredients/water)
- [Salt](/ingredients/salt)
- [Food acids](/ingredients/food-acids)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Malted barley

URL: `/ingredients/malted-barley`. Registry id `malted_barley`. Group `clean_sweet`. Registry page. No MDX file.

- **Title tag:** Malted barley on food labels: no sweetening role, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Malted barley has no sweetening role, and Sugar Depth allows it in CLEAN.
- **Index card tag:** No sweetening role
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Common ingredient with no sweetening role
- **US label treatment:** Not counted as sugar

Registry note (shown, because there is no guide): The brewing grain, not a sugar. Malt syrup and malt extract made from it are added sugar.

**On labels**


Shown:

- malted barley
- barley malt

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Fruit or vegetable juice](/ingredients/fruit-or-vegetable-juice)
- [Maltodextrin](/ingredients/maltodextrin)
- [Resistant maltodextrin](/ingredients/resistant-maltodextrin)
- [All ingredients](/ingredients)

**Sources (1)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Juice from concentrate

URL: `/ingredients/juice-from-concentrate`. Registry id `juice_from_concentrate`. Group `depends`. Registry page. No MDX file.

- **Title tag:** Juice from concentrate on food labels: when it counts as added sugar | Sugar Depth
- **Meta description and answer:** Juice from concentrate is added sugar when it sweetens another food, and natural sugar in a product made only of fruit or juice.
- **Index card tag:** Added sugar when it sweetens
- **Index pill:** Depends (no verdict color)
- **Facts label (shown, because it differs from the word):** Depends on the rest of the label
- **What it is:** Depends on how it is used
- **US label treatment:** Depends on how it is used

Registry note (shown, because there is no guide): Reconstituted to normal strength it is not added sugar; used to sweeten another food it is (Sugar Depth decides from the rest of the ingredient list).

**On labels**


- Any "[fruit] juice from concentrate", such as apple juice from concentrate

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It sweetens another food, with more than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| It sweetens another food, and the grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| It sweetens another food, with 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |
| The product is made only of fruit or vegetable juice or puree (water, acids, vitamins, flavors and similar extras are fine). | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Fruit puree concentrate](/ingredients/fruit-puree-concentrate)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Nutrition and Supplement Facts Labels: Questions and Answers Related to the Compliance Date, Added Sugars, and Declaration of Quantitative Amounts of Vitamins and Minerals, U.S. Food and Drug Administration.](https://www.fda.gov/media/117402/download)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Fruit or vegetable juice

URL: `/ingredients/fruit-or-vegetable-juice`. Registry id `single_strength_juice`. Group `clean_sweet`. Registry page. No MDX file.

- **Title tag:** Fruit or vegetable juice on food labels: natural sugar, not added sugar, allowed in CLEAN | Sugar Depth
- **Meta description and answer:** Fruit or vegetable juice has natural sugar that US labels do not count as added sugar, and Sugar Depth allows it in CLEAN.
- **Index card tag:** Natural sugar, not added
- **Index pill:** CLEAN (green (class clean))
- **Facts label (shown, because it differs from the word):** Allowed in CLEAN
- **What it is:** Naturally occurring sugar (comes with a whole food)
- **US label treatment:** Counted as total sugar only, not as added sugar

Registry note (shown, because there is no guide): FDA does not count single-strength juice as added sugar.

**On labels**


- Any "[fruit] juice", such as apple juice
- Any "[fruit] juice not from concentrate", such as orange juice not from concentrate

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| It is on a complete ingredient list with no added sugar, sweetener or alcohol. | CLEAN | See the rule → /how-it-works#rule-C1 |

**Related**

- [Maltodextrin](/ingredients/maltodextrin)
- [Resistant maltodextrin](/ingredients/resistant-maltodextrin)
- [Added fiber](/ingredients/added-fiber)
- [All ingredients](/ingredients)

**Sources (2)**

- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [Nutrition and Supplement Facts Labels: Questions and Answers Related to the Compliance Date, Added Sugars, and Declaration of Quantitative Amounts of Vitamins and Minerals, U.S. Food and Drug Administration.](https://www.fda.gov/media/117402/download)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title in the generated registry. Change the answer and the card tag in `answerFor()` / `tagFor()` (`src/data/ingredients.ts`). Change names, facts, and the verdict table by regenerating the registry.

### Evaporated cane juice

URL: `/ingredients/evaporated-cane-juice`. Registry id `sugar`. Group `added_sugar`. Alias guide in `src/content/ingredients/evaporated-cane-juice.mdx`, entry `sugar`.

- **Title tag:** Evaporated cane juice is sugar: FDA's guidance and other cane sugar names | Sugar Depth
- **Meta description and answer:** Evaporated cane juice is sugar: FDA says it should be labeled as sugar, and Sugar Depth counts it as added sugar.
- **Index card tag:** Not juice, just sugar
- **Index pill:** BAD or OKAY (no verdict color)
- **Facts label (shown, because it differs from the word):** Added sugar: the grams per serving decide
- **What it is:** Added sugar
- **US label treatment:** Counted as added sugar

Guide copy:

- "Evaporated cane juice" is a sweetener made from sugar cane: the cane juice is evaporated and crystallized.
- In its May 2016 guidance, FDA said the term is not the common or usual name of any type of sweetener and that such ingredients should be labeled as "sugar". The guidance is nonbinding, so you may still see the old name.
- Evaporated cane juice? That's sugar. More than 4 g of added sugar per serving, or grams that can't be read, is BAD, and 4 g or less is OKAY.

**On labels**

One of the 78 names for [sugar](/ingredients/sugar).

Shown:

- evaporated cane juice
- cane juice
- cane juice crystals
- dried cane syrup
- cane syrup
- evaporated cane sugar
- raw cane sugar
- cane sugar

Disclosure summary: **All 15 related names**

- rapadura
- panela
- jaggery
- sucanat
- turbinado
- demerara
- muscovado

**Verdict rules.** Caption: The worst ingredient on a label decides.

| When | Verdict | Link |
|---|---|---|
| More than 4 g of added sugar per serving. | BAD | See the rule → /how-it-works#rule-X1 |
| Grams of added sugar per serving can't be read, or are printed only per 100 g or 100 ml. | BAD | See the rule → /how-it-works#rule-X2 |
| 4 g or less of added sugar per serving, including a printed 0 g. | OKAY | See the rule → /how-it-works#rule-O1 |

**Related**

- [Sugar](/ingredients/sugar)
- [Fruit juice concentrate](/ingredients/juice-concentrate)
- [Maltodextrin](/ingredients/maltodextrin)
- [All hidden sugar names](/hidden-sugar-names)

**Sources (2)**

- [Guidance for Industry: Ingredients Declared as Evaporated Cane Juice (May 2016), U.S. Food and Drug Administration.](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-ingredients-declared-evaporated-cane-juice)
- [Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)), U.S. Food and Drug Administration.](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)

Names, class and rules from the Sugar Depth ingredient registry registry-2026.11.10b and rules-v3.

Verdicts are product preferences, not medical advice. Sugar Depth does not check allergens.

Closing call to action: Point it at a label. Open the scanner, photograph the ingredient list, get one verdict. Scan a label → https://app.sugardepth.com.

Change the title, answer, card tag, and bullets in `src/content/ingredients/evaporated-cane-juice.mdx`. The facts panel and verdict table still come from registry entry `sugar`.


## FAQ

Path: `/faq`. Source: `src/pages/faq.astro`. Questions and answers: `src/data/faq.ts` only. There is no FAQPage JSON-LD, on purpose. Styles: `src/styles/brief-pages.css`. Each answer is HTML inserted with `set:html`.

**Title:** Sugar Depth FAQ: short answers on verdicts, sweeteners and privacy

**Meta description:** Short answers about Sugar Depth: barcodes, 0 g sugar labels, stevia, fruit and milk sugar, maltodextrin, allergens, photo privacy and wrong verdicts.

**JSON-LD:** Breadcrumbs. Home → FAQ.

- Breadcrumb: Home / FAQ
- H1: Questions, answered plainly.

Each `h2` id is the `id` field. Prose `h2` elements have a 1px rule above them. The first one has that rule removed.

### What is Sugar Depth?

id `what`. A food-label scanner. Photograph an ingredient list and get one verdict on added sugar and sweeteners: CLEAN, OKAY or BAD.

### Does it scan barcodes?

id `barcode`. No, it reads the ingredient list printed on the package. There is no product database.

### Why isn't a 0 g sugar label CLEAN?

id `zero-grams`. Because sweeteners aren't sugar, and US labels may round under 0.5 g down to 0 g. An artificial sweetener like sucralose (/ingredients/sucralose) is BAD; a listed added sugar printed as 0 g is OKAY.

### How much added sugar is OKAY?

id `little`. 4 g or less per serving. More than 4 g is BAD, and so is added sugar whose grams per serving can't be read.

### Why is stevia OKAY, not CLEAN?

id `stevia`. Because it's still a sweetener. Stevia (/ingredients/stevia), monk fruit (/ingredients/monk-fruit), thaumatin (/ingredients/thaumatin), allulose (/ingredients/allulose) and sugar alcohols like erythritol (/ingredients/erythritol) are OKAY: not added sugar, but added for sweetness.

### Does sugar from fruit or milk count?

id `fruit`. No, sugar that comes with milk, yogurt, fruit, single-strength juice or fruit puree is allowed in CLEAN. Juice concentrate (/ingredients/juice-concentrate) and lactose listed as its own ingredient are added sugar.

### Is maltodextrin sugar?

id `maltodextrin`. No, maltodextrin (/ingredients/maltodextrin) is a nonsweet starch polymer under federal rules, and it's allowed in CLEAN.

### Is this medical advice?

id `medical`. No, the verdicts are Sugar Depth's preferences about sweeteners, not medical or safety findings. Ask a clinician about your own diet.

### Does it check allergens?

id `allergens`. No, it only looks for sugars and sweeteners. Always check the label yourself for allergens.

### What happens to my photo?

id `photos`. It goes to Sugar Depth's backend and to AI services that read the label text and return a verdict. The privacy policy (/privacy) says what is kept and for how long.

### I got a wrong verdict. What now?

id `wrong`. Email a photo of the ingredient list (/contact) and the verdict you got. Missing ingredient names get added to the registry.

Closing `ScanCta`: heading **Point it at a label.** Text **One photo. One word.** Button **Scan a label** → https://app.sugardepth.com.

Change a question only in `src/data/faq.ts`.

## About

Path: `/about`. Source: `src/pages/about.astro`. Styles: `src/styles/brief-pages.css`.

**Title:** About Sugar Depth and Martian Dynamics

**Meta description:** Sugar Depth is a food-label scanner made by Martian Dynamics LLC in Leander, Texas. Its mission, what it does not claim, and its sources.

**JSON-LD:** Organization (same object as the home page) and breadcrumbs Home → About.

### Page head

Crystal swarm, accent. Breadcrumb: Home / About.

- H1: About Sugar Depth
- Voice (the mission): Sugar has a lot of aliases. We read every one.
- Lead: Sugar Depth is a food-label scanner made by Martian Dynamics LLC in Leander, Texas.

### Why it exists

Sugar goes by dozens of names on labels, and sweeteners that aren't sugar can sit behind a "0 g sugar" panel. We read the fine print and name each one. No scores, no lectures: what you eat is your call.

### What it does not claim

- Not medical or nutrition advice.
- Verdicts are preferences, not safety findings.
- No allergen checks, calorie counts or product database.

The full rules are on how it works (/how-it-works).

Sources disclosure, summary **Sources (9)**:

- [FDA: Changes to the Nutrition Facts Label](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label)
- [FDA: Added sugars questions and answers](https://www.fda.gov/media/117402/download)
- [FDA: Allulose labeling guidance](https://www.fda.gov/media/123342/download)
- [Federal Register: Sugars metabolized differently (2020)](https://www.federalregister.gov/documents/2020/10/19/2020-22900/sugars-that-are-metabolized-differently-than-traditional-sugars)
- [eCFR: 21 CFR 184.1444 Maltodextrin](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-184/subpart-B/section-184.1444)
- [FDA: Questions and answers on dietary fiber](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/questions-and-answers-dietary-fiber)
- [eCFR: 21 CFR 101.9 Nutrition labeling of food](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9)
- [FDA: Aspartame and other sweeteners in food](https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food)
- [FDA: Evaporated cane juice guidance (2016)](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-ingredients-declared-evaporated-cane-juice)

### Company

Martian Dynamics LLC

Leander, Texas, United States

support@sugardepth.com → mailto:support@sugardepth.com

Change the prose in `about.astro`. The mission line is `src/data/mission.ts`. The company lines are `ORG` in `src/config.ts`.

## Contact

Path: `/contact`. Source: `src/pages/contact.astro`. No swarm. The sheet is inline-limited to 560px.

**Title:** Contact Sugar Depth

**Meta description:** Email Sugar Depth (Martian Dynamics LLC, Leander, Texas) about a wrong verdict, a missing sugar name, privacy or anything else.

**JSON-LD:** Breadcrumbs. Home → Contact.

- Breadcrumb: Home / Contact
- Kicker: Contact
- H1: Found a sugar we missed?
- Lead: Email us about a wrong verdict, a missing ingredient name, a privacy request or a press question.

Sheet:

- Button: **Email support@sugardepth.com** → mailto:support@sugardepth.com?subject=Sugar%20Depth
- Note: Reporting a verdict? Include a photo of the ingredient list and the verdict you got. Please don't send medical information.

Under the sheet: Martian Dynamics LLC, Leander, Texas.

## Privacy policy

Path: `/privacy`. Source: `src/pages/privacy.astro`. No sticky scan bar. Effective date is the constant `EFFECTIVE` in that file.

**Title:** Privacy policy | Sugar Depth

**Meta description:** How Sugar Depth handles your data: Google sign-in, guest scans, label photos that are never stored, the AI services that read them, analytics cookies, retention, deletion and your privacy rights.

**JSON-LD:** Breadcrumbs. Home → Privacy policy.

- Breadcrumb: Home / Privacy policy
- Kicker: Legal
- H1: Privacy policy
- Lead: Effective November 10, 2026

Section headings are `h2` with a 1px top rule. `h3` has no rule of its own. Email links are mailto:support@sugardepth.com with the visible address support@sugardepth.com. The words `openid`, `email`, `profile`, and `_ga` are in `<code>`.

### Who we are

Sugar Depth is the food-label scanner at app.sugardepth.com and this website, sugardepth.com. Both are operated by Martian Dynamics LLC, based in Leander, Texas, United States ("we", "us"). Questions about this policy go to support@sugardepth.com.

### What we collect

**Your Google sign-in profile**

Signing in is done with Google. We ask Google only for your basic profile, using the `openid`, `email` and `profile` permissions. That gives us your name, email address, profile picture and Google account ID. We can't see your Gmail, contacts, files or anything else in your Google account.

On our servers we keep your sign-in record: those profile details, plus when you signed up and when you last signed in. The display name and settings you choose inside the app are saved on your device, not on our servers.

**If you try the scanner without signing in**

The scanner may offer a few free scans (three by default) before it asks you to sign in. If you use one, your first scan creates a guest account on our servers. It holds a random ID and a placeholder email address that we generate. It doesn't hold your name or your real email address.

Guest scans are read the same way as any other scan, as described next. If you sign in with Google afterwards, that sign-in replaces the guest session in your browser.

**Label photos and the text in them**

The scanner uses your camera only when you open it to photograph a label. Each photo goes to our backend, which passes it to the two AI services listed below. They read the ingredient text and decide the verdict. The photo is then discarded. We never save label photos to our database, file storage or logs.

The ingredient text and verdict come back to your device, and your scan history is kept there. We don't keep copies of your scan history on our servers.

Please photograph only the label. If a photo shows a person or other personal details, it is processed the same way.

**Usage and technical data**

- To enforce the daily scan limit, we keep a counter tied to your account. Old counters are deleted regularly; they hold only a count and a date.
- Guest scans are counted against the guest account's ID, so the free scans can't be used twice. These records hold that ID and no other details about you.
- To limit how many guest accounts can be started from one network in an hour, starting one adds to an hourly counter for your IP address. The counter stores a keyed hash (HMAC-SHA256) of the address, not the address itself.
- Our backend logs record technical details of each scan, such as the outcome, which rule decided it and any errors. The app also sends timing for each scan (how long each step took, the photo's size in pixels and kilobytes, your platform and connection type) so we can make scans faster. These logs never include the photo.
- Our hosting providers keep standard request logs, such as IP address, browser type, time and page requested, for security and troubleshooting.
- Google Analytics records how this website and the web scanner are used. The details are under "Cookies and analytics" below.

### How we use it

We use this information to sign you in, read your labels and return verdicts, enforce fair-use limits, see how the website and scanner are used, keep the service secure and answer your messages. We don't use it for advertising and we don't build profiles about you.

### Who processes your data

- **Supabase** hosts our backend in the United States (AWS us-east-1). That includes sign-in, your account record, guest accounts, the scan-limit counters and the functions that handle each scan.
- **Anthropic** (Claude) reads the ingredient text from your photo. Under Anthropic's commercial terms, data sent through its API isn't used to train its models and is deleted within 30 days, unless Anthropic must keep it longer for safety or legal reasons.
- **TypeSafe AI** (its Jev model) also looks at your photo to make the CLEAN, OKAY or BAD call. TypeSafe says it doesn't train its models on this data. It processes data in the United States and keeps it only as long as reasonably necessary to provide its service.
- **Google** provides sign-in. It also provides Google Analytics, which measures how this website and the web scanner are used.
- **Vercel** hosts this website and the web version of the scanner.

Each provider handles data under its own terms and privacy policy.

### We don't sell your data

We don't sell your personal information. We don't share it for cross-context behavioral advertising. We don't use it for targeted advertising.

### Cookies and analytics

This website and the web scanner load a Google tag that runs Google Analytics, so we can see how they are used. It loads with every page and sets cookies whose names start with `_ga`. The cookies hold a random ID that lets Google Analytics tell one browser's visits from another's. They don't hold your name or email address.

Google Analytics records things like the address and title of each page you open, how far you scroll, links you follow to other sites and whether you start filling in a form. It also receives general details about your browser and device, such as screen size, language, browser version and operating system, and, as with any web request, your IP address. Read Google's privacy policy (https://policies.google.com/privacy).

The home page has a box where you can paste an ingredient list. That text is checked in your browser and isn't sent to us or to Google Analytics. Analytics can record that the box was used, but not what you typed.

Nothing on this website or in the scanner depends on Google Analytics. Both work the same if your browser blocks it.

To keep you signed in, the scanner stores a session token in your browser's local storage. Signing out removes it. A guest session is stored the same way. It stays until you sign in with Google, which replaces it, or clear the scanner's site data in your browser.

### How long we keep it

- **Label photos:** not kept by us. They are discarded once the verdict is returned. The AI providers' own retention is described above.
- **Sign-in record:** kept until you delete your account.
- **Scan-limit counter:** about two days.
- **Guest accounts and guest scan counts:** not deleted automatically. They stay on our servers until we remove them.
- **Guest sign-up counter (hashed IP address):** removed by the same regular cleanup as the scan-limit counter, which deletes counters more than two days old.
- **Analytics cookies:** they stay in your browser until they expire, which can be more than a year, or until you clear them. The usage data itself is held by Google Analytics, not on our servers.
- **Logs:** kept for a limited time on our providers' standard schedules, then deleted.

### Deleting your account

You can delete your account at any time from the scanner's menu. This permanently deletes your sign-in record from our servers and clears the scan history on your device.

You can also email support@sugardepth.com from the address on your account. We'll delete your account within 30 days and confirm when it's done.

A guest session has no profile screen, so a guest account can't be deleted from the scanner. Clearing the scanner's site data in your browser removes the guest session from your device. The guest account on our servers stays until we remove it.

### Children

Sugar Depth is not for children under 13, and we don't knowingly collect information from them. If you believe a child under 13 has created an account, email us and we'll delete it.

### Your privacy rights

Depending on where you live, you may have the right to:

- know what personal information we have about you, and get a copy of it
- correct it
- delete it
- opt out of its sale, sharing or use for targeted advertising (we don't do any of these)

Laws that grant these rights include the California Consumer Privacy Act and the Texas Data Privacy and Security Act. We honor these requests from every user, wherever you live.

To make a request, email support@sugardepth.com. We may ask you to confirm the request from the email address on your account. We'll respond within 45 days. If we decline a request, you can appeal by replying to our answer, and we'll respond to your appeal within 60 days. We won't treat you differently for exercising these rights.

### Security

Data travels over encrypted connections (HTTPS). Access to our backend is limited to what each part of the service needs. No system is perfectly secure, but we work to protect your information and keep only what we need.

### Health information

Sugar Depth doesn't ask for health information. Please don't send it to us. Our verdicts are not medical advice.

### Changes

If we change this policy, we'll post the new version here and update the effective date. If a change materially affects how we use your information, we'll also give notice, for example in the app or by email.

### Contact

Martian Dynamics LLC, Leander, Texas · support@sugardepth.com

Change this page in `src/pages/privacy.astro`. The effective date is `EFFECTIVE` at the top of that file. Company name, city, and email come from `ORG`.

## Terms of use

Path: `/terms`. Source: `src/pages/terms.astro`. No sticky scan bar.

**Title:** Terms of use | Sugar Depth

**Meta description:** Terms of use for Sugar Depth: what the verdicts mean, informational use only, your account, acceptable use, intellectual property, warranty disclaimer, liability and Texas law.

**JSON-LD:** Breadcrumbs. Home → Terms of use.

- Breadcrumb: Home / Terms of use
- Kicker: Legal
- H1: Terms of use
- Lead: Effective November 10, 2026

Opening paragraph: These terms apply to Sugar Depth: the food-label scanner at app.sugardepth.com and this website, sugardepth.com. Sugar Depth is provided by Martian Dynamics LLC, of Leander, Texas ("we", "us"). By using Sugar Depth you agree to these terms and to our privacy policy (/privacy). If you don't agree, please don't use it.

### Who can use it

You must be at least 13 years old to use Sugar Depth. If you're under 18, you need a parent or guardian's permission.

### What Sugar Depth is

Sugar Depth reads the ingredient list in a photo of a food label and returns a verdict of CLEAN, OKAY or BAD, using the rules published on how it works (/how-it-works). The verdicts reflect Sugar Depth's own standards on added sugars and sweeteners. They are not a government rating, and they are not a judgment of whether a food is safe.

### Informational only: not medical or nutrition advice

Sugar Depth is for general information only. It is not medical, nutritional or dietary advice and doesn't diagnose, treat or prevent any condition. It is not a substitute for advice from a doctor, dietitian or other qualified professional. Sugar Depth doesn't check for allergens. Always read the actual product label before you eat something, especially if you have an allergy, diabetes or another medical condition.

### Label data may be wrong

Sugar Depth uses AI to read photos. It can misread text, miss an ingredient or return the wrong verdict. Manufacturers also change labels, and a photo may be blurry or incomplete. Don't rely on Sugar Depth as your only source of information about what's in a food.

### Price and limits

Sugar Depth is free. To keep it running, each account can scan up to 100 labels a day. We may change or end features or limits. If we ever add paid features, we'll show their prices before you're charged anything.

### Your account

You sign in with Google and are responsible for activity on your account. You can delete your account at any time from the scanner's menu. We may suspend or close accounts that break these terms or put the service at risk.

### Acceptable use

- Use Sugar Depth to photograph food and drink labels.
- Don't upload photos of other people, private information or content you don't have the right to share.
- Don't try to overload, disrupt, reverse engineer or get around the limits or security of the service.
- Don't use automated tools to send scans, or use Sugar Depth to build a competing product or database.
- Don't use Sugar Depth for anything unlawful.

### Your photos

You keep any rights you have in the photos you take. By submitting a photo, you let us and our service providers process it for one purpose: reading the label and returning your verdict. Our privacy policy (/privacy) explains what happens to it.

### Our intellectual property

The Sugar Depth name, logo, characters, design, text, rules and software belong to Martian Dynamics LLC or its licensors and are protected by law. You may share links to our pages and screenshots of your own verdicts. You may not copy, sell or redistribute the service or its content without our written permission.

### Satire and brand names

Sugar Depth uses a satirical voice about ingredients. Brand names, such as Splenda, are mentioned only to describe how ingredients are sold. Their trademarks belong to their owners, and mentioning them doesn't imply any affiliation or endorsement.

### Disclaimer of warranties

Sugar Depth is provided "as is" and "as available." To the fullest extent the law allows, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, accuracy and non-infringement. We don't promise that the service will be uninterrupted or error-free.

### Limitation of liability

To the fullest extent the law allows, Martian Dynamics LLC and its members, employees and service providers are not liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of data or profits, arising from your use of Sugar Depth. Our total liability for any claim related to Sugar Depth is limited to the greater of $100 or the amount you paid us in the 12 months before the claim. Some places don't allow these limits, so they may not all apply to you.

### Indemnity

If you misuse Sugar Depth or break these terms and that leads to a claim against us, you agree to cover our reasonable losses and costs from that claim.

### Governing law and venue

These terms are governed by the laws of the State of Texas, without regard to its conflict-of-law rules. Any dispute will be resolved in the state or federal courts located in Williamson County, Texas. You and we both consent to those courts' jurisdiction.

### Changes

We may update these terms. When we do, we'll post the new version here and change the effective date. If a change is material, we'll also give notice, for example in the app or by email. If you keep using Sugar Depth after a change takes effect, you accept the new terms.

### General

If any part of these terms can't be enforced, the rest still applies. If we don't enforce a term right away, we haven't waived it. These terms and our privacy policy are the whole agreement between you and us about Sugar Depth.

### Contact

Martian Dynamics LLC, Leander, Texas · support@sugardepth.com

Change this page in `src/pages/terms.astro`. The effective date is `EFFECTIVE` in that file.

## 404

Path: `/404`. Source: `src/pages/404.astro`. `noindex` is set, so there is no canonical link and the page is left out of the sitemap.

**Title:** Page not found | Sugar Depth

**Meta description:** This page doesn't exist on Sugar Depth.

- Kicker: 404
- H1: This page is hiding better than sugar.
- Lead: We couldn't find it. Sugar Depth is a food-label scanner that flags added sugar and sweeteners; try one of these instead.

| Card heading | Card text | Target |
|---|---|---|
| Home | What Sugar Depth does. | / |
| How it works | The full rule table. | /how-it-works |
| Hidden sugar names | Every alias we know. | /hidden-sugar-names |
| Ingredient guides | Sweeteners, explained. | /ingredients |

## llms.txt

Path: `/llms.txt`. Source: `src/pages/llms.txt.ts`. Content-Type `text/plain; charset=utf-8`. Not an HTML page, so it has no header, footer, or meta tags. The mission and verdict lines are the same data the HTML pages print.

```
# Sugar Depth

> Sugar Depth is a food-label scanner: photograph an ingredient list and get one verdict, CLEAN, OKAY or BAD, based on added sugars and sweeteners.

Mission: Sugar has a lot of aliases. We read every one.

## What it is

- It reads the ingredient list printed on a package from a photo. No barcodes, no product database.
- Verdicts are Sugar Depth's preferences, not medical advice. It does not check allergens.

## Verdicts

The worst ingredient decides.

- BAD: more than 4 g of added sugar per serving, under any name; added sugar whose grams per serving can't be read; any artificial sweetener: sucralose, aspartame, acesulfame K and others; drinking alcohol above 0.5% ABV.
- OKAY: no BAD trigger, but added sugar at 4 g or less per serving; a sugar alcohol such as erythritol or xylitol, or allulose; a plant sweetener: stevia, monk fruit or thaumatin.
- CLEAN: a complete ingredient list with nothing sweet added; sugar that comes with milk or fruit is fine; maltodextrin and starches are fine.

## Key pages

- [How verdicts work](https://sugardepth.com/how-it-works): the full rule table
- [Hidden sugar names](https://sugardepth.com/hidden-sugar-names): all 180 added-sugar names
- [Ingredients](https://sugardepth.com/ingredients): every ingredient the scanner knows
- [FAQ](https://sugardepth.com/faq): short answers
- [Privacy](https://sugardepth.com/privacy): what happens to photos

## Ingredient guides

- [Sucralose](https://sugardepth.com/ingredients/sucralose)
- [Aspartame](https://sugardepth.com/ingredients/aspartame)
- [Acesulfame K](https://sugardepth.com/ingredients/acesulfame-k)
- [Erythritol](https://sugardepth.com/ingredients/erythritol)
- [Xylitol](https://sugardepth.com/ingredients/xylitol)
- [Stevia](https://sugardepth.com/ingredients/stevia)
- [Monk fruit](https://sugardepth.com/ingredients/monk-fruit)
- [Allulose](https://sugardepth.com/ingredients/allulose)
- [Maltodextrin](https://sugardepth.com/ingredients/maltodextrin)
- [Fruit juice concentrate](https://sugardepth.com/ingredients/juice-concentrate)
- [Evaporated cane juice](https://sugardepth.com/ingredients/evaporated-cane-juice)

```

Change the intro sentences in `llms.txt.ts`. The mission, verdict lines, alias count, and guide list follow the data files.

## robots.txt

Path: `/robots.txt`. Source: `src/pages/robots.txt.ts`.

Each of these agents gets `Allow: /`, then `User-agent: *` also gets `Allow: /`, then the sitemap line:

Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, GPTBot, ClaudeBot, Claude-SearchBot, Google-Extended, Applebot-Extended, Perplexity-User.

Sitemap: https://sugardepth.com/sitemap-index.xml

To opt one agent out, give that agent `Disallow: /` in `robots.txt.ts`.

## Images and media

Paths are under `public/`. `src/components/EditorialImage.astro` can serve `label`, `aliases`, `slabs`, and `specimen` at 800 and 1600 in AVIF and WebP.

| File | Where it is used | Alt or accessible name |
|---|---|---|
| /media/crystal-label-800 and -1600, .avif and .webp | How it works, the figure under the page head | A thick clear glass slab rests over fine print on a cream food package, with a sugar cube beside it. |
| /media/aliases.mp4, aliases.webm, aliases-poster.jpg | Hidden sugar names film | Six names, including evaporated cane juice and brown rice syrup, are each revealed as sugar. |
| /media/crystal-aliases-800 and -1600, .avif and .webp | Fallback inside that film, not rendered while the mp4 and poster exist | Six glass trays hold sugar cubes, golden syrup, brown sugar, pale agave syrup, dark malt syrup and white powder. |
| /media/crystal-slabs-800 and -1600, .avif and .webp | Not referenced by any page | — |
| /media/crystal-specimen-800 and -1600, .avif and .webp | Only if `ScanCta` is called with `graphic`. No page does that. | empty alt when used |
| /brand/cube-scanning.webp | Default `ScanCta` (360×360, empty alt) | decorative |
| /brand/cube-idle.webp, cube-clean.webp, cube-bad.webp, cube-ugly.webp | Not referenced | — |
| /app/camera.webp | Not referenced | — |
| /og/default.png | Default share image on every page | See the share-image text above |
| /favicon.svg, /favicon-32.png, /apple-touch-icon.png | Every HTML page | Letter S on a dark tile |

The crystal swarm canvas (`src/components/CrystalSwarm.astro`, `src/lib/swarm.ts`, `src/styles/swarm.css`) is decoration on the home hero, the home Explore band, How it works, and About. It is `aria-hidden` and has no copy.

## Config, build, and scripts

| File | What it controls |
|---|---|
| astro.config.mjs | site https://sugardepth.com, static output, trailingSlash never, directory format, MDX, sitemap that drops /404 |
| vercel.json | trailingSlash false, cleanUrls false |
| package.json | `dev` astro dev; `build` astro build then scripts/check.mjs; `og` node scripts/og.mjs; `preview` astro preview. Node >= 22.23.4 |
| src/content.config.ts | Collection `ingredients`: MDX in src/content/ingredients. Allowed keys: entry, optional name, optional aliases, title, description, summary, casing, related, sources, order. Any other key fails the build. |
| scripts/sync-ingredients.ts | Writes src/data/ingredients.generated.json. Run from the repo root as `npm run ingredients`. `--check` fails if the file is stale. |
| scripts/ingredient-pages.ts | Builds that JSON from supabase/functions/_shared/ingredients.ts and policy.ts. Verdicts come from running the real rules on a one-ingredient label. |
| scripts/check.mjs | After build: unique titles and descriptions, one h1, canonicals, valid JSON-LD, internal links, robots, sitemap, llms.txt, and the script allow-list. |
| scripts/og.mjs | Rewrites the share image and favicons. Not part of `build`. |
| src/lib/tryIt.ts | Home-page sample labels and the in-browser checker. Imports the scanner rules directly. |
| src/lib/swarm.ts | Crystal canvas. No network. |

Slug overrides in `scripts/ingredient-pages.ts`: `juice_concentrate` → `juice-concentrate`, `lactose_added` → `lactose`, `imo` → `isomaltooligosaccharides`. Every other slug is the name lowercased, with non-alphanumerics turned into hyphens.

## Source catalog

Full citations live in `src/data/sources.ts`. Ingredient pages and Hidden sugar names print "{title}, {publisher}." `SourcesBrief` (About and How it works) prints the short name and puts the full citation in the link's `title` attribute.

| Key | Short label | Full title | Publisher | URL |
|---|---|---|---|---|
| addedSugarsRule | FDA: Changes to the Nutrition Facts Label | Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii)) | U.S. Food and Drug Administration | https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label |
| addedSugarsQA | FDA: Added sugars questions and answers | Nutrition and Supplement Facts Labels: Questions and Answers Related to the Compliance Date, Added Sugars, and Declaration of Quantitative Amounts of Vitamins and Minerals | U.S. Food and Drug Administration | https://www.fda.gov/media/117402/download |
| allulose | FDA: Allulose labeling guidance | The Declaration of Allulose and Calories from Allulose on Nutrition and Supplement Facts Labels: Guidance for Industry | U.S. Food and Drug Administration | https://www.fda.gov/media/123342/download |
| rareSugars | Federal Register: Sugars metabolized differently (2020) | Sugars That Are Metabolized Differently Than Traditional Sugars (2020) | Federal Register | https://www.federalregister.gov/documents/2020/10/19/2020-22900/sugars-that-are-metabolized-differently-than-traditional-sugars |
| maltodextrin | eCFR: 21 CFR 184.1444 Maltodextrin | 21 CFR 184.1444 Maltodextrin | Electronic Code of Federal Regulations (eCFR) | https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-184/subpart-B/section-184.1444 |
| fiber | FDA: Questions and answers on dietary fiber | Questions and Answers on Dietary Fiber | U.S. Food and Drug Administration | https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/questions-and-answers-dietary-fiber |
| sweeteners | FDA: Aspartame and other sweeteners in food | Aspartame and Other Sweeteners in Food | U.S. Food and Drug Administration | https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food |
| ecj | FDA: Evaporated cane juice guidance (2016) | Guidance for Industry: Ingredients Declared as Evaporated Cane Juice (May 2016) | U.S. Food and Drug Administration | https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-ingredients-declared-evaporated-cane-juice |
| nutritionLabel | eCFR: 21 CFR 101.9 Nutrition labeling of food | 21 CFR 101.9 Nutrition labeling of food | Electronic Code of Federal Regulations (eCFR) | https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9 |
| euAdditives | EUR-Lex: Regulation (EC) No 1333/2008 on food additives | Regulation (EC) No 1333/2008 on food additives, Annex II (E numbers; sweeteners are E420, E421 and E950 to E969) | EUR-Lex, European Union | https://eur-lex.europa.eu/eli/reg/2008/1333/oj |
