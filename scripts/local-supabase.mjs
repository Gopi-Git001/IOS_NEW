#!/usr/bin/env node
// Helpers for testing against the LOCAL Supabase stack (`npx supabase start`). Refuses any other project.
//   node scripts/local-supabase.mjs user              create (or reset) the local eval user, print its env lines
//   node scripts/local-supabase.mjs app-env [--ip X]  write .env.local so `npx expo start --lan` uses the local
//                                                     stack at http://<LAN IP>:54321 (guest sign-in + test photo)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { createClient } from '@supabase/supabase-js';

const EVAL_EMAIL = 'eval@local.test';
const EVAL_PASSWORD = 'local-eval-password';
const APP_ENV_FILE = '.env.local';

function fail(message) {
  console.error(`[local-supabase] ${message}`);
  process.exit(1);
}

function localStatus() {
  const r = spawnSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8', shell: process.platform === 'win32' });
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  let s = null;
  try {
    s = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
  } catch {
    // reported below
  }
  if (!s?.API_URL) fail('The local stack is not running. Start Docker Desktop, then: npx supabase start');
  if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(s.API_URL)) fail(`Refusing a non-local stack: ${s.API_URL}`);
  const publishable = s.PUBLISHABLE_KEY ?? s.ANON_KEY;
  const secret = s.SECRET_KEY ?? s.SERVICE_ROLE_KEY;
  if (!publishable || !secret) fail('`supabase status` did not list the local keys');
  return { url: s.API_URL, publishable, secret };
}

async function seedUser() {
  const { url, publishable, secret } = localStatus();
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const created = await admin.auth.admin.createUser({ email: EVAL_EMAIL, password: EVAL_PASSWORD, email_confirm: true, user_metadata: { app: 'sugar-hunter', eval: true } });
  if (created.error) {
    if (created.error.code !== 'email_exists' && created.error.status !== 422) fail(`create user failed: ${created.error.message}`);
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (error) fail(`list users failed: ${error.message}`);
    const user = data.users.find((u) => u.email === EVAL_EMAIL);
    if (!user) fail(`${EVAL_EMAIL} exists but could not be found`);
    const reset = await admin.auth.admin.updateUserById(user.id, { password: EVAL_PASSWORD, email_confirm: true });
    if (reset.error) fail(`password reset failed: ${reset.error.message}`);
    console.log(`[local-supabase] ${EVAL_EMAIL} already existed; password reset.`);
  } else {
    console.log(`[local-supabase] created ${EVAL_EMAIL}.`);
  }
  console.log('\nPaste into PowerShell before `npm run eval`:\n');
  console.log(`$env:EVAL_SUPABASE_URL = '${url}'`);
  console.log(`$env:EVAL_SUPABASE_KEY = '${publishable}'`);
  console.log(`$env:EVAL_USER_EMAIL = '${EVAL_EMAIL}'`);
  console.log(`$env:EVAL_USER_PASSWORD = '${EVAL_PASSWORD}'`);
}

/** The PC's Wi-Fi / Ethernet IPv4, skipping WSL, Hyper-V, Docker and VPN adapters. */
function lanIp() {
  const skip = /vethernet|wsl|hyper-v|docker|virtualbox|vmware|loopback|tailscale|zerotier/i;
  const candidates = Object.entries(os.networkInterfaces())
    .filter(([name]) => !skip.test(name))
    .flatMap(([, addrs]) => addrs ?? [])
    .filter((a) => a.family === 'IPv4' && !a.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address))
    .map((a) => a.address);
  return candidates.find((ip) => ip.startsWith('192.168.')) ?? candidates[0] ?? null;
}

function writeAppEnv(argv) {
  const at = argv.indexOf('--ip');
  const ip = at >= 0 ? argv[at + 1] : lanIp();
  if (!ip || !/^\d+\.\d+\.\d+\.\d+$/.test(ip)) fail('Could not find the LAN IP. Pass it: node scripts/local-supabase.mjs app-env --ip 192.168.1.20');
  const { url, publishable } = localStatus();
  const port = new URL(url).port || '54321';
  const body = [
    '# Written by `node scripts/local-supabase.mjs app-env`. Points the app at the LOCAL Supabase stack.',
    '# Overrides .env while it exists; delete this file to go back to the live project.',
    `EXPO_PUBLIC_SUPABASE_URL=http://${ip}:${port}`,
    `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishable}`,
    '# Testing build: guest sign-in (needs GUEST_SIGNIN=on in supabase/functions/.env.local) and the',
    '# shutter uses assets/test/label.jpg (needed by the Maestro flows). Set to 0 to scan with the camera.',
    'EXPO_PUBLIC_GUEST_MODE=1',
    'EXPO_PUBLIC_TEST_PHOTO=1',
    '',
  ].join('\n');
  fs.writeFileSync(APP_ENV_FILE, body);
  console.log(`[local-supabase] wrote ${APP_ENV_FILE}: EXPO_PUBLIC_SUPABASE_URL=http://${ip}:${port}`);
  console.log(`Check from the phone's browser: http://${ip}:${port}/auth/v1/health  (any JSON reply means the phone can reach it)`);
}

const [command, ...rest] = process.argv.slice(2);
switch (command) {
  case 'user':
    await seedUser();
    break;
  case 'app-env':
    writeAppEnv(rest);
    break;
  default:
    fail('Usage: node scripts/local-supabase.mjs user | app-env [--ip 192.168.x.y]');
}
