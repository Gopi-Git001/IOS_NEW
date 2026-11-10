# Testing this branch against LOCAL Supabase (Windows PowerShell)

Nothing here touches the live project: no `supabase functions deploy`, no `supabase config push`.
Everything runs against the local stack in Docker (`http://127.0.0.1:54321`). Run all commands from the
repo root (`C:\Users\akhil\OneDrive\Desktop\SugarDepth`).

| File | What it holds | In git? |
|---|---|---|
| `supabase/functions/.env.local` | Claude + Jev keys for `functions serve` (you paste them) | no (gitignored) |
| `.env.local` | the app's local Supabase URL + key, written by a script | no (gitignored) |
| `supabase/functions/_tests/.env.test` | fake keys for `npm test` | yes (no real keys) |

## 0. Once: Docker and the local stack

Start Docker Desktop, then:

```powershell
git switch fix/verdict-rules
npx supabase start
```

`supabase start` applies every migration in `supabase/migrations` (including the `quickgob` rate limit).
`npx supabase status` prints the local URL and keys at any time.

## 1. Model keys (local only)

Confirm the file is ignored **before** you fill it (both lines must print a rule):

```powershell
git check-ignore -v supabase/functions/.env.local
git check-ignore -v .env.local
```

Then open it and paste the keys after the `=`:

```powershell
notepad supabase/functions/.env.local
```

`ANTHROPIC_API_KEY` and `TYPESAFE_API_KEY` are required for real scans; `CLAUDE_MODEL` is optional.
An empty Jev key makes Jev answer "unavailable" (the rules verdict is shown instead).

## 2. Serve the Edge Functions locally

Keep this window open (stop with Ctrl+C):

```powershell
npm run local:functions
```

This runs `npx supabase functions serve --env-file supabase/functions/.env.local` and serves
`quickgob-scan-label`, `quickgob-quick-verdict`, `quickgob-phone-auth` and `quickgob-delete-account`
at `http://127.0.0.1:54321/functions/v1/...`.

## 3. Eval against the local stack

In a second window. Create the local test user with a script (re-running it just resets the password):

```powershell
npm run local:user
```

It prints four lines; paste them into the same window. With the default local stack they are:

```powershell
$env:EVAL_SUPABASE_URL = 'http://127.0.0.1:54321'
$env:EVAL_SUPABASE_KEY = '<PUBLISHABLE_KEY from npx supabase status>'
$env:EVAL_USER_EMAIL = 'eval@local.test'
$env:EVAL_USER_PASSWORD = 'local-eval-password'
```

Then (step 2 must be running):

```powershell
npx -y tsx tests/eval/run-eval.mjs --dry-run
npx -y tsx tests/eval/run-eval.mjs
npx -y tsx tests/eval/run-eval.mjs --only 35-honey-nut-cheerios,14-zevia-cola
```

(`npm run eval` works too; the direct form avoids PowerShell dropping the `--` before `--only`.)
The eval only scores items with `verified: true` and `photo_status: "ok"` in `tests/eval/labels.json`.
Real scans call Claude and Jev with your keys; the run stops at $2. The report is `tests/eval/report.md`.

## 4. The app on your Android phone against the local stack

The phone and PC must be on the same Wi-Fi. Write `.env.local` (it overrides `.env` while it exists):

```powershell
npm run local:app-env
# or, if it picks the wrong adapter:
node scripts/local-supabase.mjs app-env --ip 192.168.1.43
```

It sets `EXPO_PUBLIC_SUPABASE_URL=http://<LAN IP>:54321`, the local publishable key,
`EXPO_PUBLIC_GUEST_MODE=1` (guest sign-in; `GUEST_SIGNIN=on` is already in `supabase/functions/.env.local`)
and `EXPO_PUBLIC_TEST_PHOTO=1` (the shutter uses `assets/test/label.jpg`; set it to `0` in `.env.local`
to scan with the camera).

Allow the phone through the Windows firewall once (run PowerShell **as Administrator**):

```powershell
New-NetFirewallRule -DisplayName "Supabase local API 54321" -Direction Inbound -Protocol TCP -LocalPort 54321 -Action Allow -Profile Private
New-NetFirewallRule -DisplayName "Expo Metro 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private
```

On the phone's browser open `http://<LAN IP>:54321/auth/v1/health`: any JSON reply means it can reach
the stack. Then start the app (step 2 must be running):

```powershell
npx expo start --lan --clear
```

Open it in Expo Go and sign in with the guest button.

## 5. Maestro on the phone

With step 2 and step 4 running and the phone connected over USB (`adb devices` lists it):

```powershell
maestro test .maestro -e EXPO_URL=exp://192.168.1.43:8081
maestro test .maestro/scan.yaml -e EXPO_URL=exp://192.168.1.43:8081
```

Use your LAN IP from step 4. The scan flows expect the test photo (Honey Nut Cheerios) to show **BAD**.

## 6. Unit and backend tests

```powershell
npm test
```

`npm run test:unit` needs nothing running. `npm run test:backend` uses the local stack and starts its own
`functions serve` with the fake keys in `.env.test`, so stop step 2 (Ctrl+C) first.

## 7. Back to the live project / stop

```powershell
Remove-Item .env.local
npx expo start --lan --clear
npx supabase stop
```
