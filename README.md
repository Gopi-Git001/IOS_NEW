# Sugar Depth (formerly SUG_SCAN)

Point the phone at a food label, get one sugar verdict: **CLEAN**, **OKAY** or **BAD**.
Expo app (iOS + Android) with a Supabase backend. Full brief: [CLAUDE.md](CLAUDE.md).

## How a scan works

```
photo ──► quick-verdict ──► Jev (TypeSafe): CLEAN / OKAY / BAD
      └─► scan-label ────► Claude vision: sugar names → rules
```

The app waits for both (or Jev's 6 s), then shows one verdict that never changes. Jev's verdict is the one
shown; the rules step in if Jev is down or unsure, or if Jev says CLEAN but added sugar, an artificial
sweetener or alcohol was found. Rules table: [RULES.md](RULES.md). Local testing: [tests/README-local-testing.md](tests/README-local-testing.md).

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

## Repository layout

This repo holds the scanner app and its marketing sites side by side:

- **Root** (`App.tsx`, `src/`, `supabase/`, ...): the Expo scanner app and Supabase backend.
- **`sites/sugardepth/`**: the Sugar Depth marketing site (Astro, static). Deployed as its own Vercel project with Root Directory `sites/sugardepth`. See [sites/sugardepth/README.md](sites/sugardepth/README.md).
- **`sites/<name>/`**: any future marketing site goes in its own folder here, with its own `package.json` and Vercel project.

The sites don't import anything from the app, and the app doesn't import anything from `sites/`.
