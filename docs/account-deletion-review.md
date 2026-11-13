# Account deletion review (App Store guideline 5.1.1(v))

Task 12 in `docs/ios-readiness.md`. I reviewed the code end to end on branch `agent/account-deletion-review`.
No call went to the live Supabase project. The backend behaviour below comes from reading the code, and the client
order is covered by unit tests (`src/lib/accountDeletion.test.ts`). Checks that need the real backend are in the
iPhone checklist at the end.

**Verdict: in-app deletion exists, is reachable, and deletes the Auth user for real (hard delete).** No blocker
was found. Two robustness gaps are fixed in this branch: double tap, and a retry after a lost reply. The
edge-function half of the retry fix only takes effect once a human deploys it.

## Flow, step by step

| # | Step | File:line | What happens | OK / gap |
|---|------|-----------|--------------|----------|
| 1 | Reach Profile | `src/components/Chrome.tsx:24` (`ProfileButton`), `App.tsx:229-231`, `App.tsx:272` | The avatar in the top-right of the camera and result screens opens the Profile sheet directly (tap 1). | OK |
| 2 | Delete row | `src/screens/ProfileScreen.tsx:51` | "Delete account" row (red, trash icon) in the Session group (tap 2). Profile → Delete takes two taps from the camera. | OK |
| 3 | Demo mode | `src/screens/ProfileScreen.tsx:185`, `src/components/ListUI.tsx:96` | Without `.env` the row shows the "Demo mode … no account to … delete" alert and returns. Nothing else runs, so it can't crash. | OK |
| 4 | Confirm dialog | `src/screens/ProfileScreen.tsx:186-197`, `src/lib/confirm.ts:6` | iOS `Alert` titled "Delete account?" with the text "This **permanently** deletes your Reallabel account and all of your scan history. It cannot be undone.", plus Cancel and a destructive "Delete" button. The web build uses `window.confirm`. | OK |
| 5 | Client orchestration | `src/lib/account.ts:60`, `src/lib/accountDeletion.ts` | `deleteAccountAndData` = `createAccountDeleter(deleteAccount, [clearLocalCache, clearHistory])`. Server first. Local data is cleared only after the server succeeds. A second tap joins the running request. | OK (fixed: double tap) |
| 6 | API call | `src/lib/api.ts:161-166` | `supabase.functions.invoke('quickgob-delete-account', { method: 'POST' })` sends the user's JWT. On error it throws with the server or network message. On success it calls `supabase.auth.signOut({ scope: 'local' })`. | OK |
| 7 | Function mapping | `supabase/config.toml:451-454` | `quickgob-delete-account` uses `verify_jwt = true` and points at `functions/delete-account/index.ts`. | OK |
| 8 | Auth check | `supabase/functions/delete-account/index.ts:5-9` | `withSupabase({ auth: 'user' })` verifies the token. The user id comes only from the verified claims, so a caller can't delete anyone else. Non-POST requests get 405. | OK |
| 9 | Delete Auth user | `supabase/functions/delete-account/index.ts:14` | `auth.admin.deleteUser(userId)` with no soft-delete flag, so it is a hard delete. Postgres cascades remove `auth.identities` (the Google link), sessions and refresh tokens. | OK |
| 10 | DB rows | `supabase/migrations/20261109160000_quickgob_rate_limit.sql` | The only public table is `quickgob_rate_limits`, with text keys such as `label:<uuid>`. It holds counters, not personal content, and rows are purged after 2 days. There is no profiles or history table. | OK (Low note, G4) |
| 11 | Server error | `supabase/functions/delete-account/index.ts:17-19`, `src/screens/ProfileScreen.tsx:192-194` | 500 "Could not delete account. Try again." leads to an alert "Delete failed" with that message. The account, history, profile and session stay. | OK |
| 12 | Network failure | `src/lib/api.ts:163`, `src/lib/accountDeletion.ts` | `invoke` returns a fetch error, `deleteAccount` throws before signOut, and no local step runs. "Delete failed" is shown and the user stays signed in. Unit test: "network failure: throws and keeps everything on the phone". | OK |
| 13 | Session end | `src/lib/api.ts:165`, `App.tsx:106`, `App.tsx:132-138`, `App.tsx:228` | The local signOut fires `SIGNED_OUT`, so `session` becomes null. App clears the scan and sheet (Profile closes) and `mustSignIn` renders `SignInScreen`. | OK |
| 14 | Clear profile cache + settings | `src/lib/account.ts:45-48`, `src/lib/prefs.ts:50` | `quickgob.profile` is reset to `{ displayName: null, stats: null }` and `quickgab.prefs` to the defaults. Both are written to AsyncStorage. | OK |
| 15 | Clear history | `src/lib/history.ts:29`, `src/lib/stored.ts:37-43` | `quickgab.history` is set to `[]` and written to AsyncStorage. This holds even if the store had not finished loading, because `changedBeforeLoad` makes the empty value win. Unit test: 50 saved scans are cleared and stay empty after a restart. | OK |
| 16 | Fresh profile on re-sign-in | `App.tsx:141-144`, `src/lib/account.ts:26` | Google sign-in creates a new Auth user, because the old identity was deleted. The profile is local only and was reset, so the name is empty and stats are 0. | OK |
| 17 | Guest (testing builds) | `App.tsx:136`, `src/lib/api.ts:161-166` | The same function and client path run, and the guest user's Auth row is deleted. Then, because `guestMode` testing builds have no sign-in step, App signs in a **new** guest user right away instead of showing sign-in. The behaviour is the same apart from where it lands. | OK (expected difference) |

## Gaps

| ID | Severity | Gap | Status |
|----|----------|-----|--------|
| G1 | Medium | **A lost reply leaves the user stuck.** The server deletes the user but the reply never arrives (the phone drops off Wi-Fi). The client shows "Delete failed" and keeps the old session. Before this branch, a retry called `deleteUser` on a missing user, got 404, and showed "Delete failed" again. Local data was then cleared only when token refresh later failed, and that path (`signOut` elsewhere) does not clear history. | **Fixed in repo, needs deploy by human**: `delete-account/index.ts:15-17` treats `user_not_found`/404 as `{ deleted: true }`, so a retry succeeds and the client clears everything. Caveat: if `withSupabase({ auth: 'user' })` checks the user against Auth rather than only the JWT signature, a retry gets 401 "Not signed in" before reaching this code. See R1. |
| G2 | Low | **Double tap.** While the request was in flight the user could reopen the dialog and fire a second delete. | **Fixed (client)**: `createAccountDeleter` joins the running delete. Unit test "double tap". |
| G3 | Low | **No progress indicator** while deleting (about 1 s). The sheet stays as it is until the sign-in screen appears. | Not changed, because the UI stays as is unless asked. Suggest a "Deleting…" row state later. |
| G4 | Low | Rate-limit counters keyed `label:<user id>` survive for up to 2 days after deletion. They are anonymous counters with no content. | Acceptable. They are purged automatically. |
| G5 | Low | Scan consent (`quickgab.scanConsent`) is kept on the device after delete. It is consent for this device to send photos, not account data. | Acceptable. Mention it if review asks. |
| G6 | Low | A non-`Error` rejection would have shown "Delete failed" with an empty message. | **Fixed (client)**: `ProfileScreen.tsx:192-194` falls back to "Could not delete account. Try again." |
| G7 | Info | If a local clear step throws after the server delete succeeded, the old code skipped the rest and reported "Delete failed" for an account that was already gone. | **Fixed (client)**: every local step runs, and errors are swallowed because the account is gone. Unit test. |

## Changes in this branch

- `src/lib/accountDeletion.ts` (new) + `src/lib/accountDeletion.test.ts` (new, 7 tests): delete order, failure keeps data, retry, double tap, and clearing a 50-scan history on persisted storage.
- `src/lib/account.ts`: `deleteAccountAndData` now uses `createAccountDeleter`.
- `src/screens/ProfileScreen.tsx`: safer "Delete failed" message. No visual change.
- `supabase/functions/delete-account/index.ts`: idempotent on an already deleted user. **Repo only, needs deploy by human.**

## Follow-up: user still in Authentication > Users (branch `agent/delete-account-fix`)

The owner deleted an account in the app and the user was still listed in Supabase. Causes found:

- **Wrong deploy slug.** The app calls `quickgob-delete-account` (`supabase/config.toml` maps it to
  `functions/delete-account/index.ts`). The README deploy line was `functions deploy delete-account`, which publishes a
  different slug. Following the README never updated the function the app calls, so the G1 fix above was never live.
  The README line belongs to another owner and is unchanged. Use
  `npx supabase functions deploy quickgob-delete-account --project-ref <ref> --no-verify-jwt` (humans only).
- **The client trusted any 2xx.** `deleteAccount` signed out on any non-error reply, so a stale function that replied
  2xx without deleting looked like a success. Now the client needs HTTP 2xx **and** `{ deleted: true }`
  (`confirmDeleted` in `src/lib/accountDeletion.ts`). Order: server confirms, then local cleanup, then local sign-out.
  ProfileScreen shows "Account deleted" only after that. On anything else it shows "Delete failed", touches nothing,
  and the user stays signed in.
- **The server never checked its own work.** `delete-account` now verifies the caller's token itself
  (`auth.getUser`, so `--no-verify-jwt` is safe), hard-deletes (`deleteUser(id, false)`), reads the user back, and
  returns `{ deleted: true }` only if the user is gone. Otherwise it returns 500 `{ deleted: false }`. A valid token
  whose user is already gone returns `{ deleted: true, already: true }`, which closes G1 and the R1 caveat. Logic is in
  `delete-account/handler.ts` and unit tested from `src/lib/accountDeletion.test.ts`.
- Dev builds log `[delete] tap / confirm / request sent <slug> / server reply status=… deleted=… / local cleanup /
  signed out` (no tokens, no ids).
- `supabase/functions/_tests/delete-account.test.ts` ("cannot delete again" expects non-200) contradicts the
  idempotent retry. It needs updating by its owner.

## Needs a human

- **R1 (deploy)**: deploy `quickgob-delete-account` from this repo (README deploy command, human only). Then check G1's caveat: after a successful delete, call the function again with the old access token from a test account. It should return `{ deleted: true }` (or 401). If it returns 401, `src/lib/api.ts` `deleteAccount` should treat a 401 *after a delete was attempted* as success. That file belongs to another task and was not edited here.
- **R2 (dashboard)**: after deleting on the phone, check Supabase Dashboard → Authentication → Users that the user is gone.
- **R3 (optional api.ts change, other owner)**: in `deleteAccount` (`src/lib/api.ts:161-166`), `signOut({ scope: 'local' })` runs before the local data is cleared. That's fine today because both happen in the same tick. If that ever changes, keep the clear before any `await` after signOut.
