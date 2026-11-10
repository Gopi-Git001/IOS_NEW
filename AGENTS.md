## Learned User Preferences

- Sign out lives only in the Profile screen; do not add it back to the Menu screen.
- When a request is marked investigation-only (or "don't change code"), only trace and report root causes with file and line references; make no code changes until the user picks a fix.
- When fixing bugs, keep the existing UI unchanged unless the user asks for UI changes.

## Learned Workspace Facts

- Run locally with `npx expo start --lan` (add `--clear` after env changes); test on a phone via Expo Go on the same Wi-Fi, or in the browser at `http://localhost:8081`.
- The app reads public Supabase settings (URL + publishable key) from `.env` (template: `.env.example`); `.env_new` is a git-ignored reference file that contains secrets, never copy its server keys into `.env`. Without `.env` the app runs in demo mode, skipping sign-in and opening straight to the camera.
- The app's display name is "Reallabel" and its auth deep-link scheme is `reallabel://auth`; the deployed web app is `https://app.sugardepth.com`.
- Supabase auth redirect allow-list: `reallabel://auth`, `exp://**`, `http://localhost:8081/**`, `https://app.sugardepth.com/**`.
- When changing Supabase auth settings, don't `supabase config push` the repo's full config (it can overwrite site URL and SMS settings); push a minimal temporary config with only the changed keys, after previewing the diff.
- GitHub repo is `kollaakhil/sugar-depth`; the owner deploys the web app to Vercel from `main`, so changes land via a feature branch and pull request into `main`. Never commit `.env_new` or `.cursor/`.
- The `gh` CLI isn't installed on this PC; open pull requests with a prefilled GitHub compare link instead.
- Edge Functions are published under `quickgob-*` slugs (`quickgob-scan-label`, `quickgob-quick-verdict`, `quickgob-delete-account`, `quickgob-phone-auth`) mapped in `supabase/config.toml`; a target Supabase project also needs the `quickgob` rate-limit migration and the `ANTHROPIC_API_KEY` / `TYPESAFE_API_KEY` secrets.
- Scan history is stored only on the device (AsyncStorage / browser localStorage, latest 50 scans via `src/lib/history.ts`); Supabase has no history table.
