// Build the two app-link association files from brand/app-links.json plus the phone identifiers in the
// environment. Run by `npm run app-links` (which build:web calls). Missing identifiers are not an error:
// the file is simply not written, the build passes, and every "Scan a label" link keeps using the web
// scanner. See docs/app-links.md.
//
//   public/.well-known/apple-app-site-association   (iOS Universal Links, no file extension)
//   public/.well-known/assetlinks.json              (Android App Links)
//
// Both are static files in public/, so Expo's web export copies them to the output root and Vercel
// serves them as ordinary files: no redirect, no rewrite, no auth.
import { mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));

/**
 * Load .env / .env.local into process.env, in that order so .env.local wins, without overriding
 * anything already set: a value from CI or Vercel always takes precedence over both files.
 *
 * Expo loads these files itself, but as a separate process AFTER this generator, so a developer who
 * put the identifiers in .env would otherwise get "skipped". Node's util.parseEnv does the parsing, so
 * quoted values and trailing `# comments` are handled the same way Expo handles them.
 *
 * Blank values are treated as unset. The template ships `APPLE_TEAM_ID=` (empty), and a copied .env
 * would otherwise masquerade as "configured" and suppress a valid .env.local value.
 */
function loadEnvFiles() {
  let parseEnv;
  try {
    parseEnv = createRequire(import.meta.url)('node:util').parseEnv;
  } catch {
    return; // older Node without util.parseEnv: inherited env still works
  }
  if (typeof parseEnv !== 'function') return;
  for (const name of ['.env', '.env.local']) {
    const file = new URL(`../${name}`, import.meta.url);
    if (!existsSync(file)) continue;
    let parsed;
    try {
      // Strip a UTF-8 BOM: parseEnv would otherwise fold it into the first key name ("\uFEFFAPPLE_TEAM_ID"),
      // which never matches and silently drops the value. PowerShell's Set-Content writes a BOM by default.
      const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
      parsed = parseEnv(text);
    } catch {
      continue; // unreadable or malformed: fall through to the environment
    }
    for (const [rawKey, value] of Object.entries(parsed)) {
      const key = rawKey.replace(/^\uFEFF/, '');
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      const existing = process.env[key];
      if (existing !== undefined && existing !== '') continue; // real value already set: leave it
      const trimmed = typeof value === 'string' ? value.trim() : value;
      if (!trimmed) continue; // an empty entry in .env must not mask a later .env.local value
      process.env[key] = trimmed;
    }  }
}

loadEnvFiles();

const shared = JSON.parse(readFileSync(new URL('../brand/app-links.json', import.meta.url), 'utf8'));

const APP_WEB_ORIGIN = shared.appWebOrigin;
const SCAN_PATH = shared.scanPath;
const HOST = new URL(APP_WEB_ORIGIN).hostname;

// Placeholders are accepted on purpose: they let a local build exercise the files end to end.
const TEAM_ID = (process.env.APPLE_TEAM_ID || '').trim();
const BUNDLE_ID = (process.env.IOS_BUNDLE_ID || '').trim();
const ANDROID_PACKAGE = (process.env.ANDROID_PACKAGE || '').trim();
const FINGERPRINTS = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

const outDir = new URL('../public/.well-known/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const written = [];
const skipped = [];

// ---------- iOS ----------
const appleFile = new URL('apple-app-site-association', outDir);
if (TEAM_ID && BUNDLE_ID) {
  const body = {
    applinks: {
      details: [
        {
          appIDs: [`${TEAM_ID}.${BUNDLE_ID}`],
          // Only the scan screen, not the whole site.
          components: [{ '/': `${SCAN_PATH}*`, comment: 'scan' }],
        },
      ],
    },
  };
  writeFileSync(appleFile, JSON.stringify(body, null, 2) + '\n', 'utf8');
  written.push('apple-app-site-association');
} else {
  if (existsSync(appleFile)) rmSync(appleFile);
  skipped.push('apple-app-site-association (needs APPLE_TEAM_ID and IOS_BUNDLE_ID)');
}

// ---------- Android ----------
const assetFile = new URL('assetlinks.json', outDir);
if (ANDROID_PACKAGE && FINGERPRINTS.length) {
  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: FINGERPRINTS,
      },
    },
  ];
  writeFileSync(assetFile, JSON.stringify(body, null, 2) + '\n', 'utf8');
  written.push('assetlinks.json');
} else {
  if (existsSync(assetFile)) rmSync(assetFile);
  skipped.push('assetlinks.json (needs ANDROID_PACKAGE and ANDROID_SHA256_CERT_FINGERPRINTS)');
}

// A marker so an empty .well-known/ folder still survives git and the export.
const readme = new URL('README.txt', outDir);
if (!existsSync(readme)) {
  writeFileSync(
    readme,
    'App-link association files are generated here by `npm run app-links` at build time.\n' +
      'They are written from brand/app-links.json plus APPLE_TEAM_ID / IOS_BUNDLE_ID and\n' +
      'ANDROID_PACKAGE / ANDROID_SHA256_CERT_FINGERPRINTS. See docs/app-links.md.\n',
    'utf8',
  );
}

console.log(`[app-links] host ${HOST}, scan path ${SCAN_PATH}`);
for (const name of written) console.log(`[app-links] wrote public/.well-known/${name}`);
for (const name of skipped) console.warn(`[app-links] skipped ${name} — the web scanner keeps working without it`);
