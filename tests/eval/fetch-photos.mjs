#!/usr/bin/env node
// Downloads real ingredient-label photos for the QuickGOB test set from Open Food Facts
// (open data, CC BY-SA). Run from the repo root:
//
//   npm i -D sharp                      # optional: makes the blur / glare / dim-light variants
//   node tests/eval/fetch-photos.mjs
//
// Options:
//   --only 17-coca-cola,21-gatorade-lemon-lime   fetch just these ids
//   --force                                       re-download photos that already exist
//   --from-sources                                download each item's recorded source.image instead of
//                                                 searching again (same photos you verified; used by CI)
//
// Search goes through search.openfoodfacts.org (the cgi search on world.openfoodfacts.org
// was returning 503 / products with no label photos). A full run takes a few minutes.
// Results: photos in tests/eval/photos/, sources added to labels.json, and review.md
// (label text from the database next to your expected answers, to verify quickly).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const LABELS = path.join(DIR, "labels.json");
const PHOTOS = path.join(DIR, "photos");
const UA = process.env.OFF_USER_AGENT || "QuickGOB-eval/1.0 (internal accuracy testing)";
const SEARCH_GAP_MS = 1200;

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const FROM_SOURCES = args.includes("--from-sources");
const onlyIdx = args.indexOf("--only");
const ONLY = onlyIdx >= 0 ? new Set(args[onlyIdx + 1].split(",")) : null;

// Search terms per test id (number prefix removed). Edit a line if a search picks the wrong product.
// kind: "ingredients" (default) | "nutrition" (nutrition panel only) | variant of another id | "manual"
const PLAN = {
  "lacroix-pamplemousse": { q: "LaCroix Pamplemousse sparkling water" },
  "topo-chico": { q: "Topo Chico mineral water" },
  "smartwater": { q: "Smartwater vapor distilled water" },
  "spindrift-grapefruit": { q: "Spindrift grapefruit sparkling water" },
  "blue-diamond-almonds": { q: "Blue Diamond whole natural almonds" },
  "quaker-old-fashioned-oats": { q: "Quaker old fashioned oats" },
  "fage-total-0-plain": { q: "Fage Total 0% plain greek yogurt" },
  "larabar-cashew-cookie": { q: "Larabar cashew cookie" },
  "raos-marinara": { q: "Rao's homemade marinara sauce" },
  "365-peanut-butter": { q: "365 organic creamy peanut butter unsweetened" },
  "unsweetened-almond-milk": { q: "Silk unsweetened almondmilk" },
  "hard-boiled-eggs": { q: "large brown eggs" },
  "lmnt-citrus-salt": { q: "LMNT citrus salt electrolyte" },
  "zevia-cola": { q: "Zevia cola" },
  "zevia-ginger-ale": { q: "Zevia ginger ale" },
  "sweetleaf-drops": { q: "SweetLeaf sweet drops stevia" },
  "coca-cola": { q: "Coca-Cola classic can" },
  "sprite": { q: "Sprite lemon lime soda" },
  "diet-coke": { q: "Diet Coke" },
  "coke-zero": { q: "Coca-Cola Zero Sugar" },
  "gatorade-lemon-lime": { q: "Gatorade thirst quencher lemon lime" },
  "gatorade-zero": { q: "Gatorade Zero" },
  "propel": { q: "Propel fitness water" },
  "pedialyte": { q: "Pedialyte" },
  "liquid-iv-lemon-lime": { q: "Liquid IV hydration multiplier lemon lime" },
  "monster-original": { q: "Monster energy original green" },
  "red-bull": { q: "Red Bull energy drink" },
  "vitaminwater": { q: "vitaminwater xxx" },
  "vitaminwater-zero": { q: "vitaminwater zero" },
  "starbucks-frappuccino": { q: "Starbucks frappuccino mocha bottle" },
  "snapple-peach-tea": { q: "Snapple peach tea" },
  "simply-lemonade": { q: "Simply Lemonade" },
  "white-claw": { q: "White Claw hard seltzer" },
  "michelob-ultra": { q: "Michelob Ultra" },
  "honey-nut-cheerios": { q: "Honey Nut Cheerios" },
  "frosted-flakes": { q: "Kellogg's Frosted Flakes" },
  "nature-valley-oats-honey": { q: "Nature Valley oats n honey crunchy granola bars" },
  "kind-dark-choc-nuts": { q: "KIND dark chocolate nuts sea salt" },
  "clif-chocolate-chip": { q: "Clif bar chocolate chip" },
  "quest-bar": { q: "Quest protein bar chocolate chip cookie dough" },
  "halo-top-vanilla": { q: "Halo Top vanilla bean" },
  "lilys-dark-chocolate": { q: "Lily's dark chocolate stevia" },
  "oreo": { q: "Oreo chocolate sandwich cookies" },
  "nutella": { q: "Nutella hazelnut spread" },
  "heinz-ketchup": { q: "Heinz tomato ketchup" },
  "syrup-corn-syrup": { q: "Pearl Milling Company original syrup" },
  "daves-killer-bread": { q: "Dave's Killer Bread 21 whole grains" },
  "ritz-crackers": { q: "Ritz original crackers" },
  "chobani-vanilla": { q: "Chobani vanilla greek yogurt" },
  "coffee-mate-original": { q: "Coffee mate original creamer" },
  "athletic-brewing-na": { q: "Athletic Brewing run wild non-alcoholic" },
  "gts-kombucha": { q: "GT's synergy kombucha" },
  "simply-orange-juice": { q: "Simply Orange pulp free orange juice" },
  "blurry-lacroix": { variantOf: "lacroix-pamplemousse", effect: "blur" },
  "glare-coke-can": { variantOf: "coca-cola", effect: "glare" },
  "curved-gatorade": { variantOf: "gatorade-lemon-lime", effect: "none" },
  "dim-light-cereal": { variantOf: "honey-nut-cheerios", effect: "dim" },
  "nutrition-panel-only": { q: "Frosted Flakes", kind: "nutrition" },
  "not-food-shoe": { kind: "manual" },
  "non-english-label": { q: "Nutella pâte à tartiner", country: "france" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const keyOf = (id) => id.replace(/^\d+-/, "");
const fullRes = (url) => url && url.replace(/\.(\d+)\.jpg$/, ".full.jpg");

function barcodeFolder(code) {
  const c = String(code);
  if (!/^\d+$/.test(c) || c.length <= 8) return c;
  const padded = c.padStart(13, "0");
  return `${padded.slice(0, 3)}/${padded.slice(3, 6)}/${padded.slice(6, 9)}/${padded.slice(9)}`;
}

function imageChoice(code, images, kind, country) {
  const prefix = kind === "nutrition" ? "nutrition" : "ingredients";
  const lang = country === "france" ? "fr" : "en";
  const keys = Object.keys(images || {}).filter((k) => k === prefix || k.startsWith(`${prefix}_`));
  const key =
    keys.find((k) => k === `${prefix}_${lang}`) ||
    keys.find((k) => k === prefix) ||
    keys.find((k) => k === `${prefix}_en`) ||
    keys[0];
  const rev = key ? images[key]?.rev : null;
  if (!key || rev == null) return null;
  const full = images[key]?.sizes?.full;
  return {
    url: `https://images.openfoodfacts.org/images/products/${barcodeFolder(code)}/${key}.${rev}.full.jpg`,
    width: full?.w || 0,
  };
}

function normalizeHit(hit, country) {
  const brands = Array.isArray(hit.brands) ? hit.brands.filter(Boolean).join(", ") : hit.brands;
  const ingredients = imageChoice(hit.code, hit.images, "ingredients", country);
  const nutrition = imageChoice(hit.code, hit.images, "nutrition", country);
  return {
    code: hit.code,
    product_name: hit.product_name,
    brands,
    countries_tags: hit.countries_tags,
    image_ingredients_url: ingredients?.url || null,
    image_ingredients_width: ingredients?.width || 0,
    image_nutrition_url: nutrition?.url || null,
    image_nutrition_width: nutrition?.width || 0,
    ingredients_text_en: hit.ingredients_text_en,
    ingredients_text: hit.ingredients_text,
  };
}

async function getJson(url, { retry = true } = {}) {
  const attempts = retry ? 3 : 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    if (retry && (res.status === 429 || res.status >= 500)) { await sleep(15000 * attempt); continue; }
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  throw new Error(`Gave up after ${attempts} tries: ${url}`);
}

async function download(url, file) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  await fs.writeFile(file, Buffer.from(await res.arrayBuffer()));
}

async function search(q, country) {
  const params = new URLSearchParams({ q, page_size: "50" });
  const data = await getJson(`https://search.openfoodfacts.org/search?${params}`);
  return (data.hits || []).map((hit) => normalizeHit(hit, country));
}

async function loadIngredients(code) {
  const fields = "ingredients_text,ingredients_text_en,product_name,brands";
  const urls = [
    `https://us.openfoodfacts.org/api/v2/product/${code}?fields=${fields}`,
    `https://world.openfoodfacts.org/api/v2/product/${code}?fields=${fields}`,
  ];
  for (const url of urls) {
    try {
      const data = await getJson(url, { retry: false });
      if (data?.product) return data.product;
    } catch {
      /* try the next host */
    }
  }
  return {};
}

function pick(products, kind, country) {
  const want = kind === "nutrition" ? "image_nutrition_url" : "image_ingredients_url";
  const widthOf = (p) => (kind === "nutrition" ? p.image_nutrition_width : p.image_ingredients_width);
  const withImg = products.filter((p) => p[want]);
  const readable = withImg.filter((p) => widthOf(p) >= 400);
  const pool = readable.length ? readable : withImg;
  const local = pool.filter((p) => (p.countries_tags || []).includes(country ? `en:${country}` : "en:united-states"));
  return local[0] || pool[0] || null;
}

let sharp = null;
try { sharp = (await import("sharp")).default; } catch { /* optional */ }

async function makeVariant(src, dst, effect) {
  if (effect === "none") { await fs.copyFile(src, dst); return "copied"; }
  if (!sharp) return "skipped (run: npm i -D sharp)";
  const img = sharp(src);
  const { width, height } = await img.metadata();
  if (effect === "blur") await img.blur(Math.max(8, Math.round(width / 120))).jpeg({ quality: 85 }).toFile(dst);
  if (effect === "dim") await img.modulate({ brightness: 0.32 }).jpeg({ quality: 85 }).toFile(dst);
  if (effect === "glare") {
    const svg = `<svg width="${width}" height="${height}"><defs><radialGradient id="g" cx="55%" cy="45%" r="35%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.95"/><stop offset="60%" stop-color="#fff" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/></svg>`;
    await img.composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 85 }).toFile(dst);
  }
  return effect;
}

const exists = (f) => fs.access(f).then(() => true, () => false);

const labels = JSON.parse(await fs.readFile(LABELS, "utf8"));
await fs.mkdir(PHOTOS, { recursive: true });
const byKey = Object.fromEntries(labels.items.map((it) => [keyOf(it.id), it]));
const summary = { ok: [], manual: [], failed: [] };

// Pass 1: real products. Pass 2: variants made from pass-1 photos.
const items = labels.items.filter((it) => !ONLY || ONLY.has(it.id));
const ordered = [...items.filter((it) => !PLAN[keyOf(it.id)]?.variantOf), ...items.filter((it) => PLAN[keyOf(it.id)]?.variantOf)];

let lastSearch = 0;
for (const it of ordered) {
  const plan = PLAN[keyOf(it.id)] || { q: it.product };
  const file = path.join(DIR, it.photo);
  try {
    if (plan.kind === "manual") { summary.manual.push(`${it.id}: take this photo yourself (${it.tests})`); continue; }
    if (!FORCE && (await exists(file))) { summary.ok.push(`${it.id} (already there)`); continue; }

    if (plan.variantOf) {
      const base = byKey[plan.variantOf];
      const baseFile = path.join(DIR, base.photo);
      if (!(await exists(baseFile))) throw new Error(`needs ${base.id} first`);
      const how = await makeVariant(baseFile, file, plan.effect);
      it.source = { ...(base.source || {}), derived_from: base.id, effect: plan.effect };
      if (how.startsWith("skipped")) summary.manual.push(`${it.id}: ${how}, or take it yourself`);
      else summary.ok.push(`${it.id} (${how} from ${base.id})`);
      continue;
    }

    if (FROM_SOURCES && it.source?.image) {
      await download(it.source.image, file);
      summary.ok.push(`${it.id} (from recorded source)`);
      continue;
    }

    const wait = lastSearch + SEARCH_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastSearch = Date.now();
    const product = pick(await search(plan.q, plan.country), plan.kind, plan.country);
    if (!product) throw new Error(`no product with a ${plan.kind === "nutrition" ? "nutrition" : "ingredients"} photo for "${plan.q}"`);
    if (!product.ingredients_text_en && !product.ingredients_text) {
      const detail = await loadIngredients(product.code);
      product.ingredients_text_en = detail.ingredients_text_en || "";
      product.ingredients_text = detail.ingredients_text || "";
      if (!product.product_name && detail.product_name) product.product_name = detail.product_name;
      if (!product.brands && detail.brands) product.brands = detail.brands;
    }

    const url = fullRes(plan.kind === "nutrition" ? product.image_nutrition_url : product.image_ingredients_url);
    await download(url, file);
    it.source = {
      database: "Open Food Facts", license: "CC BY-SA 3.0",
      barcode: product.code, name: [product.brands, product.product_name].filter(Boolean).join(" · "),
      page: `https://world.openfoodfacts.org/product/${product.code}`, image: url,
    };
    it.off_ingredients_text = product.ingredients_text_en || product.ingredients_text || "";
    summary.ok.push(`${it.id} → ${it.source.name} (${product.code})`);
    process.stdout.write(`✓ ${it.id}\n`);
  } catch (e) {
    summary.failed.push(`${it.id}: ${e.message}`);
    process.stdout.write(`✗ ${it.id}: ${e.message}\n`);
  }
}

await fs.writeFile(LABELS, JSON.stringify(labels, null, 2) + "\n");

const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const list = (a) => (a && a.length ? a.join(", ") : "—");
const review = [
  "# Review: check each photo, fix labels.json, set verified = true", "",
  "| id | matched product | label text from database | expected verdict | natural | added | sweeteners |",
  "|---|---|---|---|---|---|---|",
  ...labels.items.map((it) => `| ${it.id} | ${esc(it.source?.name || it.source?.derived_from || "—")} | ${esc(it.off_ingredients_text || "—")} | ${it.expected_verdict ?? "DECIDE"} | ${esc(list(it.expected_natural_sugars))} | ${esc(list(it.expected_added_sugars))} | ${esc(list(it.expected_sweeteners))} |`),
].join("\n");
await fs.writeFile(path.join(DIR, "review.md"), review + "\n");

console.log(`\nDone: ${summary.ok.length} ready, ${summary.manual.length} to do by hand, ${summary.failed.length} failed.`);
for (const m of summary.manual) console.log("  ✋ " + m);
for (const f of summary.failed) console.log("  ✗ " + f);
console.log("\nNext: open tests/eval/review.md, compare with each photo, fix labels.json, set verified = true.");
