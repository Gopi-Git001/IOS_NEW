import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appStoreId, links, privacyPolicyDraft } from '../../src/config';

test('Rate link never opens the placeholder App Store id', () => {
  assert.ok(!links.appStore.includes('id0000000000'));
  if (!appStoreId) assert.equal(links.appStore, links.website);
  else assert.equal(links.appStore, `https://apps.apple.com/app/id${appStoreId}`);
});

test('privacy policy names the third-party AI processors', () => {
  assert.match(privacyPolicyDraft, /Anthropic/);
  assert.match(privacyPolicyDraft, /TypeSafe/);
  assert.match(privacyPolicyDraft, /third-party AI/);
});

test('privacy policy says what signing out does', () => {
  assert.match(privacyPolicyDraft, /Signing out keeps the scan history on this phone; Clear history in Menu removes it\./);
  assert.match(privacyPolicyDraft, /Signing out also resets the name and settings on this phone/);
});

test('privacy policy says the name and settings stay on this phone', () => {
  assert.match(privacyPolicyDraft, /Your display name and settings are stored only on this phone; they are not sent to our server\./);
  assert.doesNotMatch(privacyPolicyDraft, /saved to your account/i);
  assert.doesNotMatch(privacyPolicyDraft, /(saved|stored) (to|in|with) (your|the) (account|server)/i);
});

test('privacy policy says what deleting the account removes', () => {
  assert.match(privacyPolicyDraft, /Deleting your account permanently deletes your sign-in account \(email and user id\) from our server, and your name, settings and scan history from this phone\./);
});
