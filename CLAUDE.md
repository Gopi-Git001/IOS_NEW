@AGENTS.md

# Sugar Hunter

Expo (React Native, TypeScript) app for iOS + Android with a Supabase backend.
User scans a food/drink label; the app gives one sugar verdict — CLEAN, OKAY or BAD — and a
sugarcane character reacts.

## Verdicts (Rules v3, full table in RULES.md)
- CLEAN — no added sugar, no sweeteners, no alcohol.
- OKAY — up to 4 g added sugar per serving (a printed 0 g with sugar listed counts here), sugar
  alcohols (erythritol, xylitol, maltitol…), allulose, plant sweeteners (stevia, monk fruit), or a
  sweetener the rules don't know yet (logged as `unknown_sweetener` so it can be added).
- BAD — over 4 g added sugar per serving, added sugar whose grams per serving can't be read
  (including per-100 g-only panels), any artificial sweetener, or drinking alcohol.
- OKAY also when 2 or more ingredients aren't recognised (never CLEAN; names logged as `unrecognised_ingredients`).
- RETRY — not a food label, unreadable, no ingredient list, or a cut-off list with nothing usable
 visible (no verdict; retake). Visible sugar, a sweetener or alcohol on a cut-off list still decides.
- Non-English lists: Claude returns English names next to the printed ones; foreign sugar words are a backup.
- Never CLEAN with any added sugar, artificial sweetener or alcohol, whatever Jev says.
- Juice / fruit concentrate is added sugar only when it sweetens another food; a 100% juice
  product (juice from concentrate and nothing else sweet) is natural sugar.
- Alcohol is over 0.5% ABV. "<0.5%", "0.0%", "0.5% ABV or less", "non-alcoholic", "alcohol-free" are not alcohol.
- Aspartame, sucralose etc. are Sweeteners, never "Added sugars".
- Strict mode (display option, on = verdict as above). Off: a product whose only issue is plant
  sweeteners (stevia, monk fruit) shows CLEAN (`applyStrictMode` in `src/lib/display.ts`).
- Old names: CLEAN / BAD / UGLY became CLEAN / OKAY / BAD. Edge Functions mark new names with
  `verdicts: 'v3'`; the app converts unmarked replies and old on-device history (`src/lib/verdicts.ts`).
- Colours: CLEAN #34D399, OKAY #FBBF24, BAD #FB7185, dark background #0B0B0F, Inter font.

## Design (match design/*.png)
- Camera: full-screen live camera, dashed box "Fit the ingredient list here", round shutter.
- Result: photo frozen full screen. Top-right glass panel: verdict (CLEAN / OKAY / BAD) + headline,
  then "Natural sugars", "Added sugars", "Sweeteners" lists (show only those that apply).
  Bottom-left: sugarcane character, transparent background, standing on the photo.
  Bottom: one "Scan another" button. Footer: "Not medical advice · Doesn't check allergens".

## Character
- An orange sugarcane stalk (matches the cane-i logo): three jointed internodes with rounded
  shading, node rings, waxy bloom, buds, a crown of arching leaves, and two leaves as arms.
- Drawn in SVG (`react-native-svg`) and animated with React Native `Animated`; the result
  moods use `assets/cube/*.webp`. The app has no Lottie player (the Lottie packages were removed).
  `scripts/make-lottie.mjs` (`npm run lottie`) still writes JSON for idle, scanning, clean, okay,
  bad to `assets/lottie/`, but the app does not play them.
- Motion must feel physical: bend joint by joint, leaves lag and flex (follow-through),
  squash/stretch from the root, anticipation and settle, irregular blinks, constant breathing.
- clean = hop and cheer; okay = unconvinced shrug, raised brow, sweat drop;
  bad = wilted and browned, drooping leaves, tears, a fly circling.

## Backend (speed first)
- Jev (TypeSafe System One) makes the call. The `quick-verdict` Edge Function sends the label
  photo straight to Jev as an image asset and asks one Choice question (CLEAN / OKAY / BAD) plus
  a "is this a food label?" Noul. One fast request, no text generation.
- At the same time the `scan-label` Edge Function has Claude vision list the sugars by name, and
  the rules (`_shared/rules.ts`, staged pipeline documented in RULES.md) compute a backstop verdict.
- The app fires both calls at once and keeps the loading state until BOTH have answered (or Jev's
  6 s wait, `JEV_WAIT_MS` in `src/lib/scanFlow.ts`, passes). It then shows one verdict and never changes it.
- Final verdict = the stricter of Jev and the rules (CLEAN < OKAY < BAD, `src/lib/combine.ts`): Jev can
 raise the rules verdict, never lower it. The rules verdict alone is used when Jev is unavailable or its
 confidence is under 0.45 (`MIN_CONFIDENCE` in `_shared/jev.ts`).
- Images to Jev need the `TypeSafe-Danger-Zone-Images: true` header and 280–1568 px per side;
 the app sends a JPEG cropped to the guide box, longest side 1568 px, and `quick-verdict` pads a side
 under 280 px with white (`_shared/pad.ts`, never stretched).

## Rules
- Signup: Google sign-in (Supabase Auth, PKCE). Guest sign-in only for testing builds. Include "Delete account".
- API keys only in Supabase secrets (`ANTHROPIC_API_KEY`, `TYPESAFE_API_KEY`, optional
  `CLAUDE_MODEL`), never in the app.
- Must run in Expo Go on a real phone. No emulator.
- Work in phases; stop after each phase and tell me how to test it.
