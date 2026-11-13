# iOS readiness audit

Audit of `ios-dev` at 3403932 (Expo SDK 58, React Native 0.88). This is a docs-only change; no app code is changed here.
Each numbered task below is sized for one agent branch (`agent/<name>`).

Columns used in each task:

- **Owns**: the files the task may edit. Two tasks that own the same file should not run at the same time.
- **Priority**: MUST means it blocks an App Store submission or breaks the iPhone (Expo Go) test. LATER means polish or work that can wait until after the first TestFlight build.
- **NEEDS-BACKEND**: yes if it can only be verified once real Supabase values are set in `.env`, meaning a live or local Supabase with the `quickgob-*` functions. No if it can be verified in demo mode, by type checks, or by reading the config.

How the iPhone is tested during this sprint: Expo Go on a real iPhone (`npx expo start --lan`). There is no Apple developer account yet, so EAS, TestFlight, simulator and Maestro runs are out of scope. Tasks that only take effect in a native build (bundle identifier, privacy manifest, permission strings, Liquid Glass) are marked so. Their acceptance criteria can be checked with `npx expo config --type introspect` and `npx expo-doctor` until a build exists.

## What was checked

| Area | Current state | Where |
| --- | --- | --- |
| iOS config | `ios` holds only `supportsTablet: true`. No `bundleIdentifier`, `buildNumber`, `infoPlist`, `privacyManifests` or encryption flag. | `app.json:10-12` |
| Display name | `"name": "Sugar Depth"`. Workspace notes call the app "Reallabel". The scheme is `reallabel`. | `app.json:3-5` |
| Camera permission | Text is set through the `expo-camera` plugin. No `microphonePermission: false`, so a native build also asks for the microphone even though the app never records. | `app.json:32-37` |
| Appearance | `userInterfaceStyle: "light"`, but the camera and result screens are dark (`#0B0B0F` / `#06080D`). System alerts, the keyboard and action sheets will show in light style. | `app.json:9` |
| `expo-status-bar` plugin | Listed in `plugins`, added by `expo install`. `expo-doctor` passes 20/20 with it. | `app.json:48` |
| Store copy | The web description still uses the old verdict names ("Clean, Bad or Ugly"). | `app.json:26` |
| Camera | Native uses `expo-camera` `CameraView` with `takePictureAsync({ quality: 0.9 })`, a full-resolution still. Web uses `LabelCamera.web.tsx` with getUserMedia and auto-capture. | `src/components/LabelCamera.tsx:22`, `LabelCamera.web.tsx` |
| Crystal swarm | Native uses Skia (`CrystalSwarmSkia.tsx` + `crystalArt.ts`). Web uses Canvas 2D (`CrystalSwarm.web.tsx`). | `src/components/CrystalSwarm*.tsx` |
| Haptics | `expo-haptics` on the verdict (App), the shutter (Camera) and the panel. Calls are `.catch`-guarded. Gated by the `haptics` pref. | `App.tsx:162`, `CameraScreen.tsx`, `VerdictPanel.tsx` |
| Glass | Liquid Glass only when `Platform.OS === 'ios' && isLiquidGlassAvailable()`. Otherwise `expo-blur`. Web uses CSS. | `src/components/Glass.tsx:14` |
| Lottie | `lottie-react-native` and `@lottiefiles/dotlottie-react` are dependencies but nothing in `App.tsx`/`src/` imports them. The character is SVG + `Animated` (`Character.tsx`). The cube moods are `.webp` images. | `package.json:10,26` |
| Safe areas | `SafeAreaProvider` at the root and again inside each `Modal` (`ListUI.tsx`). Camera: `edges={['top','bottom']}`. Result: `edges={['top']}` + insets. Sign-in: insets in its layout maths. | `App.tsx:218`, `ListUI.tsx:16-20`, `CameraScreen.tsx:120`, `ResultScreen.tsx:62` |
| Keyboard | The sign-in screen has no text field (Google button only). The one `TextInput` is the display-name editor in Profile, inside a `ScrollView` with `keyboardShouldPersistTaps="handled"` and no `KeyboardAvoidingView`. | `src/screens/SignInScreen.tsx`, `ProfileScreen.tsx:27,88` |
| Auth deep link | Native: `signInWithOAuth({ redirectTo: 'reallabel://auth', skipBrowserRedirect: true })`, then `WebBrowser.openAuthSessionAsync(url, 'reallabel://auth')`, then `exchangeCodeForSession(code)`. There is no global `Linking` listener; the auth session returns the URL itself. | `src/lib/api.ts:193-217` |
| Social login | Google only. No Sign in with Apple. | `src/lib/api.ts:199` |
| Account deletion | Profile has "Delete account", which calls `quickgob-delete-account`, then local sign-out and history wipe. | `ProfileScreen.tsx:173-180`, `src/lib/account.ts:55`, `src/lib/api.ts:153` |
| Rate link | `links.appStore` is a placeholder (`id0000000000`, TODO). | `src/config.ts:9` |
| Guest mode | `EXPO_PUBLIC_GUEST_MODE=1` skips Google entirely ("testing builds"). The guest trial is web-only (`guestTrialFlag`). | `src/lib/api.ts:161-163` |
| Demo mode | Without `.env`, `isConfigured` is false: no sign-in, `placeholderResults` after 1.6 s, "Demo mode · fake results" tagline, and Profile actions show `demoAlert`. | `App.tsx:38-44,170-172,205`, `ProfileScreen.tsx` |

Checks run on this branch (output kept outside git): `npx tsc --noEmit` passes, `npm run test:unit` passes (522/522), `npx expo-doctor` passes (20/20), `npm run build:web` passes.

## Expo Go compatibility of every dependency

Expo Go (SDK 58) ships a fixed set of native modules. A JS-only package always works. A native package works only if Expo Go bundles it at the SDK version, which `expo-doctor` and `npx expo install --check` confirm.

| Dependency | Native code? | In Expo Go? | Notes |
| --- | --- | --- | --- |
| expo, expo-camera, expo-constants, expo-font, expo-haptics, expo-image-manipulator, expo-linear-gradient, expo-splash-screen, expo-status-bar, expo-web-browser, expo-blur | yes | yes | Pinned with `~58.x`. |
| expo-glass-effect | yes | yes | `isLiquidGlassAvailable()` is false below iOS 26, so `Glass` falls back to `expo-blur`. |
| @shopify/react-native-skia 2.14.0 | yes | yes (bundled version) | Must stay at the version `expo install` picks, or Expo Go crashes on load. |
| react-native-svg, react-native-safe-area-context, @react-native-async-storage/async-storage | yes | yes | |
| lottie-react-native | yes | yes | Unused (see task 7). |
| @lottiefiles/dotlottie-react | no (React DOM) | n/a | Web-only and unused. It must never be imported from a native path. |
| @expo/metro-runtime, react-native-web, react-dom | no | n/a | Web build only. |
| @supabase/supabase-js, react-native-url-polyfill, lucide-react-native, @expo-google-fonts/* | no (JS) | yes | |
| Not present: expo-apple-authentication | yes | yes | Needed for task 9. It is bundled in Expo Go, but tokens are issued for Expo Go's bundle ID, so a full test needs a dev build. |

## Task backlog

### 1. `ios-app-config`

- **Owns**: `app.json`
- **Priority**: MUST
- **NEEDS-BACKEND**: no
- **Work**: add `ios.bundleIdentifier` (proposal: `com.sugardepth.app`; the owner confirms before the Apple account exists, because it cannot change after the first upload), `ios.buildNumber: "1"`, and `ios.config.usesNonExemptEncryption: false` (the app uses HTTPS only). Decide on one display name ("Sugar Depth" vs "Reallabel") and use it for `name`, `web.name` and the permission text. Replace "Clean, Bad or Ugly" in `web.description` with "Clean, Okay or Bad".
- **Acceptance**:
  - `npx expo config --type public` shows `ios.bundleIdentifier`, `ios.buildNumber` and `ios.config.usesNonExemptEncryption === false`.
  - `npx expo-doctor` still passes.
  - No old verdict names (`Ugly`) remain in `app.json`.

### 2. `ios-permission-strings`

- **Owns**: `app.json` (the `expo-camera` plugin block only; run after task 1 or in the same branch)
- **Priority**: MUST
- **NEEDS-BACKEND**: no
- **Work**: keep a specific camera string: say what is captured and why, for example "Sugar Depth uses the camera to photograph the ingredient list on food and drink labels so it can check for added sugar." Set `"microphonePermission": false` so `NSMicrophoneUsageDescription` is not added (the app never records audio). Do not add a photo-library string; there is no picker.
- **Acceptance**:
  - `npx expo config --type introspect` shows `ios.infoPlist.NSCameraUsageDescription` with the new text and no `NSMicrophoneUsageDescription`.
  - In Expo Go on the iPhone, the first scan shows the camera prompt. Expo Go's own text shows there; the app's string only shows in a native build, so note that in the PR.
  - Denying the permission shows the in-app permission screen (`CameraScreen.tsx:68`) with a working retry or Settings path.

### 3. `ios-tablet-and-orientation`

- **Owns**: `app.json`
- **Priority**: MUST
- **NEEDS-BACKEND**: no
- **Work**: `supportsTablet: true` with `orientation: "portrait"` fails App Store validation for iPad multitasking unless every orientation is supported or `ios.requireFullScreen` is set. Recommended for v1: `supportsTablet: false`. The iPhone app still runs on iPad in compatibility mode, and the iPad screenshots are no longer required. Alternative: keep tablet support, add `requireFullScreen: true`, and confirm the iPad layouts (sign-in uses the narrow layout below `WIDE_FROM`, and the camera guide box and result panel need to scale).
- **Acceptance**:
  - `app.json` has either `supportsTablet: false`, or `supportsTablet: true` plus `requireFullScreen: true`.
  - If tablet is kept: web build screenshots at 820×1180 and 1024×1366 of sign-in, camera (demo) and result (demo), with no overlap or clipping, saved to evidence.

### 4. `ios-appearance-style`

- **Owns**: `app.json`, `App.tsx` (StatusBar line only), `src/components/ListUI.tsx` (StatusBar line only)
- **Priority**: LATER
- **NEEDS-BACKEND**: no
- **Work**: decide on `userInterfaceStyle`. The app is mostly dark, and the sign-in and list sheets use bone paper (`colors.paper`). With `"light"`, system alerts (`confirmAction`, `notify`) and the name keyboard are light. With `"dark"` they match the camera and result screens. Also check that the status bar text is readable on each screen: dark on sign-in, light on camera and result, and light on list sheets (these are on paper; check contrast).
- **Acceptance**:
  - Chosen value documented in the PR.
  - In Expo Go, status bar text is readable on sign-in, camera, result, Profile and Menu (screenshots from the phone, attached by the user).
  - Delete-account and sign-out alerts are readable.

### 5. `ios-status-bar-plugin`

- **Owns**: `app.json`, `package.json`, `package-lock.json`
- **Priority**: LATER
- **NEEDS-BACKEND**: no
- **Work**: `expo-status-bar` was added to `plugins` by `expo install`. Confirm that it is the plugin the SDK 58 package ships (`node_modules/expo-status-bar/app.plugin.js`) and what it changes (for example `UIViewControllerBasedStatusBarAppearance`). Keep it if it is needed for `<StatusBar style>` to take effect in a native build; otherwise remove it. Do not hand-edit versions; use `npx expo install`.
- **Acceptance**:
  - `npx expo-doctor` passes.
  - `npx expo config --type introspect` shows the expected `UIViewControllerBasedStatusBarAppearance` value.
  - A one-line note in the PR explains why the plugin stays or goes.

### 6. `ios-native-paths-review`

- **Owns**: `src/components/LabelCamera.tsx`, `src/components/CrystalSwarm.tsx`, `src/components/CrystalSwarmSkia.tsx`, `src/components/crystalArt.ts`, `src/components/Glass.tsx`
- **Priority**: MUST
- **NEEDS-BACKEND**: no (all of it can be checked in demo mode)
- **Work**: on the iPhone in Expo Go, walk every native-only path that the web build never runs:
  - `LabelCamera.tsx`: the camera opens, the torch toggles (`enableTorch`), it closes under the result and reopens on "Scan another".
  - `CrystalSwarmSkia.tsx`: the swarm draws, pauses when the app goes to the background (`AppState`) and stops under Reduce Motion (`AccessibilityInfo`). Visible in demo mode only if the sign-in screen is reachable; otherwise use a configured build.
  - Haptics fire on the shutter and on the verdict, and not when the `haptics` pref is off.
  - `Glass.tsx`: on iOS 26+ in Expo Go, GlassView renders; on older iOS the blur fallback renders. Check that buttons inside `Glass` stay tappable (`pointerEvents`).
  - Fix only what is broken, without UI changes.
- **Acceptance**:
  - A checklist in the PR, with each item marked pass or fail from the user's iPhone run.
  - No red-box errors or yellow-box warnings from these components in the Metro log.
  - `npx tsc --noEmit` and `npm run test:unit` pass.

### 7. `drop-unused-lottie`

- **Owns**: `package.json`, `package-lock.json`, `scripts/make-lottie.mjs` (read only), `CLAUDE.md` (Character section only, with the owner's OK)
- **Priority**: LATER
- **NEEDS-BACKEND**: no
- **Work**: `lottie-react-native` and `@lottiefiles/dotlottie-react` are not imported anywhere in `App.tsx`/`src/`. The character is SVG + `Animated`, and the result moods are `assets/cube/*.webp`. Either remove both packages (smaller binary, fewer native modules to review), or, if Lottie playback is still planned, add a `Character` path that uses `lottie-react-native` on native and dotlottie on web, behind `.web.tsx`. The owner decides; until then, record the gap in `CLAUDE.md`, which still describes Lottie animations.
- **Acceptance**:
  - `grep -r "lottie" src App.tsx` matches the decision: either both packages are imported through the platform split, or both are absent from `package.json`.
  - `npx expo-doctor` passes.
  - `npm run build:web` passes.

### 8. `ios-safe-areas`

- **Owns**: `src/screens/CameraScreen.tsx`, `src/screens/ResultScreen.tsx`, `src/screens/SignInScreen.tsx`, `src/components/SmallMascot.tsx`, `src/components/GlossaryCard.tsx`, `src/components/ListUI.tsx`
- **Priority**: MUST
- **NEEDS-BACKEND**: no
- **Work**: check on a Dynamic Island iPhone (top inset of about 59 pt) and, if available, a notch or SE-size phone:
  - Camera: the top bar and the demo tagline sit under the island, and the shutter sits above the home indicator.
  - Result: the top-right glass verdict panel sits below the island. "Scan another" and the footer ("Not medical advice · Doesn't check allergens") sit above the home indicator. The character stands on the photo and is not cut off.
  - Sign-in: the layout maths uses `height - insets.top - insets.bottom`. The small mascot clears the island, and the footer clears the home indicator.
  - Modals (`ListUI` `Sheet`): `statusBarTranslucent` plus the nested `SafeAreaProvider` should give correct insets inside `Modal`. Confirm that the back chevron is not under the island.
  - Landscape is locked (portrait), so side insets do not apply.
- **Acceptance**:
  - Phone screenshots (taken by the user) of camera, result (demo verdicts CLEAN, OKAY and BAD), Profile and Menu show no control or text under the island or home indicator.
  - Web build screenshots at 390×844 and 375×667 with simulated insets show the same.

### 9. `sign-in-with-apple`

- **Owns**: `src/lib/api.ts` (new `signInWithApple`), `src/screens/SignInScreen.tsx`, `src/components/GuestScanPrompt.tsx`, `app.json` (`ios.usesAppleSignIn`, `expo-apple-authentication` plugin), `package.json`, `package-lock.json`
- **Priority**: MUST
- **NEEDS-BACKEND**: yes
- **Work**: App Review Guideline 4.8: an app whose only sign-in is a third-party or social login (Google here) must also offer a login that limits data to name and email, lets people keep their email private, and does not track. Sign in with Apple is the standard way to meet this.
  - Add `expo-apple-authentication` (`npx expo install`) and a "Continue with Apple" button above Google on iOS only (Apple's HIG button style).
  - Call `supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce })`. Enable the Apple provider in Supabase Auth. That is the owner's job; agents never push config.
  - Keep the existing UI otherwise unchanged.
- **Acceptance**:
  - On iOS the Apple button shows; on web and Android it does not.
  - With real Supabase values and the Apple provider enabled, a dev build signs in with Apple, and a hidden-email (`privaterelay.appleid.com`) user lands on the camera.
  - Delete account works for an Apple user. Apple also expects the app to revoke the Apple token on deletion; `quickgob-delete-account` needs that (separate backend task, owner deploys).
  - Expo Go limit: Apple issues the token for Expo Go's bundle ID, so the end-to-end test needs a development build after the Apple account exists. Until then: `tsc`, unit tests, and a demo-mode check that the button renders.

### 10. `ios-auth-deep-link`

- **Owns**: `src/lib/api.ts` (`signInWithGoogle` only), `app.json` (`scheme`)
- **Priority**: MUST
- **NEEDS-BACKEND**: yes
- **Work**: verify Google sign-in on the iPhone. `openAuthSessionAsync` uses `ASWebAuthenticationSession`, which closes when the browser reaches a URL with the `reallabel` scheme, even in Expo Go, where that scheme is not registered. The app then reads `?code=` and calls `exchangeCodeForSession` (PKCE).
  - Things to confirm: `reallabel://auth` is in the Supabase redirect allow-list (it is, per the workspace notes); the sheet shows "wants to use supabase.co to sign in"; the auth session's Cancel button returns `type: 'cancel'`, and the app shows no error (`api.ts:212` returns null).
  - Errors that come back as `reallabel://auth?error=...` currently surface as "Google sign-in was cancelled." because there is no `code`. Change the message to tell cancel and failure apart, the same way the web `takeAuthRedirectError` does.
  - In a native build, `scheme: "reallabel"` registers `CFBundleURLTypes`, and a cold-start link `reallabel://auth?code=...` (rare) is ignored safely.
- **Acceptance**:
  - With real Supabase values, on the iPhone in Expo Go: tap Google, choose an account, and the app lands on the camera; Profile shows the Google email.
  - Cancel in the sheet leaves the user on sign-in with no error.
  - A forced error (for example an unknown redirect) shows a failure message, not "cancelled".
  - `npx tsc --noEmit` passes.

### 11. `ios-keyboard`

- **Owns**: `src/screens/ProfileScreen.tsx`
- **Priority**: LATER
- **NEEDS-BACKEND**: no (Profile opens in demo mode; the name edit is reachable if `demoAlert` allows it, otherwise yes)
- **Work**: the sign-in screen has no text input, so the only keyboard is the display-name editor near the top of the Profile sheet. Confirm that the keyboard does not cover the Save and Cancel buttons on an SE-size iPhone, and that "done" on the keyboard saves. `keyboardShouldPersistTaps="handled"` is already set, so tapping Save while the keyboard is up saves on the first tap. Add `automaticallyAdjustKeyboardInsets` on the `ScrollView` (iOS) if the buttons are covered. If a phone/OTP sign-in field comes back (the `quickgob-phone-auth` slug exists), that screen needs `KeyboardAvoidingView` (`behavior="padding"` on iOS), `textContentType="oneTimeCode"` and `keyboardType="number-pad"`.
- **Acceptance**:
  - On the iPhone, Profile, Edit name, typing, then Save works with one tap, and the buttons stay visible on a 375×667 screen.
  - No layout jump after the keyboard closes.

### 12. `account-deletion-review`

- **Owns**: `src/screens/ProfileScreen.tsx`, `src/lib/account.ts`, `src/lib/history.ts`
- **Priority**: MUST
- **NEEDS-BACKEND**: yes
- **Work**: Guideline 5.1.1(v) requires in-app account deletion, and it exists. Verify it end to end on iOS:
  - It is reachable within two taps of the camera (Menu or avatar, then Profile, then Delete account).
  - The confirm dialog says it is permanent.
  - Success removes the Supabase user, clears the on-device history (AsyncStorage, 50 scans) and the cached profile, and returns to sign-in.
  - A network failure shows "Delete failed" and keeps the account.
  - Guest (test) accounts behave the same.
- **Acceptance**:
  - With real Supabase values, after delete: the user no longer exists in Auth (owner checks the dashboard), the History screen is empty, and the app shows sign-in.
  - Signing in again with the same Google account starts a fresh profile.
  - In demo mode, Delete shows the demo alert and does not crash.

### 13. `privacy-manifest-and-data-disclosure`

- **Owns**: `app.json` (`ios.privacyManifests`), `docs/app-store-privacy.md` (new), `src/config.ts` (`privacyPolicyDraft`, `links`)
- **Priority**: MUST
- **NEEDS-BACKEND**: no
- **Work**:
  - Privacy manifest: Expo SDK modules and AsyncStorage ship their own `PrivacyInfo.xcprivacy`. Add the app-level `ios.privacyManifests` with `NSPrivacyAccessedAPITypes` for the required-reason APIs the app's own code uses (UserDefaults via AsyncStorage `CA92.1`, file timestamp `C617.1`, system boot time `35F9.1` if `expo-constants`/RN timing triggers it), and `NSPrivacyTracking: false`.
  - App Privacy ("nutrition label") answers in a new doc: name and email (account, linked to the user, not tracking); photos (label images sent to the backend and on to Anthropic (Claude) and TypeSafe (Jev) for analysis, not stored per `privacyPolicyDraft`); diagnostics (`scanTiming`, if sent off the device).
  - Guideline 5.1.2(i): the policy and an in-app notice must say that label photos go to third-party AI services, and get consent before the first scan.
  - Replace the `links.appStore` placeholder once the app ID exists (or hide the "Rate" row on iOS until then).
- **Acceptance**:
  - `npx expo config --type introspect` shows `ios.privacyManifests` with `NSPrivacyTracking: false` and the API reasons.
  - `docs/app-store-privacy.md` lists every data type with linked/tracking answers and names the third-party processors.
  - The privacy policy text mentions the AI processors.
  - The "Rate" row on iOS does not open `id0000000000`.

### 14. `app-store-listing-checklist`

- **Owns**: `docs/app-store-listing.md` (new), `assets/icon.png` (check only)
- **Priority**: LATER
- **NEEDS-BACKEND**: no
- **Work**: one checklist for when the Apple account exists:
  - The 1024×1024 icon has no alpha channel.
  - 6.9" and 6.5" iPhone screenshots, plus iPad screenshots if task 3 keeps tablet support.
  - Support URL and privacy URL (`https://app.sugardepth.com/...`).
  - Age rating, with alcohol mentioned in verdicts as reference only.
  - The "Not medical advice" wording in the description, as for Guideline 1.4.1 health apps.
  - App Review demo account instructions: a reviewer can't use the testing-only guest mode, so supply a Google test account, or Apple sign-in once task 9 is done.
  - Confirm that `EXPO_PUBLIC_GUEST_MODE` is unset in the production profile.
- **Acceptance**:
  - The checklist exists, and every item has an owner (user or agent) and a status.
  - A Python/PIL or `sips` check of `assets/icon.png` reports no alpha channel, or a follow-up is noted.

### 15. `ios-camera-scan-performance`

- **Owns**: `src/components/LabelCamera.tsx`, `src/lib/api.ts` (`preparePhoto` only), `src/lib/photo.ts`, `src/lib/scanTiming.ts`
- **Priority**: MUST
- **NEEDS-BACKEND**: yes (the full scan timing needs the Edge Functions; the capture and crop part can be timed in demo mode)
- **Work**: on an iPhone, `takePictureAsync({ quality: 0.9 })` returns a full-sensor JPEG (12 MP, or 24/48 MP on Pro models). The app then crops it to the guide box and resizes the longest side to 1568 px with `expo-image-manipulator`. Measure on the iPhone with `scanTiming` (`npm run timing:report`):
  - shutter to photo ready, crop and resize time, upload size, both Edge calls, and verdict on screen.
  - Try lower `quality`, `shutterSound` on or off as the owner prefers, and `pictureSize` (from `getAvailablePictureSizesAsync`) set near 1920 px, so less data is decoded.
  - Keep the crop from `boxInImage`, and keep the 280–1568 px rule for Jev.
  - Also check memory: three or more scans in a row must not crash Expo Go, and the camera keeps running under the result ("Scan another" must be instant).
- **Acceptance**:
  - Timing table before and after (median of 5 scans, same label, same Wi-Fi) saved to evidence.
  - Capture plus preparation is at most 700 ms on the test iPhone.
  - Uploaded JPEG longest side is 1568 px.
  - No verdict regressions (`npm run test:unit` passes).
  - 10 scans in a row cause no crash or memory warning.

### 16. `ios-demo-mode`

- **Owns**: `App.tsx` (demo section only), `src/placeholderResults.ts`, `src/components/ListUI.tsx` (`demoAlert`)
- **Priority**: MUST
- **NEEDS-BACKEND**: no
- **Work**: with no `.env`, the iPhone in Expo Go must:
  - open straight to the camera (no sign-in);
  - show "Demo mode · fake results";
  - after the shutter, show a placeholder verdict after about 1.6 s, cycling CLEAN, OKAY and BAD in the new names (`placeholderResults` passes through `verdicts.ts` conversion if it is old-format);
  - fire haptics;
  - save to on-device history;
  - make Profile actions (name, sign out, delete) show the demo alert instead of failing.
  - Confirm that an App Store build can never ship in demo mode: a production build without `EXPO_PUBLIC_SUPABASE_*` should fail at build time, or show a clear "not configured" screen, not fake verdicts.
- **Acceptance**:
  - The user's iPhone run in demo mode passes every step above (checklist in the PR).
  - A guard (build-time check in `app.config`/EAS profile, or a runtime screen when `!__DEV__ && !isConfigured`) is in place, with a unit test where possible.
  - `npm run build:web` passes.

### 17. `ios-history-and-storage`

- **Owns**: `src/lib/history.ts`, `src/lib/stored.ts`, `src/lib/prefs.ts`
- **Priority**: LATER
- **NEEDS-BACKEND**: no
- **Work**: on iOS, AsyncStorage persists across app restarts and is removed when the app is deleted. Confirm that 50 scans with lists stay well under any size concern, that the history survives a force quit, and that sign-out keeps or clears history as the privacy text says ("Deleting your account permanently deletes … the history on this phone"; sign-out behaviour should be stated too).
- **Acceptance**:
  - With 50 or more demo scans, force quit and reopen: history shows the latest 50.
  - Behaviour on sign-out matches the policy text.

## Suggested order

1. Config first, in one branch: tasks 1, 2, 3, plus 13 for the manifest part. They all touch `app.json`, so they should not run in parallel.
2. In parallel, once config is in: 6, 8, 16 (demo-mode verifiable now), and 15 (capture half).
3. Once real Supabase values are set: 10, 12, then 9 (needs the Apple provider and a dev build), and the full timing in 15.
4. LATER: 4, 5, 7, 11, 14, 17.
