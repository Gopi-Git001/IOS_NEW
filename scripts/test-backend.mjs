#!/usr/bin/env node
// Backend tests against the LOCAL Supabase stack only (Docker required):
//   1. pgTAP:  supabase test db                     (supabase/tests/database)
//   2. Deno:   supabase functions serve + deno test  (supabase/functions/_tests)
// Usage: node scripts/test-backend.mjs [--db] [--functions]   (no flag = both)
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const args = new Set(process.argv.slice(2));
const runDb = args.has('--db') || !args.has('--functions');
const runFunctions = args.has('--functions') || !args.has('--db');
const win = process.platform === 'win32';
const ENV_FILE = 'supabase/functions/_tests/.env.test';

const run = (cmd, cmdArgs, opts = {}) => spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: win, ...opts }).status ?? 1;
const supabase = (...a) => run('npx', ['supabase', ...a]);

function localStatus() {
  const r = spawnSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8', shell: win });
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  try {
    const s = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    return s?.API_URL ? s : null;
  } catch {
    return null;
  }
}

function fail(message) {
  console.error(`\n[test-backend] ${message}`);
  process.exit(1);
}

if (spawnSync('docker', ['info'], { stdio: 'ignore', shell: win }).status !== 0) {
  fail('Docker is not running. Start Docker Desktop, then run npm test again.');
}

let status = localStatus();
if (!status) {
  console.log('[test-backend] starting the local Supabase stack…');
  if (supabase('start') !== 0) fail('supabase start failed');
  status = localStatus();
}
if (!status) fail('could not read `supabase status`');
if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(status.API_URL)) fail(`refusing to test a non-local stack: ${status.API_URL}`);

const results = [];

if (runDb) {
  console.log('\n[test-backend] pgTAP: supabase test db');
  results.push(['pgTAP (supabase test db)', supabase('test', 'db')]);
}

if (runFunctions) {
  console.log(`\n[test-backend] Edge Functions: supabase functions serve --env-file ${ENV_FILE}`);
  const serve = spawn('npx', ['supabase', 'functions', 'serve', '--env-file', ENV_FILE], { stdio: ['ignore', 'pipe', 'pipe'], shell: win });
  let serveLog = '';
  serve.stdout.on('data', (d) => (serveLog += d));
  serve.stderr.on('data', (d) => (serveLog += d));

  const stopServe = () => {
    if (serve.exitCode !== null) return;
    if (win) spawnSync('taskkill', ['/pid', String(serve.pid), '/T', '/F'], { stdio: 'ignore' });
    else serve.kill('SIGINT');
  };
  process.on('exit', stopServe);

  // Ready once every slug answers without a gateway error; the first boot downloads npm packages.
  const slugs = ['quickgob-phone-auth', 'quickgob-quick-verdict', 'quickgob-scan-label', 'quickgob-delete-account'];
  const answers = async (slug) => {
    try {
      const r = await fetch(`${status.API_URL}/functions/v1/${slug}`, { method: 'OPTIONS' });
      await r.text();
      return r.status < 500;
    } catch {
      return false;
    }
  };
  let ready = false;
  for (let i = 0; i < 90 && !ready && serve.exitCode === null; i++) {
    await sleep(2000);
    ready = (await Promise.all(slugs.map(answers))).every(Boolean);
  }
  if (!ready) {
    console.error(serveLog.slice(-4000));
    stopServe();
    fail('functions serve did not come up');
  }

  const deno = spawnSync('deno', ['--version'], { stdio: 'ignore', shell: win }).status === 0 ? ['deno'] : ['npx', '-y', 'deno@2'];
  const code = run(deno[0], [
    ...deno.slice(1),
    'test',
    '--config', 'supabase/functions/_tests/deno.json',
    '--allow-net', '--allow-env', '--allow-read',
    'supabase/functions/_tests/',
  ], {
    env: {
      ...process.env,
      SUPABASE_URL: status.API_URL,
      SUPABASE_ANON_KEY: status.ANON_KEY ?? status.PUBLISHABLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY ?? status.SECRET_KEY,
    },
  });
  if (code !== 0) console.error(`\n[test-backend] last functions serve output:\n${serveLog.slice(-4000)}`);
  stopServe();
  results.push(['Edge Functions (deno test)', code]);
}

console.log('\n[test-backend] summary');
for (const [name, code] of results) console.log(`  ${code === 0 ? 'PASS' : 'FAIL'}  ${name}`);
process.exit(results.every(([, code]) => code === 0) ? 0 : 1);
