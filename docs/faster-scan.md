# Unified scan rollout

Worktree: `sd-perf`, branch `perf/faster-scan`, base `9f052c6`.
Scope: one-upload streaming, free authenticated warm-up, web auto-capture and private technical timing.
No deployments, remote writes, PRs or pushes are part of this change.

## Behavior

- `quickgob-scan` accepts `{image, scan_id}` and emits NDJSON `jev`, then `reading`.
- The reader starts alongside Jev. A negative Jev outcome never cancels the reader.
- The new function debits both legacy allowances once per scan: `label:<account>`, then `verdict:<account>`. Both must allow before either model starts, so mixed old/new clients share the same daily 100-call allowance for each model without a migration.
- The limiter increments denied hits. Checks are sequential and stop after the first denial, preserving verdict quota when the historically more-used label quota is exhausted. If the second check denies or fails, one label reservation is still consumed; fully atomic reservations would require a different RPC.
- Old `quickgob-quick-verdict` and `quickgob-scan-label` keep their response, guard and quota behavior. The latter delegates its identical model/rules logic to `_shared/reader.ts`.
- Client fallback is only on HTTP 404. Network/stream errors never retry a potentially paid scan.
- `{action:"warm"}` and `{action:"timing",trace:{...}}` require auth but skip validation, rate-limit and model calls.
- Technical traces are allowlisted both before sending and before logging. The single `scan_timing_client` line excludes identifiers, IPs, photos, free text, verdicts and model output.
- Auto-capture defaults on, web only: 240px-wide guide samples every 140ms, sharpness >=80 (manual minimum 20), mean frame change <=3, five qualifying samples spanning >=560ms.
- A shot locks auto-capture. The repeated lock inside `capture()` preserves the automatic shot's scene reference; a manual shot uses its latest sample instead. Only returning to the camera plus two frames differing from the captured scene by >18 luma can re-arm it, even when the new label is already visible on return. A fresh stable hold is then required.
- Hidden tabs, open sheets and capture/scan work suspend sampling. Manual shutter remains available; native remains manual-only.

## Main integration

- Gopi's live camera implementation is the baseline: mounted beneath results, paused preview, release after 60 seconds or hiding the page, 1920x1440 constraints, remembered Android torch camera, torch-only constraints and confirmed torch support.
- Prefer main's `uploadPlan` and direct-source canvas upload. The web camera encodes JPEG 0.85 once for upload; `preparePhoto` returns `photo.upload` without re-encoding, while native keeps its existing manipulator fallback.
- Preserve main's lists Retry UI and `retryLists` callback. Streaming has the same 12-second client deadline and retryable network/5xx failures; a user retry calls only the legacy reader with the same prepared image and metadata, never Jev.
- Both server endpoints use the shared reader with main's 10-second overall abort, one SDK retry, `reader_timeout`/`reader_unavailable` codes and up-front Claude-start log. Capture metadata remains logged as main's allowlisted `client_*` fields.
- Auto-capture re-arming now follows the camera becoming active again instead of assuming it remounts. Manual shutter locking and captured-scene references remain unchanged.
- Production timing remains narrowly allowlisted, including one-pass `encode_ms` and the torch-on `frame` capture path; camera labels stay out of the production timing payload.

## Deployment input

The existing `supabase/config.toml` entry maps slug `quickgob-scan` to:

- `supabase/functions/scan/index.ts`
- `supabase/functions/scan/deno.json`
- `supabase/functions/scan/deno.lock`
- `supabase/functions/_shared/clientTrace.ts`
- `supabase/functions/_shared/env.ts`
- `supabase/functions/_shared/guard.ts`
- `supabase/functions/_shared/jev.ts`
- `supabase/functions/_shared/reader.ts`
- `supabase/functions/_shared/timing.ts`
- `supabase/functions/_shared/rules.ts`
- `supabase/functions/_shared/policy.ts`
- `supabase/functions/_shared/normalize.ts`
- `supabase/functions/_shared/ingredients.ts`

Keep existing server secrets, including optional `CLAUDE_MODEL`. No migration is needed.
The legacy reader only needs redeployment if adopting the extracted source there; its already-deployed version remains compatible.

## Verification

Local gates passed: `npm run test:rules` (171 tests), all repository `*.test.ts` files (179 tests across 15 files), `npx tsc --noEmit`, `npm run build:web`.
Deno 2.9.8 passed all five entrypoints using `deno check --config supabase/functions/<name>/deno.json --lock supabase/functions/<name>/deno.lock --frozen-lockfile supabase/functions/<name>/index.ts`.
The existing root lock fails frozen validation due to stale workspace metadata and a missing direct Supabase specifier; it was not rewritten.
Unit coverage includes chunked UTF-8, immediate Jev delivery, whole-body fallback, stream deadline/late-event suppression, lists Retry without another Jev call, 404-only legacy fallback, negative Jev awaiting the reader, capture/re-arm including automatic and manual repeated locks, mixed-client model quotas, denied-hit accounting and trace privacy.

Still needs an approved deployed test: gateway CORS/JWT behavior, actual incremental delivery, warm-up effectiveness, quota sharing, and receipt of the production timing line.
Still needs real phones: focus thresholds, scene-change sensitivity, hidden-tab behavior, manual override, Android still capture and iOS Safari fallback.
Sharpness is not semantic label recognition; a sharp, steady non-label may still trigger a paid scan, so validate conservatively before launch.
