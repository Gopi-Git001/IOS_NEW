/**
 * The order of "Delete account" (App Store guideline 5.1.1(v)), kept free of app imports so it can be unit tested.
 *
 * 1. Delete the account on the server (`deleteAccount` in api.ts: the Edge Function, then a local sign-out).
 *    If that fails (no network, server error), nothing on this phone is touched and the error goes to the caller,
 *    which shows "Delete failed": the account and its history stay.
 * 2. Only after the server said yes: clear everything kept on this phone (profile cache, settings, scan history).
 *    Every step runs even if an earlier one throws; the account is already gone, so a local hiccup is not reported
 *    as "Delete failed".
 *
 * A second tap while a delete is running joins the running one instead of calling the server twice.
 */
export function createAccountDeleter(deleteOnServer: () => Promise<void>, clearLocal: (() => void)[]) {
  let running: Promise<void> | null = null;

  const run = async () => {
    await deleteOnServer();
    for (const clear of clearLocal) {
      try {
        clear();
      } catch {
        // Keep clearing the rest.
      }
    }
  };

  return () => {
    running ??= run().finally(() => {
      running = null;
    });
    return running;
  };
}
