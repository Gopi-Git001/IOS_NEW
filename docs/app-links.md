# App links: "Scan a label" opens the right place

Tapping **Scan a label** on `sugardepth.com` should open the scanner in the best place available:

| Visitor | Where it goes |
|---|---|
| Laptop | the web scanner: `https://app.sugardepth.com/scan` |
| Phone **with** the app installed | the app's scan screen (Universal Links on iOS, App Links on Android) |
| Phone **without** the app | the web scanner: `https://app.sugardepth.com/scan` |
| Website opened **from** the app (the mascot) | back into the app's scan screen |

If the iOS Team ID or the Android fingerprint is not configured, nothing breaks: the association
files are simply not generated and every link opens the web scanner, exactly as before.

## One source of truth

`brand/app-links.json` holds the values both sides share:

```json
{
  "appWebOrigin": "https://app.sugardepth.com",
  "scanPath": "/scan",
  "appScheme": "reallabel",
  "siteOrigin": "https://sugardepth.com",
  "fromAppParam": "from",
  "fromAppValue": "app"
}
```

The app scheme is `reallabel`, not `sugardepth`: it is the scheme already in `app.json` and already
registered in the Supabase auth redirect list. Changing it would break Google sign-in.

- **App** reads it through `src/lib/scanLinks.ts` (pure, unit-tested) and `src/config/appLinks.ts`
  (adds the env-driven identifiers).
- **Website** reads it through `sites/sugardepth/src/data/app-links.ts`.

`src/config.ts` on the site keeps `APP_URL` as a plain literal because `astro.config.mjs` loads that
file with bare Node and cannot resolve an import. A unit test asserts the literal matches
`brand/app-links.json`, so they cannot drift.

## Website: from-app mode

Every "Scan a label" button renders `https://app.sugardepth.com/scan` in the HTML, so the no-JavaScript
and pre-script cases are the safe ones.

The mascot in the app opens `https://sugardepth.com/?from=app` in an in-app browser. A small inline
script in `sites/sugardepth/src/layouts/Base.astro` then:

1. sets `sessionStorage["sd-from-app"] = "1"`;
2. removes `from=app` from the address bar (`history.replaceState`), so a reload looks normal;
3. rewrites every anchor whose `href` is the web scan URL to `reallabel://scan`, adding
   `data-from-app="true"` (plain `<a href>`, no JS redirect);
4. repeats that on each Astro page load, so the flag survives navigating to `/how-it-works` and back.

The flag lives in `sessionStorage`, so it belongs to that one tab. A new tab behaves normally. Because
the rewrite reads the URLs from `<html data-scan-web>` / `<html data-scan-app>` — written from the same
`brand/app-links.json` — nothing hardcodes them in the script.

## Web app: the /scan route

There is no router; the app is a state machine in `App.tsx`. `src/config/scanRoute.ts` supplies:

- `wantsScanOnLoad()` — is the browser on `/scan` right now?
- `rememberScanIntent()` — keep that in `sessionStorage`, so a sign-in round trip comes back to it
  (Google strips the path from the return URL, so the path alone cannot carry it);
- `syncScanPath(scanning)` — put `/scan` in the address bar while the scanner shows, and take it out
  otherwise.

Signed out on `/scan` you get sign-in first, and land on the scanner afterwards. On a laptop the scan
screen keeps the centred 440 px column.

`/scan` is served by a rewrite in the root `vercel.json` (`/scan` and `/scan/*` → `/`), so the app loads
and reads the path itself.

## Web app: the association files

`scripts/make-app-links.mjs` (also `npm run app-links`, which `build:web` runs first) writes:

- `public/.well-known/apple-app-site-association` — no file extension, `components: [{"/": "/scan*"}]`
  so only the scan screen is claimed, not the whole site;
- `public/.well-known/assetlinks.json` — the Android package plus every fingerprint given.

Both land in `public/`, so `expo export` copies them to the output root and Vercel serves them as plain
files. The root `vercel.json` sets `Content-Type: application/json` for `/.well-known/*` and leaves every
other path's security headers untouched. They are generated artefacts, so
`public/.well-known/.gitignore` keeps them out of git.

If the values are missing the files are **not** written (any stale copies are removed) and the build
still succeeds, with one warning per file.

## Phone app

`app.json` carries:

- `ios.associatedDomains: ["applinks:app.sugardepth.com"]`
- `android.intentFilters`: `VIEW` + `autoVerify` for `https://app.sugardepth.com/scan`, categories
  `BROWSABLE` and `DEFAULT`
- `ios.bundleIdentifier` and `android.package` (both `app.sugardepth.scanner`; change them and the
  `.env` values must match)

`src/lib/scanLink.ts` handles both entry points in one place, using the same `isScanLink()` the website
uses: `https://app.sugardepth.com/scan` and `reallabel://scan`. On iOS it calls
`WebBrowser.dismissBrowser()` first, so the in-app browser closes before the app shows.

The mascot (`src/components/SmallMascot.tsx`) opens `https://sugardepth.com/?from=app` with
`WebBrowser.openBrowserAsync` on phones — an in-app browser, not the external one — so its Scan buttons
come back into the app. On the web the mascot is still an ordinary anchor to `https://sugardepth.com`.

## The two values that need the stores

Nothing here can be filled in from the repo; both come from the accounts that own the app:

| Env var | Where it comes from |
|---|---|
| `APPLE_TEAM_ID` | Apple Developer > **Membership** > Team ID (10 characters, e.g. `A1B2C3D4E5`) |
| `IOS_BUNDLE_ID` | must equal `ios.bundleIdentifier` in `app.json` |
| `ANDROID_PACKAGE` | must equal `android.package` in `app.json` |
| `ANDROID_SHA256_CERT_FINGERPRINTS` | Android: **EAS credentials** (`eas credentials`) and/or Play Console > **App integrity > App signing key certificate** > SHA-256. Comma separated. |

Set them where the web app is built (Vercel project `quickgob-web`, production environment). They are
identifiers, not secrets.

Use **both** Android fingerprints — the Play App Signing one and the EAS/upload one. Play re-signs the
bundle after the first upload, so a file containing only the upload fingerprint works in testing and
fails for real users.

## Manual test plan on a real device

Requires a TestFlight (iOS) or a signed release (Android) build. Expo Go cannot test Universal Links.

1. **No app installed.** On the phone, open `https://sugardepth.com` and tap Scan a label. Expect the
   web scanner at `app.sugardepth.com/scan`, sign-in if needed, then the scan screen.
2. **App installed, tap from a browser.** Same tap in Safari (iOS) or Chrome (Android). Expect the app
   to open on the scan screen, not a browser tab. If it opens the browser instead, the association file
   did not verify: check `https://app.sugardepth.com/.well-known/apple-app-site-association` returns
   JSON with no redirect, and for Android run
   `adb shell pm get-app-links app.sugardepth.scanner` to confirm `verified`.
3. **Mascot round trip.** In the app, tap the small mascot. The site should open *inside* the app, the
   address should read `sugardepth.com` with no `from=app` left visible, and its Scan button should
   return to the app's scan screen. Navigate to `/how-it-works` and back first: it must still return.
4. **New tab is normal.** On a laptop, open `https://sugardepth.com` in a fresh tab: Scan must go to
   the web scanner, never `reallabel://`.
5. **JavaScript off.** With JS disabled the Scan buttons must still be normal
   `https://app.sugardepth.com/scan` links.

## Checks that run automatically

- `tests/unit/app-links.test.ts` — which URLs count as a scan link (https, custom scheme, near misses
  like `/scanning` and `reallabel://scanner`), and that `/scan` is the only web path accepted.
- `npm run app-links` — prints `wrote` or `skipped` per file; a missing identifier is a warning, not a
  failure.
