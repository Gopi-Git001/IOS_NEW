// quickgob-delete-account against the local stack.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { admin, call, dropUser, makeUser } from './helpers.ts';

const SLUG = 'quickgob-delete-account';

Deno.test('quickgob-delete-account', async (t) => {
  const user = await makeUser();
  const bystander = await makeUser();
  try {
    await t.step('rejects GET', async () => {
      assertEquals((await call(SLUG, { method: 'GET', token: user.token })).status, 405);
    });

    await t.step('rejects a caller with no token', async () => {
      assertEquals((await call(SLUG)).status, 401);
    });

    await t.step("deletes the caller's own account, and only that one", async () => {
      const r = await call(SLUG, { token: user.token });
      assertEquals(r.status, 200, r.text);
      assertEquals(r.json, { deleted: true });
      const gone = await admin.auth.admin.getUserById(user.id);
      assert(gone.error || !gone.data.user, 'the user is gone');
      const kept = await admin.auth.admin.getUserById(bystander.id);
      assertEquals(kept.data.user?.id, bystander.id, 'other accounts are untouched');
    });

    await t.step('the deleted account cannot delete again', async () => {
      const r = await call(SLUG, { token: user.token });
      assert(r.status !== 200, `second delete returned ${r.status}`);
    });
  } finally {
    await dropUser(user).catch(() => {});
    await dropUser(bystander);
  }
});
