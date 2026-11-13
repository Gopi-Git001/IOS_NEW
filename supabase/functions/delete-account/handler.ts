// The delete-account logic with its Supabase calls passed in, so it can be unit tested without Deno or a network.
// No imports on purpose: src/lib/accountDeletion.test.ts runs this file under Node.

type AuthError = { code?: string; status?: number; message?: string } | null;

export type DeleteDeps = {
  /** Verifies the caller's access token with Supabase Auth (signature, expiry, user exists). */
  getUser: (jwt: string) => Promise<{ user: { id: string } | null; error: AuthError }>;
  /** Hard delete of the Auth user (never a soft delete: a soft-deleted user stays in Authentication > Users). */
  deleteUser: (id: string) => Promise<{ error: AuthError }>;
  /** Reads the user back after the delete, to confirm it is really gone. */
  getUserById: (id: string) => Promise<{ user: { id: string } | null; error: AuthError }>;
  logError?: (message: string, detail?: unknown) => void;
};

const notFound = (e: AuthError) => !!e && (e.code === 'user_not_found' || e.status === 404);

export const DELETE_FAILED = 'Could not delete account. Try again.';

/**
 * POST with `Authorization: Bearer <user access token>` → 200 `{ deleted: true }` only when the Auth user is gone.
 * The function is deployed with --no-verify-jwt, so the token check happens here (`getUser`), and the id to delete
 * only ever comes from that verified token: a caller can never delete someone else.
 */
export async function handleDelete(req: Request, deps: DeleteDeps, headers: Record<string, string> = {}): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const jwt = /^Bearer\s+(.+)$/i.exec(req.headers.get('Authorization') ?? '')?.[1]?.trim();
  if (!jwt) return json({ error: 'Not signed in', deleted: false }, 401);

  const caller = await deps.getUser(jwt);
  // Auth checked the signature first, so "user not found" means a valid token whose user is already deleted
  // (a retry after the first reply was lost). The account no longer exists, which is what was asked.
  if (notFound(caller.error)) return json({ deleted: true, already: true });
  const userId = caller.user?.id;
  if (caller.error || !userId) return json({ error: 'Not signed in', deleted: false }, 401);

  const removed = await deps.deleteUser(userId);
  if (removed.error && !notFound(removed.error)) {
    deps.logError?.('delete user failed', removed.error.message ?? removed.error.code);
    return json({ error: DELETE_FAILED, deleted: false }, 500);
  }

  // Confirm: only report success when Auth no longer has the user.
  const check = await deps.getUserById(userId);
  if (check.user || (check.error && !notFound(check.error))) {
    deps.logError?.('user still present after delete', check.error?.message ?? 'present');
    return json({ error: DELETE_FAILED, deleted: false }, 500);
  }
  return json({ deleted: true });
}
