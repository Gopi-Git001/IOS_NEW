# App Store listing checklist

Work through this list once the Apple developer account exists (task 14 in `docs/ios-readiness.md`).
Each item has an **owner** (user = needs App Store Connect, the Apple account or a phone; agent = can be done in the repo) and a **status**:

- `done`: checked on this branch and the evidence is noted.
- `todo`: not started yet.
- `blocked`: waiting on the Apple account or on another task.
- `decide`: the user has to make a choice first.

App facts used below (from `app.json`): name "Sugar Depth", bundle ID `com.sugardepth.app`, version `1.0.0`, build `1`, `ios.supportsTablet: false`, `orientation: "portrait"`, `usesNonExemptEncryption: false`.

## 1. App icon

| # | Item | Owner | Status |
| --- | --- | --- | --- |
| 1.1 | `assets/icon.png` is 1024×1024 with no alpha channel. | agent | done |
| 1.2 | The icon has no transparent corners and isn't pre-rounded (iOS applies its own mask). Check on the App Store Connect upload preview. | user | blocked (Apple account) |

How 1.1 was checked (2026-11-13), by reading the PNG header with `od -A d -t u1 -N 33 assets/icon.png`:
width `0 0 4 0` = 1024, height `0 0 4 0` = 1024, bit depth 8, colour type `2` (RGB, no alpha).
`grep -c tRNS assets/icon.png` finds 0 matches, so the file has no transparency chunk either.
If the icon is replaced later, check it again with `sips -g hasAlpha assets/icon.png` on a Mac (expect `hasAlpha: no`)
or `python3 -c "from PIL import Image; print(Image.open('assets/icon.png').mode)"` (expect `RGB`).

## 2. Screenshots

| # | Item | Owner | Status |
| --- | --- | --- | --- |
| 2.1 | 6.9" iPhone screenshots (1320×2868 or 1290×2796 portrait), 3–10 images: camera with guide box, a CLEAN result, an OKAY result, a BAD result, history, profile. | user | blocked (Apple account, real build) |
| 2.2 | 6.5" iPhone screenshots (1284×2778 or 1242×2688 portrait), same set. App Store Connect can scale the 6.9" set if the 6.5" slot is left empty; check whether it's still required when uploading. | user | blocked (Apple account) |
| 2.3 | iPad screenshots: **not needed**. Task 3 set `ios.supportsTablet: false`, so the app runs on iPad only in iPhone compatibility mode. If tablet support comes back, add 13" iPad screenshots (2064×2752 or 2048×2732). | agent | done (not required) |
| 2.4 | Take the screenshots from a signed-in build with real verdicts, not demo mode: no "Demo mode · fake results" tagline in any image. | user | blocked (real build) |
| 2.5 | Every screenshot shows the footer "Not medical advice · Doesn't check allergens" or doesn't crop it in a misleading way. | user | todo |

## 3. URLs and contact

| # | Item | Owner | Status |
| --- | --- | --- | --- |
| 3.1 | Support URL: `https://app.sugardepth.com/support` (or another page that has a contact method, such as `support@sugardepth.com`). The page must be live before review. | user | decide |
| 3.2 | Privacy policy URL: `https://app.sugardepth.com/privacy`. The text is `privacyPolicyDraft` in `src/config.ts` and it must be reviewed before release (TODO in the file). | user | decide |
| 3.3 | Make the URLs consistent: `src/config.ts` `links.privacy` / `links.terms` point to `https://sugardepth.com/...` (no `app.` subdomain), while this task names `https://app.sugardepth.com/...`. Pick one host, publish the pages there, and make App Store Connect and `src/config.ts` match. | user (decide), agent (update `src/config.ts`) | decide |
| 3.4 | Marketing URL (optional): `https://sugardepth.com`. | user | todo |
| 3.5 | `src/config.ts` `appStoreId` is empty, so "Rate the app" falls back to the website. Fill it in once App Store Connect assigns the Apple ID. | agent (after the user supplies the ID) | blocked (Apple account) |

## 4. Age rating

| # | Item | Owner | Status |
| --- | --- | --- | --- |
| 4.1 | Answer the age-rating questionnaire. Suggested answers: no violence, no sexual content, no gambling, no user-generated content, no unrestricted web access, and "Medical/Treatment Information: None" (the app reads labels and gives no treatment advice). | user | blocked (Apple account) |
| 4.2 | Alcohol: the app *mentions* alcohol only as reference. A drink with over 0.5% ABV on its label gets a BAD verdict (Rules v3), and "Alcohol" can appear in the result lists. The app doesn't sell, promote or encourage drinking. Answer "Alcohol, Tobacco, or Drug Use or References: Infrequent/Mild", which gives a 12+ rating on its own. Answering "None" risks a rejection if a reviewer scans a beer. | user | decide |

## 5. Description and health wording (Guideline 1.4.1)

| # | Item | Owner | Status |
| --- | --- | --- | --- |
| 5.1 | The description says the app is **not medical advice** and doesn't check allergens, for example: "Sugar Depth reads the ingredient list and shows whether a product has added sugar or sweeteners. It is not medical advice, and it doesn't check allergens. Talk to a doctor or dietitian about your diet, especially if you have diabetes." | user (paste), agent (draft above) | todo |
| 5.2 | The description and screenshots make no medical claims ("manage diabetes", "lower blood sugar", "diagnose"). | user | todo |
| 5.3 | Use the current verdict names CLEAN / OKAY / BAD (not the old CLEAN / BAD / UGLY). `app.json` `web.description` already does. | agent | done |
| 5.4 | Subtitle (30 characters max), keywords (100 characters max) and promotional text. Suggested subtitle: "Added sugar label scanner". | user | todo |
| 5.5 | Category: Primary "Food & Drink", secondary "Health & Fitness" (optional). | user | decide |

## 6. App Review information

| # | Item | Owner | Status |
| --- | --- | --- | --- |
| 6.1 | Demo account. A reviewer can't use guest mode (`EXPO_PUBLIC_GUEST_MODE`, testing builds only), so supply sign-in details. Option A, now: a dedicated Google test account (no 2-step verification, or with backup codes given in the notes) made only for App Review. Option B, after task 9 (`sign-in-with-apple`) ships: reviewers can use Sign in with Apple with their own Apple ID; still give the Google account as a fallback. | user | blocked (Apple account; task 9 for option B) |
| 6.2 | Review notes, to paste: "Sign in with the Google account below. Tap the shutter with a food or drink ingredient list inside the dashed box. The app shows one verdict (CLEAN, OKAY or BAD). Label photos are analysed by our server, which uses Anthropic Claude and TypeSafe Jev; nothing is stored. Delete account: Menu → Profile → Delete account." | user (paste), agent (draft) | todo |
| 6.3 | Before submitting, check that the review account can scan on the production backend (rate limits for the `quickgob` functions aren't hit, and the Edge Function secrets are set). | user | blocked (production build) |
| 6.4 | Contact name, phone and email for App Review. | user | todo |

## 7. Production build settings

| # | Item | Owner | Status |
| --- | --- | --- | --- |
| 7.1 | `EXPO_PUBLIC_GUEST_MODE` is unset in the production profile. The repo has no `eas.json` yet, so there's no profile to check. When `eas.json` is added, the `production` profile `env` must not set `EXPO_PUBLIC_GUEST_MODE`, and no EAS environment variable with that name may exist for the `production` environment (`eas env:list --environment production`). | user (EAS), agent (review `eas.json` when it exists) | blocked (no `eas.json`) |
| 7.2 | The production build has `EXPO_PUBLIC_SUPABASE_URL` and the publishable key set, so it doesn't open in demo mode (task 16 guards release builds without them). | user | blocked (Apple account, EAS) |
| 7.3 | App Privacy answers match `docs/app-store-privacy.md` (task 13). | user | blocked (Apple account) |
| 7.4 | Export compliance: `ios.config.usesNonExemptEncryption: false` is set in `app.json`, so the encryption question is answered in the build. | agent | done |

## Remaining on-device checks

These need the iPhone and can't be checked in the factory:

- 2.1, 2.2, 2.4: take the screenshots from a real build on a 6.9" and a 6.5" iPhone (or the matching simulators once Xcode is available).
- 6.1, 6.3: sign in with the review account on a production build and scan one label of each verdict.
