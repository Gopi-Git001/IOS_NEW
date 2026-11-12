# Three-scan visitor trial

Branch `feat/guest-scans`, based on `a691eee`. No production settings, deployment, schema, or marketing-site changes are part of this PR.

## Acceptance and local flows

- With the web flag off, keep the existing Google-first entry. With the server flag off or configuration unavailable, also show Google-first entry.
- With both flags on, open the camera without creating an account. The first capture silently creates one guest session. Show server-reported free scans remaining.
- Each guest account gets three lifetime scan requests by default, never three per day. The third completed attempt invites Google sign-in without discarding the result.
- Closing the invitation allows viewing the result and device history; another scan opens the invitation again. Profile and the camera's Sign in link open the existing Google screen.
- Google OAuth replaces the guest session. Do not sign out or clear local history as part of this handoff. History remains device-only, not cloud-synced.
- Keep manual shutter, auto capture, menu/history, profile for full accounts, existing Google-first entry and return-from-OAuth errors working.

## Server enforcement and abuse controls

- All three paid routes (`scan`, `scan-label`, `quick-verdict`) use `_shared/guest.ts`. Guest identity uses signed server-owned `app_metadata.guest`, with the reserved guest email domain covering older test accounts. Mutable user metadata never grants full-account quota.
- No migration: atomically insert unique lifetime reservation slots in existing service-role-only `public.quickgob_rate_limits`. Keys are `guest:label:<id>` and `guest:verdict:<id>`, each with at most `GUEST_SCAN_LIMIT` rows. Reserved `window_start` timestamps start in year 9999, so the existing RPC's two-day cleanup cannot reset a trial. These rows require explicit deletion for account/data retention; they do not expire automatically.
- Every guest paid request reserves one whole trial slot across both counters: unified scans use one slot, legacy parallel fallback uses two per captured label, and a lists retry uses one; all routes share a hard three-request ceiling.
- Paid failures/unreadable images consume allowance. Reservation failure is conservative: if one counter reservation succeeds but the next fails, the first is not refunded. At most three paid requests are admitted per guest at the default setting, even with concurrent or mixed-endpoint requests. No automatic paid retries are added.
- Account creation retains the global fixed-hour `GUEST_HOURLY_LIMIT` (default 20), and adds `GUEST_IP_HOURLY_LIMIT` (default 3) using the existing atomic RPC. IP reservation happens first; denied/failed creation attempts can consume a reservation. Counters increment even on denial. No new account is created on configuration/status/warm/timing calls.
- IP keys are HMAC-SHA256 using `GUEST_IP_SALT`; neither raw IPs nor the salt are logged by this feature. Only `CF-Connecting-IP` is accepted, without trusting arbitrary X-Forwarded-For fallbacks. Missing/invalid IP, salt, or database access fails closed.
- Rollout prerequisite: verify the hosted ingress overwrites `CF-Connecting-IP` and cannot be bypassed. This header trust contract has not been production-probed. Do not treat IP limiting as spoof-proof until verified. NAT users share one allowance; IPv6 address rotation, VPNs, different browsers/devices and disposable accounts are not a person-level identity check.
- There is no CAPTCHA, device fingerprint, permanent per-person cap, or cleanup of orphaned guest Auth accounts. Clearing storage can create another account, subject to the IP/global creation caps. Fixed-hour boundaries permit adjacent-window bursts. Existing guest accounts remain limited per account even after storage is cleared.
- Full Google accounts retain the existing `SCAN_DAILY_LIMIT` (default 100) counters. Guest status, warm and timing calls never reserve a paid scan. The client counter is display only.
- This does not change the shared project's Auth provider/signup settings or require a Google provider on every non-guest JWT. Other valid non-guest accounts retain the existing authenticated allowance. Legacy test/evaluation guest accounts now also have the lifetime cap; use a regular local test account or explicitly raise the local guest limit for long evaluation runs.

## Rollout, owner-operated only

Deploy `quickgob-phone-auth`, `quickgob-scan`, `quickgob-scan-label`, and `quickgob-quick-verdict` together with their `_shared` imports, especially new `guest.ts` and existing `guard.ts`/`env.ts`, before enabling the trial. No migration.

Supabase secrets:
- `GUEST_SIGNIN=on` enables guest creation and paid guest requests; unset/off is the kill switch.
- `GUEST_SCAN_LIMIT=3` is optional (default 3, positive integer, maximum 100). Raising it grants existing guests additional slots; lowering it can immediately exhaust them.
- `GUEST_HOURLY_LIMIT=20` is optional, retaining the existing global new-account cap.
- `GUEST_IP_HOURLY_LIMIT=3` is optional, new accounts per ingress IP per fixed hour.
- `GUEST_IP_SALT` must be a newly generated, stable high-entropy server secret. Changing it resets IP buckets for the current hour. Never use a public build variable.
- Existing model secrets (`ANTHROPIC_API_KEY`, `TYPESAFE_API_KEY`, optional `CLAUDE_MODEL`), existing Supabase runtime keys and `SCAN_DAILY_LIMIT` remain unchanged. Existing `ALLOWED_ORIGINS`, if set, must include the app origin.

Vercel app project build environment:
- Set `EXPO_PUBLIC_GUEST_SCANS=1`, then rebuild/redeploy the web app. Unset/off keeps Google-first entry.
- Keep `EXPO_PUBLIC_GUEST_MODE` unset/off in production; it remains the old eager test-build path.
- Existing `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` remain required public settings. No server secret goes in Vercel or the Expo bundle.
- No marketing-site environment changes.

Disable server `GUEST_SIGNIN` first for an immediate paid-guest kill switch; disabling only the build flag does not invalidate already-issued guest sessions on older builds. Rebuild with the web flag removed to restore Google-first entry.

## Verification

- Root `npm ci`: exit 0; existing Node engine warnings and five moderate audit findings, no dependency/audit-fix changes.
- `npm run -s test:unit`: exit 0; 416 tests passed, 12 suites, no failures or skips. Includes concurrent lifetime reservations, strict mixed-route ceiling, normal-account compatibility, IP/global caps, and client display parsing.
- `npx tsc --noEmit` and `npm run build:web`: exit 0 each. Also built the flag-on preview with synthetic public Supabase settings.
- Marketing site `npm ci` and `npx -y -p node@24 -c 'npm run build'`: exit 0 each; 21 pages. Site source untouched.
- Deno check with each entrypoint's own config: `scan`, `scan-label`, `quick-verdict`, `phone-auth`, all exit 0. New/updated local integration test files also type-check.
- `npm run test:functions`: exit 1, blocked because Docker is not running; not a pass. Added real-database concurrency coverage under `_tests`, but could not execute it here.
- Local Puppeteer/Chrome synthetic camera and mocked Auth/Edge responses: exit 0 at 390px and 1440px. Checked camera-first, one guest creation, third-scan prompt, no fourth request, Google callback with three history records preserved, both flags off, exhausted returning session, creation refusal, and sign-in before camera permission.
- Screenshots are under `/home/user/workspace/shots/guest-*.png`; camera, prompt, sign-in, and history were visually inspected for overlap, clipping, and contrast. No real phone, real Google consent, deployed functions/database, or trusted-ingress IP behavior was verified. No production writes were performed.
