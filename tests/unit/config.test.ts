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
