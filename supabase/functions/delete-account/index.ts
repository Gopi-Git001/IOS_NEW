// POST (no body) → { deleted: true }. Permanently deletes the signed-in user's account.
import { withSupabase } from 'npm:@supabase/server@1.9.2';

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return Response.json({ error: 'Use POST' }, { status: 405 });

    const userId = ctx.userClaims?.id;
    if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 });

    // Only ever the caller's own id, taken from their verified token.
    // Hard delete (no soft delete): the Auth user, its sessions and its Google identity go, so the same Google
    // account signs up fresh next time. No public table holds user rows (scan history lives on the phone).
    const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
    // Already gone (a retry after the first reply was lost): the account no longer exists, which is what was asked.
    const alreadyGone = error && ((error as { code?: string }).code === 'user_not_found' || (error as { status?: number }).status === 404);
    if (error && !alreadyGone) {
      console.error('delete user failed', error);
      return Response.json({ error: 'Could not delete account. Try again.' }, { status: 500 });
    }
    return Response.json({ deleted: true });
  }),
};
