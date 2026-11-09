# SUG_SCAN — Sugar Hunter

Point the phone at a food label, get one sugar verdict: **CLEAN**, **BAD** or **UGLY**.
Expo app (iOS + Android) with a Supabase backend. Full brief: [CLAUDE.md](CLAUDE.md).

## How a scan works

```
photo ──► quick-verdict ──► Jev (TypeSafe): CLEAN / BAD / UGLY      ← shown first
      └─► scan-label ────► Claude vision: sugar names → rules       ← lists fill in
```

Jev's verdict is the one shown. The rules only step in if Jev is down or unsure.

## Run it

```bash
npm install
npm start                # open in Expo Go on a real phone
```

Without Supabase settings in `.env` the app runs in demo mode with fake results.

## Backend

```bash
# Secrets live only in Supabase secrets, never in source (see supabase/functions/.env.example)
npx supabase secrets set --env-file supabase/functions/.env
npx supabase db push                     # applies supabase/migrations (rate limiter)
npx supabase functions deploy scan-label --no-verify-jwt     # deployed as quickgob-* in the shared project
npx supabase functions deploy quick-verdict --no-verify-jwt
npx supabase functions deploy delete-account --no-verify-jwt
npx supabase functions deploy phone-auth --no-verify-jwt     # guest sign-in for testing builds only
```

### Security notes
- Scans need a signed-in user and are capped per account per day (`SCAN_DAILY_LIMIT`, default 100).
- Guest sign-in is off unless `GUEST_SIGNIN=on`, and capped by `GUEST_HOURLY_LIMIT` (default 20/hour).
- Uploads must be base64 JPEGs under ~4.5 MB.
- The web build ships security headers from `vercel.json`. The full CSP is report-only until it is checked against the live app.
- CI runs type checks, tests, `npm audit` and gitleaks on every PR.

## Tests and the character

```bash
npm run test:rules       # sugar rules, Jev request/response, verdict combining
npm run lottie           # regenerate the sugarcane animations in assets/lottie/
```
