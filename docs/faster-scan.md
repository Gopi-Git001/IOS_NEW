# Unified scan rollout

Worktree: `sd-perf`, branch `perf/faster-scan`, base `9f052c6`.
Scope: one-upload streaming, free authenticated warm-up, web auto-capture and private technical timing.
No deployments, remote writes, PRs or pushes are part of this change.

## Behavior

- `quickgob-scan` accepts `{image, scan_id}` and emits NDJSON `jev`, then `reading`.
- The reader starts alongside Jev. A negative Jev outcome never cancels the reader.
- The new function debits `label:<account>` once. This is the existing reader's quota, so mixed old/new clients share the same daily 100-reading allowance.
- Legacy `quick-verdict` still has its independent quota, unchanged. After exhausting the shared reader quota, a mixed-version client can obtain Jev-only results until that legacy quota is exhausted; strict cross-version accounting needs a separate limiter migration.
- Old `quickgob-quick-verdict` and `quickgob-scan-label` keep their response, guard and quota behavior. The latter delegates its identical model/rules logic to `_shared/reader.ts`.
- Client fallback is only on HTTP 404. Network/stream errors never retry a potentially paid scan.
- `{action:"warm"}` and `{action:"timing",trace:{...}}` require auth but skip validation, rate-limit and model calls.
- Technical traces are allowlisted both before sending and before logging. The single `scan_timing_client` line excludes identifiers, IPs, photos, free text, verdicts and model output.
- Auto-capture defaults on, web only: 240px-wide guide samples every 140ms, sharpness >=80 (manual minimum 20), mean frame change <=3, five qualifying samples spanning >=560ms.
- A shot locks auto-capture. Only returning to the camera plus two frames differing from the captured scene by >18 luma can re-arm it. A fresh stable hold is then required.
- Hidden tabs, open sheets and capture/scan work suspend sampling. Manual shutter remains available; native remains manual-only.

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

Local gates passed: `npm run test:rules` (153 tests), `npx tsc --noEmit`, `npm run build:web`.
Deno 2.9.8 passed all five entrypoints using `deno check --config supabase/functions/<name>/deno.json --lock supabase/functions/<name>/deno.lock --frozen-lockfile supabase/functions/<name>/index.ts`.
The existing root lock fails frozen validation due to stale workspace metadata and a missing direct Supabase specifier; it was not rewritten.
Unit coverage includes chunked UTF-8, immediate Jev delivery, error outcomes, whole-body fallback, conservative capture/re-arm and trace privacy.

Still needs an approved deployed test: gateway CORS/JWT behavior, actual incremental delivery, warm-up effectiveness, quota sharing, and receipt of the production timing line.
Still needs real phones: focus thresholds, scene-change sensitivity, hidden-tab behavior, manual override, Android still capture and iOS Safari fallback.
Sharpness is not semantic label recognition; a sharp, steady non-label may still trigger a paid scan, so validate conservatively before launch.
