import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createVerdictCardFile, shareVerdictCard } from './verdictCardExport.ts';
import { buildVerdictCardData } from './verdictCard.ts';

const file = new File(['png fixture'], 'sugar-depth-clean.png', { type: 'image/png' });
test('file-capable Web Share is called immediately with only the prepared image', async () => {
  let shared = false;
  const pending = shareVerdictCard(file, {
    navigator: { canShare: d => d.files[0] === file, share: async d => { assert.deepEqual(d, { files: [file] }); shared = true; } },
    download: () => assert.fail('should not download'),
  });
  assert.equal(shared, true, 'no async export before share: retain transient user activation');
  assert.equal(await pending, 'shared');
});
test('unsupported file sharing downloads the PNG', async () => {
  let downloaded: File | undefined;
  assert.equal(await shareVerdictCard(file, { navigator: { canShare: () => false }, download: f => { downloaded = f; } }), 'downloaded');
  assert.equal(downloaded, file);
});
test('blocked sharing or throwing canShare falls back to download', async () => {
  for (const navigator of [
    { canShare: () => true, share: async () => { throw new Error('Share blocked'); } },
    { canShare: () => { throw new Error('Files unsupported'); } },
  ]) {
    let downloaded = false;
    assert.equal(await shareVerdictCard(file, { navigator, download: () => { downloaded = true; } }), 'downloaded');
    assert.equal(downloaded, true);
  }
});
test('cancelling the native share sheet does not unexpectedly download', async () => {
  const error = new Error('Cancelled'); error.name = 'AbortError';
  assert.equal(await shareVerdictCard(file, { navigator: { canShare: () => true, share: async () => { throw error; } }, download: () => assert.fail('cancelled share must not download') }), 'cancelled');
});
test('native/non-browser imports are safe and image creation is guarded', async () => {
  const data = buildVerdictCardData({ verdict: 'CLEAN', headline: 'No added sugar', addedSugars: [], naturalSugars: [], sweeteners: [] }, new Date())!;
  await assert.rejects(createVerdictCardFile(data), /available in the web app/);
});
