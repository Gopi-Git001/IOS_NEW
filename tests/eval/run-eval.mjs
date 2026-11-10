#!/usr/bin/env node
// Accuracy eval: every labels.json item with verified=true AND photo_status="ok" goes through the same
// crop / resize / JPEG steps as the app, then the real scan pipeline (quickgob-quick-verdict + quickgob-scan-label
// at the same time, combined exactly like the app). Writes tests/eval/report.md.
//
//   npm run eval                     all eligible items
//   npm run eval -- --only 17-coca-cola,14-zevia-cola
//   npm run eval -- --dry-run        prepare photos and estimate cost, no network calls
//
// Settings come from the environment only (no .env files are read):
//   EVAL_SUPABASE_URL, EVAL_SUPABASE_KEY      project URL + publishable key (fall back to EXPO_PUBLIC_SUPABASE_*)
//   EVAL_ACCESS_TOKEN                          a signed-in user's access token, or
//   EVAL_USER_EMAIL, EVAL_USER_PASSWORD        an email/password test account, or neither: guest sign-in
//                                              through quickgob-phone-auth (needs GUEST_SIGNIN=on on the server)
//   EVAL_CLAUDE_USD_PER_MTOK_IN / _OUT         Claude price per million tokens (defaults 5 / 25)
//   EVAL_JEV_USD_PER_SCAN                      Jev price per call (default 0.002)
// Model keys (ANTHROPIC_API_KEY, TYPESAFE_API_KEY) stay in Supabase secrets; the pipeline uses them server-side.
//
// Exit 1 and "RESULT: FAIL" if verdict accuracy < 95%, any sweetened item (labels OKAY or BAD) comes back
// CLEAN, the slowest 5% of scans (p95 of the full scan) take over 8 s, or the run stops on the $2 budget.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { combine } from '../../src/lib/combine.ts';
import { uploadPlan } from '../../src/lib/photo.ts';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPORT = path.join(DIR, 'report.md');

const MAX_SPEND_USD = 2;
const MIN_ACCURACY = 0.95;
const MAX_P95_MS = 8000;
/** Same as the app (src/lib/api.ts): the lists get 12 s, then the scan shows a Retry. */
const LISTS_TIMEOUT_MS = 12_000;
/** expo-image-manipulator compress 0.85 in src/lib/api.ts. */
const JPEG_QUALITY = 85;

/** labels.json speaks the app's words (see its _verdicts note); the code says CLEAN / BAD / UGLY. */
const EXPECTED_TO_CODE = { CLEAN: 'CLEAN', OKAY: 'BAD', BAD: 'UGLY', RETRY: 'RETRY' };

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const onlyAt = args.indexOf('--only');
const ONLY = onlyAt >= 0 ? new Set((args[onlyAt + 1] ?? '').split(',').filter(Boolean)) : null;
if (onlyAt >= 0 && !ONLY.size) die('--only needs an id, e.g. --only 17-coca-cola');

const price = {
  in: Number(process.env.EVAL_CLAUDE_USD_PER_MTOK_IN ?? 5),
  out: Number(process.env.EVAL_CLAUDE_USD_PER_MTOK_OUT ?? 25),
  jev: Number(process.env.EVAL_JEV_USD_PER_SCAN ?? 0.002),
};

function die(message) {
  console.error(message);
  console.log('RESULT: FAIL');
  process.exit(1);
}

// ---------- items ----------

const labels = JSON.parse(await fs.readFile(path.join(DIR, 'labels.json'), 'utf8'));
const all = labels.items;
if (ONLY) {
  const unknown = [...ONLY].filter((id) => !all.some((i) => i.id === id));
  if (unknown.length) die(`Unknown id(s): ${unknown.join(', ')}`);
}
const picked = all.filter((i) => !ONLY || ONLY.has(i.id));
const skipped = picked
  .map((i) => ({ i, why: i.verified !== true ? 'not verified' : i.photo_status !== 'ok' ? `photo_status ${JSON.stringify(i.photo_status ?? null)}` : !(i.expected_verdict in EXPECTED_TO_CODE) ? `expected_verdict ${JSON.stringify(i.expected_verdict)}` : null }))
  .filter((s) => s.why);
const items = picked.filter((i) => !skipped.some((s) => s.i === i));

// ---------- photo prep (same steps as the app) ----------

/** Auto-orient, crop to `crop` (the guide box, 0–1 units) with the app's margin when it is big enough, longest side ≤ 1568, JPEG 85. */
async function prepare(item) {
  const { data, info } = await sharp(path.join(DIR, item.photo)).rotate().toBuffer({ resolveWithObject: true });
  const plan = uploadPlan(info.width, info.height, item.crop ?? null);
  let img = sharp(data);
  if (plan.cropped) img = img.extract({ left: plan.src.originX, top: plan.src.originY, width: plan.src.width, height: plan.src.height });
  const jpeg = await img.resize(plan.width, plan.height, { fit: 'fill' }).jpeg({ quality: JPEG_QUALITY }).toBuffer();
  return { base64: jpeg.toString('base64'), width: plan.width, height: plan.height, kb: Math.round(jpeg.length / 1024) };
}

/** Before any real numbers: image tokens ≈ w·h/750, plus the prompt; a short JSON answer. */
const estimateCost = (w, h) => ((Math.ceil((w * h) / 750) + 800) * price.in + 300 * price.out) / 1e6 + price.jev;

// ---------- pipeline ----------

const BASE = process.env.EVAL_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EVAL_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function signIn() {
  if (process.env.EVAL_ACCESS_TOKEN) return process.env.EVAL_ACCESS_TOKEN;
  const auth = (p, body) => fetch(`${BASE}/auth/v1/${p}`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (process.env.EVAL_USER_EMAIL && process.env.EVAL_USER_PASSWORD) {
    const r = await auth('token?grant_type=password', { email: process.env.EVAL_USER_EMAIL, password: process.env.EVAL_USER_PASSWORD });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || !body.access_token) die(`Sign-in failed (${r.status}): ${body.error_description ?? body.msg ?? ''}`);
    return body.access_token;
  }
  const g = await fetch(`${BASE}/functions/v1/quickgob-phone-auth`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'guest' }) });
  const { token_hash, error } = await g.json().catch(() => ({}));
  if (!g.ok || !token_hash) die(`No EVAL_ACCESS_TOKEN or EVAL_USER_EMAIL/PASSWORD, and guest sign-in failed (${g.status}): ${error ?? ''}`);
  const v = await auth('verify', { type: 'email', token_hash });
  const session = await v.json().catch(() => ({}));
  if (!v.ok || !session.access_token) die(`Guest verify failed (${v.status})`);
  return session.access_token;
}

async function invoke(token, slug, body, signal) {
  const r = await fetch(`${BASE}/functions/v1/${slug}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

/** One scan the way src/lib/scan.ts runs it: both calls at once, then combine(). */
async function scan(token, image, id) {
  const started = performance.now();
  const client = { platform: 'eval' };
  const scanId = `eval-${id}`.slice(0, 32);
  let verdictMs = null;

  const quick = invoke(token, 'quickgob-quick-verdict', { image, scan_id: scanId, client })
    .then((r) => (r.status === 200 && r.body.jev ? r.body.jev : { status: 'unavailable', reason: r.body.error ?? `HTTP ${r.status}` }))
    .catch((e) => ({ status: 'unavailable', reason: String(e) }))
    .then((jev) => {
      if (jev.status === 'decided') verdictMs = performance.now() - started;
      return jev;
    });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LISTS_TIMEOUT_MS);
  const lists = invoke(token, 'quickgob-scan-label', { image, scan_id: scanId, client }, controller.signal)
    .then((r) => {
      if (r.status === 200 && r.body.result) return { reading: r.body.result, timing: r.body.timing };
      return { failed: true, unreadable: r.body.code === 'unreadable', retryable: r.status >= 500, error: r.body.code ?? r.body.error ?? `HTTP ${r.status}`, timing: r.body.timing };
    })
    .catch(() => ({ failed: true, retryable: true, error: controller.signal.aborted ? 'timeout' : 'network' }))
    .finally(() => clearTimeout(timer));

  const [jev, l] = await Promise.all([quick, lists]);
  const doneMs = performance.now() - started;
  const shown = combine(jev, l.reading ?? null, !!l.failed, !!l.unreadable, !!l.retryable);
  const tokensIn = l.timing?.claude_in_tokens ?? 0;
  const tokensOut = l.timing?.claude_out_tokens ?? 0;
  return {
    shown,
    jev,
    listsError: l.error,
    verdictMs: verdictMs ?? (shown?.status === 'done' ? doneMs : null),
    doneMs,
    cost: (tokensIn * price.in + tokensOut * price.out) / 1e6 + price.jev,
    tokens: { in: tokensIn, out: tokensOut },
  };
}

// ---------- scoring ----------

const norm = (s) => s.toLowerCase().replace(/\s*\(sugar alcohol\)\s*$/, '').replace(/\s+/g, ' ').trim();
const isGramsLine = (s) => /^\d+(\.\d+)? g added per serving$/i.test(s.trim());

function diffList(expected, got) {
  const e = new Map(expected.map((x) => [norm(x), x]));
  const g = new Map(got.filter((x) => !isGramsLine(x)).map((x) => [norm(x), x]));
  return {
    missed: [...e].filter(([k]) => !g.has(k)).map(([, v]) => v),
    extra: [...g].filter(([k]) => !e.has(k)).map(([, v]) => v),
  };
}

function score(item, run) {
  const expected = EXPECTED_TO_CODE[item.expected_verdict];
  const got = run.shown?.status === 'done' ? run.shown.result.verdict : 'RETRY';
  const result = run.shown?.status === 'done' ? run.shown.result : { naturalSugars: [], addedSugars: [], sweeteners: [] };
  const lists = {
    natural: diffList(item.expected_natural_sugars ?? [], result.naturalSugars),
    added: diffList(item.expected_added_sugars ?? [], result.addedSugars),
    sweeteners: diffList(item.expected_sweeteners ?? [], result.sweeteners),
  };
  const listsOk = Object.values(lists).every((d) => !d.missed.length && !d.extra.length);
  return { item, run, expected, got, correct: expected === got, listsOk, lists };
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const p95 = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * 0.95) - 1] : null);
const sec = (ms) => (ms == null ? '–' : `${(ms / 1000).toFixed(2)} s`);
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '–');
const usd = (x) => `$${x.toFixed(3)}`;

// ---------- run ----------

console.log(`Eval: ${items.length} eligible of ${picked.length} picked (${skipped.length} skipped: not verified / photo_status not "ok").`);

const prepared = [];
for (const item of items) {
  try {
    prepared.push({ item, photo: await prepare(item) });
  } catch (e) {
    skipped.push({ i: item, why: `photo could not be prepared: ${e.message}` });
  }
}
const estimate = prepared.reduce((sum, p) => sum + estimateCost(p.photo.width, p.photo.height), 0);
console.log(`Estimated spend: ${usd(estimate)} (budget ${usd(MAX_SPEND_USD)}).`);

const scored = [];
let spent = 0;
let stopReason = null;

if (!DRY_RUN && prepared.length) {
  if (estimate > MAX_SPEND_USD) {
    stopReason = `estimated spend ${usd(estimate)} is over the ${usd(MAX_SPEND_USD)} budget; nothing was sent (use --only to run fewer items)`;
  } else {
    if (!BASE || !KEY) die('Set EVAL_SUPABASE_URL and EVAL_SUPABASE_KEY (or EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY).');
    const token = await signIn();
    for (const [n, p] of prepared.entries()) {
      const next = scored.length ? Math.max(spent / scored.length, estimateCost(p.photo.width, p.photo.height)) : estimateCost(p.photo.width, p.photo.height);
      if (spent + next > MAX_SPEND_USD) {
        stopReason = `stopped before ${p.item.id}: spend ${usd(spent)} + next scan ~${usd(next)} would pass ${usd(MAX_SPEND_USD)}`;
        break;
      }
      const run = await scan(token, p.photo.base64, p.item.id);
      spent += run.cost;
      const s = score(p.item, run);
      scored.push(s);
      console.log(`[${n + 1}/${prepared.length}] ${p.item.id}: expected ${s.expected}, got ${s.got} ${s.correct ? 'ok' : 'MISS'} · ${sec(run.doneMs)} · ${usd(run.cost)}`);
    }
  }
}

// ---------- verdict ----------

const doneTimes = scored.map((s) => s.run.doneMs);
const verdictTimes = scored.map((s) => s.run.verdictMs).filter((x) => x != null);
const correct = scored.filter((s) => s.correct).length;
const accuracy = scored.length ? correct / scored.length : 0;
const sweetCalledClean = scored.filter((s) => (s.expected === 'BAD' || s.expected === 'UGLY') && s.got === 'CLEAN');
const cleanFlagged = scored.filter((s) => s.expected === 'CLEAN' && s.got !== 'CLEAN');
const slow = p95(doneTimes);

const failures = [];
if (!DRY_RUN && !scored.length) failures.push(stopReason ?? 'no eligible items to score (need verified=true and photo_status="ok")');
if (stopReason && scored.length) failures.push(stopReason);
if (scored.length && accuracy < MIN_ACCURACY) failures.push(`verdict accuracy ${pct(correct, scored.length)} < ${MIN_ACCURACY * 100}%`);
if (sweetCalledClean.length) failures.push(`${sweetCalledClean.length} sweetened item(s) called CLEAN: ${sweetCalledClean.map((s) => s.item.id).join(', ')}`);
if (slow != null && slow > MAX_P95_MS) failures.push(`slowest 5% of scans take ${sec(slow)} (p95) > ${sec(MAX_P95_MS)}`);

// ---------- report ----------

const groupTable = (key) => {
  const groups = new Map();
  for (const s of scored) {
    const k = key(s);
    const g = groups.get(k) ?? { n: 0, ok: 0, lists: 0 };
    g.n++;
    g.ok += s.correct ? 1 : 0;
    g.lists += s.listsOk ? 1 : 0;
    groups.set(k, g);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([k, g]) => `| ${k} | ${g.n} | ${pct(g.ok, g.n)} | ${pct(g.lists, g.n)} |`).join('\n') || '| – | 0 | – | – |';
};

const listProblems = scored.flatMap((s) =>
  Object.entries(s.lists).flatMap(([list, d]) => [
    ...d.missed.map((x) => ({ id: s.item.id, list, kind: 'missed', name: x })),
    ...d.extra.map((x) => ({ id: s.item.id, list, kind: 'false alarm', name: x })),
  ]),
);
const slowest = [...scored].sort((a, b) => b.run.doneMs - a.run.doneMs).slice(0, Math.max(1, Math.ceil(scored.length * 0.05)));

const report = `# Eval report

${new Date().toISOString()} · ${BASE ? new URL(BASE).host : 'no project'}${DRY_RUN ? ' · dry run' : ''}${ONLY ? ` · --only ${[...ONLY].join(',')}` : ''}

**RESULT: ${DRY_RUN ? 'DRY RUN (not scored)' : failures.length ? 'FAIL' : 'PASS'}**${failures.length ? `\n\n${failures.map((f) => `- ${f}`).join('\n')}` : ''}

| | |
|---|---|
| Items scored | ${scored.length} (${skipped.length} skipped) |
| Verdict accuracy | ${pct(correct, scored.length)} (pass: ≥ ${MIN_ACCURACY * 100}%) |
| All three lists exactly right | ${pct(scored.filter((s) => s.listsOk).length, scored.length)} |
| Sweetened items called CLEAN | ${sweetCalledClean.length} (pass: 0) |
| CLEAN items flagged | ${cleanFlagged.length} |
| Full scan, median / p95 | ${sec(median(doneTimes))} / ${sec(slow)} (pass: p95 ≤ ${sec(MAX_P95_MS)}) |
| Verdict on screen, median | ${sec(median(verdictTimes))} |
| Spend | ${usd(spent)} measured${DRY_RUN || !scored.length ? `, ${usd(estimate)} estimated` : ''} (budget ${usd(MAX_SPEND_USD)}) |

Verdicts are in code terms: labels.json CLEAN / OKAY / BAD / RETRY = CLEAN / BAD / UGLY / RETRY (no verdict, ask for a retake).
Lists compare case-insensitively; the "N g added per serving" line and the "(sugar alcohol)" tag are ignored.
Prices: Claude $${price.in} / $${price.out} per million tokens in / out, Jev $${price.jev} per scan (override with EVAL_* env).

## Accuracy by expected verdict

| Expected | Items | Verdict right | Lists right |
|---|---|---|---|
${groupTable((s) => s.expected)}

## Accuracy by category

| Category | Items | Verdict right | Lists right |
|---|---|---|---|
${groupTable((s) => s.item.category ?? '–')}

## Wrong verdicts

| Item | Expected | Got | Jev | Lists error |
|---|---|---|---|---|
${scored.filter((s) => !s.correct).map((s) => `| ${s.item.id} | ${s.expected} | ${s.got} | ${s.run.jev.status}${s.run.jev.verdict ? ` ${s.run.jev.verdict}` : ''}${s.run.jev.confidence != null ? ` (${Number(s.run.jev.confidence).toFixed(2)})` : ''} | ${s.run.listsError ?? ''} |`).join('\n') || '| – | | | | |'}

## Misses and false alarms in the sugar lists

| Item | List | Kind | Name |
|---|---|---|---|
${listProblems.map((p) => `| ${p.id} | ${p.list} | ${p.kind} | ${p.name} |`).join('\n') || '| – | | | |'}

## Slowest 5%

| Item | Full scan | Verdict on screen |
|---|---|---|
${slowest.map((s) => `| ${s.item.id} | ${sec(s.run.doneMs)} | ${sec(s.run.verdictMs)} |`).join('\n') || '| – | | |'}

## Skipped

${skipped.length ? `${skipped.length} item(s): ${Object.entries(skipped.reduce((m, s) => ({ ...m, [s.why]: (m[s.why] ?? 0) + 1 }), {})).map(([why, n]) => `${n} ${why}`).join(', ')}.` : 'None.'}
`;

await fs.writeFile(REPORT, report);
console.log(`\nWrote ${path.relative(process.cwd(), REPORT)}`);
for (const f of failures) console.log(`- ${f}`);
if (DRY_RUN) {
  console.log('RESULT: DRY RUN (not scored)');
  process.exit(0);
}
console.log(`RESULT: ${failures.length ? 'FAIL' : 'PASS'}`);
process.exit(failures.length ? 1 : 0);
