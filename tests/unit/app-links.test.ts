import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { isScanLink, isScanPath, SCAN_URL, SCAN_DEEP_LINK } from '../../src/lib/scanLinks.ts';
import { WEBSITE_FROM_APP } from '../../src/config/appLinks.ts';

// One definition of "this link asks for the scan screen", used by the website's from-app mode and by
// the phone app's Universal Link / App Link / custom-scheme handler.

test('https scan link is a scan link', () => {
  assert.equal(isScanLink('https://app.sugardepth.com/scan'), true);
  assert.equal(isScanLink('https://app.sugardepth.com/scan/'), true);
  assert.equal(isScanLink('https://app.sugardepth.com/scan?x=1'), true);
  assert.equal(isScanLink('https://app.sugardepth.com/scan#top'), true);
});

test('custom scheme scan link is a scan link', () => {
  assert.equal(isScanLink('reallabel://scan'), true);
  assert.equal(isScanLink('reallabel:///scan'), true);
  assert.equal(isScanLink('reallabel://scan?from=site'), true);
  assert.equal(isScanLink('REALLABEL://SCAN'), true);
});

test('other links are not scan links', () => {
  assert.equal(isScanLink('https://app.sugardepth.com/'), false);
  assert.equal(isScanLink('https://app.sugardepth.com/profile'), false);
  assert.equal(isScanLink('https://sugardepth.com/scan'), false, 'the marketing site is not the scanner');
  assert.equal(isScanLink('https://app.sugardepth.com/scanning'), false);
  assert.equal(isScanLink('reallabel://auth'), false);
  assert.equal(isScanLink('reallabel://scanner'), false);
  assert.equal(isScanLink(''), false);
  assert.equal(isScanLink(null), false);
  assert.equal(isScanLink(undefined), false);
});

test('the shared URLs are built from the same values', () => {
  assert.equal(SCAN_URL, 'https://app.sugardepth.com/scan');
  assert.equal(SCAN_DEEP_LINK, 'reallabel://scan');
  assert.equal(WEBSITE_FROM_APP, 'https://sugardepth.com/?from=app');
});

test('the web path check only accepts /scan', () => {
  assert.equal(isScanPath('/scan'), true);
  assert.equal(isScanPath('/scan/'), true);
  assert.equal(isScanPath('/'), false);
  assert.equal(isScanPath('/profile'), false);
  assert.equal(isScanPath('/scanner'), false);
  assert.equal(isScanPath(''), false);
  assert.equal(isScanPath(null), false);
});

test('the marketing site APP_URL literal matches the shared config', () => {
  // sites/sugardepth/src/config.ts cannot import JSON (astro.config.mjs loads it with bare Node), so it
  // repeats the value as a literal. This is the guard that stops the two drifting.
  const source = readFileSync(new URL('../../sites/sugardepth/src/config.ts', import.meta.url), 'utf8');
  const found = /export const APP_URL = '([^']+)'/.exec(source);
  assert.ok(found, 'APP_URL literal not found in sites/sugardepth/src/config.ts');
  assert.equal(found![1], SCAN_URL, 'sites/sugardepth APP_URL must equal brand/app-links.json origin + scanPath');
});
