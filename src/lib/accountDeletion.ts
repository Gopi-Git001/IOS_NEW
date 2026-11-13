/**
 * The order of "Delete account" (App Store guideline 5.1.1(v)), kept free of app imports so it can be unit tested.
 *
 * 1. Ask the server to delete the account (`deleteAccount` in api.ts calls the `quickgob-delete-account` slug).
 *    It counts as deleted ONLY when the reply is HTTP 2xx with `{ deleted: true }` (`confirmDeleted`). Anything
 *    else (no network, an error status, a 200 without `deleted: true` from an old deployed function) throws:
 *    nothing on this phone is touched, the user stays signed in, and the caller shows "Delete failed".
 * 2. Only after the server confirmed: clear everything kept on this phone (profile cache, settings, scan history).
 *    Every step runs even if an earlier one throws; the account is already gone, so a local hiccup is not reported
 *    as "Delete failed".
 * 3. Then sign out locally (the account no longer exists), which takes the app back to sign-in.
 *
 * A second tap while a delete is running joins the running one instead of calling the server twice.
 * Dev builds log each step as `[delete] ...` (never tokens or user ids).
 */

export const DELETE_SLUG = 'quickgob-delete-account';
export const DELETE_FAILED = 'Could not delete account. Try again.';

export type DeleteReply = { status: number; data: unknown; message?: string };

/** Thrown when the server did not confirm the delete; `message` is safe to show. */
export class DeleteNotConfirmedError extends Error {}

/** True only for a 2xx reply whose body says `{ deleted: true }`. */
export function isDeleteConfirmed(reply: DeleteReply): boolean {
  const body = reply.data as { deleted?: unknown } | null;
  return reply.status >= 200 && reply.status < 300 && !!body && typeof body === 'object' && body.deleted === true;
}

/** Throws `DeleteNotConfirmedError` (server message, or the fallback) unless the reply confirms the delete. */
export function confirmDeleted(reply: DeleteReply): void {
  if (!isDeleteConfirmed(reply)) throw new DeleteNotConfirmedError(reply.message || DELETE_FAILED);
}

/** The `deleted` flag as a log-safe word: true, false or missing. */
export function deletedFlag(data: unknown): string {
  const v = data && typeof data === 'object' ? (data as { deleted?: unknown }).deleted : undefined;
  return v === true ? 'true' : v === false ? 'false' : 'missing';
}

type Log = (line: string) => void;

export function createAccountDeleter(
  deleteOnServer: () => Promise<void>,
  clearLocal: (() => void)[],
  signOutLocal: () => Promise<void> = async () => {},
  log: Log = () => {},
) {
  let running: Promise<void> | null = null;

  const run = async () => {
    await deleteOnServer();
    let failed = 0;
    for (const clear of clearLocal) {
      try {
        clear();
      } catch {
        failed++; // Keep clearing the rest.
      }
    }
    log(`[delete] local cleanup done (${clearLocal.length - failed}/${clearLocal.length} steps ok)`);
    try {
      await signOutLocal();
      log('[delete] signed out');
    } catch {
      log('[delete] sign-out failed (account already deleted)');
    }
  };

  return () => {
    running ??= run().finally(() => {
      running = null;
    });
    return running;
  };
}
