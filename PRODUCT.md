# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios (Expo React Native app, iPhone first; also served as a web build for browser testing at quickgob-web.vercel.app)

## Users

Shoppers in a grocery aisle or at home who want to know, in seconds, whether a packaged food hides added sugar or sweeteners. They hold the product in one hand and the phone in the other.

## Product Purpose

Point the camera at a food label and get one sugar verdict: CLEAN, BAD, or UGLY (UNCLEAR when the photo is unreadable). Success: a verdict the user trusts within a few seconds of tapping the shutter, plus a plain explanation of what each sugar name really is.

## Positioning

Label transparency delivered through provocative satire: it exposes the many disguises of sugar ("evaporated cane juice? That's sugar.") instead of tracking calories or scoring overall nutrition. No barcodes or product database; it reads the actual label in front of you.

## Operating Context

One-handed use in stores with mixed lighting; quick repeat scans; phone sign-in by SMS; on-device scan history.

## Capabilities and Constraints

- Verdict rules v2: any added sugar, artificial sweetener, erythritol, xylitol or alcohol = UGLY; stevia, monk fruit, allulose or other sugar alcohols = BAD; nothing sweet added = CLEAN.
- Claude vision lists the ingredients; Jev makes the final call. Supabase backend.
- Not medical advice; does not check allergens.
- Product and in-app name is "Sugar Depth" (sugardepth.com; the app runs at app.sugardepth.com). Former names: "Reallabel" (2026-11-06), "QuickGOB" (still the Supabase function and Vercel project names) and "Sugar Hunter".

## Brand Commitments

- Liquid Glass controls must stay (user, 2026-11-06). Everything else in the current look is open to change, including the sugar-cube character, dark mode and the verdict words.
- Tone: user wants to see both bold satire and premium calm before choosing.

## Evidence on Hand

Real verdict rules and sweetener research (NIH, CSPI, WHO, DGA). No testimonials, users, press or ratings exist; never invent them.

## Product Principles

1. One verdict, instantly; detail only on demand.
2. Name the disguise: every sugar alias gets exposed in plain words.
3. Honest, cited, never preachy medical claims.
4. The camera is the product; nothing gets in the way of the shot.
