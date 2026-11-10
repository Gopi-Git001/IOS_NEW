// quickgob-phone-auth (guest sign-in for testing builds) against the local stack. GUEST_SIGNIN=on in .env.test.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { anonClient, call, dropUser } from './helpers.ts';

const SLUG = 'quickgob-phone-auth';

Deno.test('quickgob-phone-auth', async (t) => {
  // The local Kong gateway stamps "Access-Control-Allow-Origin: *" over the function's own header,
  // so the allow-list can only be observed where the gateway passes it through.
  const probe = await call(SLUG, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
  const gatewayOverridesCors = probe.headers.get('Access-Control-Allow-Origin') === '*';
  const corsNote = gatewayOverridesCors ? ' (skipped: local gateway sends *)' : '';

  await t.step({
    name: `CORS preflight allows the app origin${corsNote}`,
    ignore: gatewayOverridesCors,
    fn: async () => {
      const r = await call(SLUG, { method: 'OPTIONS', headers: { Origin: 'http://localhost:8081' } });
      assertEquals(r.status, 200);
      assertEquals(r.headers.get('Access-Control-Allow-Origin'), 'http://localhost:8081');
    },
  });

  await t.step({
    name: `CORS preflight does not allow other origins${corsNote}`,
    ignore: gatewayOverridesCors,
    fn: () => assertEquals(probe.headers.get('Access-Control-Allow-Origin'), null),
  });

  await t.step('preflight answers 200 and varies on Origin', () => {
    assertEquals(probe.status, 200);
    assert(probe.headers.get('Vary')?.includes('Origin'));
  });

  await t.step('rejects GET', async () => {
    assertEquals((await call(SLUG, { method: 'GET' })).status, 405);
  });

  await t.step('body is not JSON -> 400', async () => {
    assertEquals((await call(SLUG, { rawBody: 'nope' })).status, 400);
  });

  await t.step('unknown action -> 400 (the old SMS actions are gone)', async () => {
    for (const action of ['send', 'verify', 'sms', undefined]) {
      const r = await call(SLUG, { body: { action, phone: '+15555550100' } });
      assertEquals(r.status, 400, `action ${action}`);
      assertEquals(r.json?.error, 'Unknown action');
    }
  });

  await t.step('guest -> a token that signs in a hidden guest account', async () => {
    const r = await call(SLUG, { body: { action: 'guest' } });
    assertEquals(r.status, 200, r.text);
    const tokenHash = r.json?.token_hash;
    assert(typeof tokenHash === 'string' && tokenHash.length > 10);
    const { data, error } = await anonClient().auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    assertEquals(error, null);
    const user = data.user!;
    try {
      assertEquals(user.user_metadata?.guest, true);
      assert(user.email?.endsWith('@guest.sugarhunter.app'));
    } finally {
      await dropUser(user.id);
    }
  });
});
