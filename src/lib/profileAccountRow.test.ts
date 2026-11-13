// Regression guard: the Profile ACCOUNT row shows only the email (accountRowText). It must never bring back
// the @ (AtSign) icon or the "Google account" label. Only ProfileScreen.tsx is scanned; the privacy text in
// src/config.ts may still mention "Google account".
// PROFILE_SCREEN_FILE can point at another copy of the screen (used to prove this fails on the old code).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const file = process.env.PROFILE_SCREEN_FILE || new URL('../screens/ProfileScreen.tsx', import.meta.url);
const source = readFileSync(file, 'utf8');
const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('ProfileScreen does not import or use the AtSign icon', () => {
  assert.doesNotMatch(code, /\bAtSign\b/);
});

test('ProfileScreen has no "Google account" label', () => {
  assert.doesNotMatch(source, /Google account/i);
});

test('the ACCOUNT group renders <AccountRow text={accountRowText(...)} />', () => {
  const group = code.match(/<Group title="Account">([\s\S]*?)<\/Group>/);
  assert.ok(group, 'ACCOUNT group missing');
  assert.match(group[1], /<AccountRow\s+text=\{accountRowText\(/);
  assert.doesNotMatch(group[1], /<Row\b/, 'ACCOUNT group must not use a generic icon Row');
  assert.match(code, /import \{[^}]*\baccountRowText\b[^}]*\} from '\.\.\/lib\/display'/);
});
