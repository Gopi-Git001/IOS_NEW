# QuickGAB

Expo (React Native, TypeScript) app for iOS + Android with a Supabase backend.
User scans a food/drink label; the app shows its sugars and a cartoon sugar-cube character reacts.

## Design (match design/*.png exactly)
- Camera: full-screen live camera, dashed box "Fit the ingredient list here", round shutter.
- Result: photo frozen full screen. Top-right glass panel: verdict (CLEAN / OKAY / BAD),
  then "Natural sugars", "Added sugars", "Sweeteners" lists (show only those that apply).
  Bottom-left: sugar-cube character, transparent background, standing on the photo.
  Bottom: one "Scan another" button. Footer: "Not medical advice · Doesn't check allergens".
- Colours: CLEAN #34D399, OKAY #FBBF24, BAD #FB7185, dark background #0B0B0F, Inter font.

## Rules
- Signup: mobile number + SMS code only (Supabase Auth). Include "Delete account".
- Backend: Supabase Edge Function: Claude vision reads the label → rules → Jev (TypeSafe) confirms.
- Sugar logic: artificial sweeteners, alcohol, or over 4 g added sugar = BAD; sugar alcohols or
  1–4 g added sugar = OKAY; no added sugar or sweeteners = CLEAN. Rules beat Jev.
- Aspartame, sucralose etc. are Sweeteners, never "Added sugars".
- Character: Lottie animations (idle, scanning, happy, okay, sad).
- API keys only in Supabase secrets, never in the app.
- Must run in Expo Go on a real phone. No emulator.
- Work in phases; stop after each phase and tell me how to test it.