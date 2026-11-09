## Learned User Preferences

- Sign out lives only in the Profile screen; do not add it back to the Menu screen.

## Learned Workspace Facts

- Run locally with `npx expo start --lan` (add `--clear` after env changes); test on a phone via Expo Go on the same Wi-Fi, or in the browser at `http://localhost:8081`.
- The app reads public Supabase settings (URL + publishable key) from `.env` (template: `.env.example`); `.env_new` is a git-ignored reference file that contains secrets, never copy its server keys into `.env`. Without `.env` the app runs in demo mode, skipping sign-in and opening straight to the camera.
- The app's display name is "Reallabel" and its auth deep-link scheme is `reallabel://auth`; the deployed web app is `https://app.sugardepth.com`.
- Supabase auth redirect allow-list: `reallabel://auth`, `exp://**`, `http://localhost:8081/**`, `https://app.sugardepth.com/**`.
- When changing Supabase auth settings, don't `supabase config push` the repo's full config (it can overwrite site URL and SMS settings); push a minimal temporary config with only the changed keys, after previewing the diff.
