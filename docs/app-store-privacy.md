# App Store privacy answers (Sugar Depth, iOS)

Draft answers for App Store Connect → App Privacy, and the matching privacy manifest. Have them
reviewed before submission; they must match the published privacy policy (`links.privacy`, draft
text in `src/config.ts` → `privacyPolicyDraft`).

## Tracking

- The app does not track users (no ad SDKs, no data shared with data brokers, no cross-app linking).
- `NSPrivacyTracking: false`, no tracking domains.

## Data collected

| Data type (Apple category) | What | Purpose | Linked to user | Used for tracking |
| --- | --- | --- | --- | --- |
| Contact Info → Name | Name on the Google profile, which Supabase Auth keeps with the sign-in (not the display name typed in Profile, which stays on this phone) | App functionality (sign-in, account) | Yes | No |
| Contact Info → Email Address | Google account email (Supabase Auth) | App functionality (sign-in, account) | Yes | No |
| Identifiers → User ID | Supabase account id | App functionality (account, rate limiting) | Yes | No |
| User Content → Photos or Videos | Photo of the ingredient list, cropped to the guide box | App functionality (analysis) | Yes (sent with the signed-in request) | No |
| Diagnostics → Performance Data | Scan timing (`scanTiming`: stage times, photo size, platform, network type; allowlist in `supabase/functions/_shared/clientTrace.ts`) | App functionality / analytics (keep scans fast) | Yes (sent with the signed-in request) | No |

Not collected: location, contacts, health, financial info, browsing or search history, purchases,
audio (the camera plugin has `microphonePermission: false`), crash logs (no crash SDK).

Scan history (verdicts and ingredient lists) stays on the device in AsyncStorage and is never
sent to the server, so it is not "collected" in Apple's sense.

The display name and settings (strict mode, gentle mode, haptics, auto capture) are stored only
on this phone (AsyncStorage on iOS/Android, localStorage on the web: `quickgob.profile` in
`src/lib/account.ts`, `quickgab.prefs` in `src/lib/prefs.ts`). They are not sent to the server
and are not part of the account, so they are not "collected" either.

Signing out (Profile) keeps the scan history on this phone; Clear history in Menu removes it.
Signing out also resets the name and settings on this phone: the name and stats cache is cleared
and the settings go back to their defaults (`signOut()` → `clearLocalCache()` in
`src/lib/account.ts`). Deleting the account deletes the sign-in account (email, user id) from
Supabase, and the name, settings and scan history on this phone.

## Third-party processors

Label photos go from the app to our Supabase Edge Functions and then to:

- **Anthropic (Claude)**: vision model reads and lists the ingredients (`scan-label`).
- **TypeSafe (Jev, System One)**: gives the CLEAN / OKAY / BAD call (`quick-verdict`).

Sugar Depth does not store the photos (per `privacyPolicyDraft`). Supabase hosts the sign-in
account (Google name, email, user id) and receives the scan timing; it holds no display name or
settings.

## Guideline 5.1.2(i): consent for third-party AI

- The privacy policy draft says label photos go to third-party AI services and names both.
- Still needed (outside this change): an in-app notice before the first scan that names the AI
  services and asks the user to agree, stored so it shows once. It belongs in the camera / first
  scan flow (`CameraScreen.tsx`).

## Privacy manifest (`app.json` → `ios.privacyManifests`)

Expo SDK modules and AsyncStorage ship their own `PrivacyInfo.xcprivacy`; the app-level manifest
adds the required-reason APIs used by the app and React Native:

| API category | Reason | Why |
| --- | --- | --- |
| `NSPrivacyAccessedAPICategoryUserDefaults` | `CA92.1` | AsyncStorage / settings read and written by the app only |
| `NSPrivacyAccessedAPICategoryFileTimestamp` | `C617.1` | File timestamps of files in the app container (image cache, captured photo) |
| `NSPrivacyAccessedAPICategorySystemBootTime` | `35F9.1` | Elapsed time between events (React Native / `performance.now()` timing) |

`NSPrivacyCollectedDataTypes` is left empty in the manifest; the App Store Connect answers above
are the source of truth for the nutrition label. Re-check the generated `PrivacyInfo.xcprivacy`
and Xcode's privacy report on the first native build.
