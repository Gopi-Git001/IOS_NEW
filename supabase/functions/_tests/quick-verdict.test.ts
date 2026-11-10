// quickgob-quick-verdict against the local stack. TYPESAFE_API_KEY is unset in .env.test, so Jev
// answers "unavailable" without a network call and the app falls back to the rules verdict.
import { assertEquals } from 'jsr:@std/assert@1';
import { call, dropUser, exhaustLimit, JPEG, makeUser } from './helpers.ts';

const SLUG = 'quickgob-quick-verdict';

Deno.test('quickgob-quick-verdict', async (t) => {
  const user = await makeUser();
  try {
    await t.step('rejects GET', async () => {
      assertEquals((await call(SLUG, { method: 'GET', token: user.token })).status, 405);
    });

    await t.step('rejects a caller with no token', async () => {
      assertEquals((await call(SLUG, { body: { image: JPEG } })).status, 401);
    });

    await t.step('body is not JSON -> 400', async () => {
      assertEquals((await call(SLUG, { token: user.token, rawBody: '{' })).status, 400);
    });

    await t.step('not a JPEG -> 400', async () => {
      const r = await call(SLUG, { token: user.token, body: { image: 'iVBORw0KGgo' + 'A'.repeat(200) } });
      assertEquals(r.status, 400);
      assertEquals(r.json?.error, 'Send a JPEG photo as base64 in "image"');
    });

    await t.step('no Jev key -> 200 with jev "unavailable" (never throws)', async () => {
      const r = await call(SLUG, { token: user.token, body: { image: JPEG, scan_id: 'fn-test', client: { platform: 'test' } } });
      assertEquals(r.status, 200, r.text);
      assertEquals(r.json?.jev, { status: 'unavailable', reason: 'TYPESAFE_API_KEY not set' });
    });

    await t.step('over the daily limit -> 429', async () => {
      await exhaustLimit(`verdict:${user.id}`);
      const r = await call(SLUG, { token: user.token, body: { image: JPEG } });
      assertEquals(r.status, 429);
      assertEquals(r.json?.code, 'rate_limited');
    });
  } finally {
    await dropUser(user);
  }
});
