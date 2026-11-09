// Summarises .scan-timing/scans.jsonl (written by metro.config.js): median and slowest time per
// stage, per network. Usage: npm run timing:report [-- --since 2026-11-09T19:00]
import fs from 'node:fs';

const FILE = new URL('../.scan-timing/scans.jsonl', import.meta.url);
const sinceArg = process.argv.indexOf('--since');
const since = sinceArg > 0 ? new Date(process.argv[sinceArg + 1]) : null;

const scans = fs
  .readFileSync(FILE, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .filter((s) => !since || new Date(s.at) >= since);

const diff = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : undefined);

// [label, (scan) => ms]
const STAGES = [
  ['app: tap -> photo captured', (s) => s.captured],
  ['  of which ImageCapture still attempt', (s) => s.still_attempt_done],
  ['app: crop/resize/encode', (s) => diff(s.prepared, s.captured)],
  ['app: upload start (after encode)', (s) => diff(s.upload_start, s.prepared)],
  ['quick-verdict round trip', (s) => diff(s.quick_verdict_response, s.upload_start)],
  ['  server: arrive -> auth done (body upload + JWT)', (s) => s.quick_verdict_server?.auth_ms],
  ['  server: rate-limit check', (s) => diff(s.quick_verdict_server?.checks_ms, s.quick_verdict_server?.body_ms)],
  ['  server: Jev call', (s) => diff(s.quick_verdict_server?.jev_end_ms, s.quick_verdict_server?.jev_start_ms)],
  ['  server: total in function', (s) => s.quick_verdict_server?.sent_ms],
  ['  network + gateway + boot (round trip - server)', (s) => diff(diff(s.quick_verdict_response, s.upload_start), s.quick_verdict_server?.sent_ms)],
  ['scan-label round trip', (s) => diff(s.scan_label_response, s.upload_start)],
  ['  server: arrive -> auth done (body upload + JWT)', (s) => s.scan_label_server?.auth_ms],
  ['  server: rate-limit check', (s) => diff(s.scan_label_server?.checks_ms, s.scan_label_server?.body_ms)],
  ['  server: Claude call', (s) => diff(s.scan_label_server?.claude_end_ms, s.scan_label_server?.claude_start_ms)],
  ['  server: rules', (s) => diff(s.scan_label_server?.rules_ms, s.scan_label_server?.claude_end_ms)],
  ['  server: total in function', (s) => s.scan_label_server?.sent_ms],
  ['  network + gateway + boot (round trip - server)', (s) => diff(diff(s.scan_label_response, s.upload_start), s.scan_label_server?.sent_ms)],
  ['TAP -> VERDICT ON SCREEN', (s) => s.verdict_on_screen],
  ['TAP -> LISTS ON SCREEN', (s) => s.lists_on_screen],
];

const median = (xs) => {
  const v = [...xs].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
};

function report(title, group) {
  console.log(`\n## ${title} (${group.length} scans)\n`);
  console.log('| Stage | Median ms | Slowest ms | n |');
  console.log('|---|---:|---:|---:|');
  for (const [label, get] of STAGES) {
    const xs = group.map(get).filter((x) => typeof x === 'number');
    if (xs.length) console.log(`| ${label} | ${median(xs)} | ${Math.max(...xs)} | ${xs.length} |`);
  }
  const count = (get) => group.reduce((acc, s) => ((acc[get(s) ?? 'none'] = (acc[get(s) ?? 'none'] ?? 0) + 1), acc), {});
  const nums = (get) => group.map(get).filter((x) => typeof x === 'number');
  const kb = nums((s) => s.image_kb);
  const out = nums((s) => s.scan_label_server?.claude_out_tokens);
  const conf = nums((s) => s.quick_verdict_server?.jev_confidence);
  console.log('');
  console.log('Jev result:', JSON.stringify(count((s) => s.quick_verdict_server?.jev_status)));
  if (conf.length) console.log('Jev confidence: median', median(conf), 'min', Math.min(...conf));
  console.log('Cold start quick-verdict:', JSON.stringify(count((s) => s.quick_verdict_server?.cold)), ' scan-label:', JSON.stringify(count((s) => s.scan_label_server?.cold)));
  console.log('Capture path:', JSON.stringify(count((s) => s.capture_path)), ' platform:', JSON.stringify(count((s) => s.platform)));
  if (kb.length) console.log('Upload image KB: median', median(kb), 'max', Math.max(...kb));
  if (out.length) console.log('Claude output tokens: median', median(out), 'max', Math.max(...out));
  console.log('Errors:', JSON.stringify(count((s) => s.error ?? s.scan_label_error)));
}

const byNet = new Map();
for (const s of scans) byNet.set(s.net, [...(byNet.get(s.net) ?? []), s]);
let i = 0;
for (const [net, group] of byNet) report(`Network ${++i} (ip#${net}, reported type ${group[0].network ?? 'unknown'})`, group);
report('All scans', scans);
