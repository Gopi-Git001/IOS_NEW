# SUG_SCAN — QuickGAB

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
supabase secrets set ANTHROPIC_API_KEY=... TYPESAFE_API_KEY=...
# optional: supabase secrets set CLAUDE_MODEL=<faster model for the ingredient lists>
supabase functions deploy quick-verdict
supabase functions deploy scan-label
supabase functions deploy delete-account
```

## Tests and the character

```bash
npm run test:rules       # sugar rules, Jev request/response, verdict combining
npm run lottie           # regenerate the sugarcane animations in assets/lottie/
```
