// Real unique-key contention on the LOCAL database, with no model or production calls.
import { assertEquals } from 'jsr:@std/assert@1';
import { guestQuota, reserveGuestModel } from '../_shared/guest.ts';
import { admin, dropUser, makeUser } from './helpers.ts';

Deno.test('guest lifetime quota: concurrent inserts allow three and status is read-only', async () => {
  const user = await makeUser();
  try {
    const results = await Promise.all(Array.from({ length: 12 }, () => reserveGuestModel(admin, user.id, 'label', 3)));
    assertEquals(results.filter(Boolean).length, 3);
    assertEquals(await guestQuota(admin, user.id, 3), { limit: 3, remaining: 0 });
    assertEquals(await guestQuota(admin, user.id, 3), { limit: 3, remaining: 0 });
    assertEquals(await reserveGuestModel(admin, user.id, 'label', 3), false);
  } finally {
    await admin.from('quickgob_rate_limits').delete().eq('key', `guest:label:${user.id}`);
    await dropUser(user);
  }
});
