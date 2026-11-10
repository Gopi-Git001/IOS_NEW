# Sugar rules (policy `rules-v3`, registry `registry-2026.11.09`)

Rules v3, approved by the user on Nov 9, 2026. Four verdicts: CLEAN, OKAY, BAD, RETRY. They replace v2's CLEAN / BAD / UGLY (old BAD became OKAY, old UGLY became BAD). These verdicts are QuickGOB's preferences, not medical safety findings.

The rules are checked in order and the first match wins. A product gets the worst verdict any of its ingredients earns, and stevia never overrides a worse ingredient.

## Rule table (first match wins)

| Rule | Condition | Verdict |
|---|---|---|
| R1-not-food | The photo isn't a food or drink label | RETRY |
| R2-unreadable | The ingredient text can't be read | RETRY |
| X1-added-sugar-over-4g | The panel shows more than 4 g of added sugar per serving | BAD |
| X2-added-sugar-no-grams | Added sugar is listed but the per-serving grams can't be read (including labels that print only per 100 g / 100 ml) | BAD |
| X3-artificial-sweetener | Aspartame, sucralose, acesulfame K or saccharin (also cyclamate, neotame, advantame, aspartame-acesulfame salt, NHDC) | BAD |
| X4-alcohol | Above 0.5% ABV, or beer / wine / spirits listed without a "0.5% or less" claim | BAD |
| R3-no-ingredient-list | No ingredient list is visible | RETRY |
| R4-incomplete-list | The list is cut off or partly unreadable | RETRY |
| O1-added-sugar-up-to-4g | Added sugar is listed and the panel shows 4 g or less per serving, including a printed 0 g (US labels round under 0.5 g down to 0) | OKAY |
| O2-sugar-alcohol | Any sugar alcohol (erythritol, xylitol, sorbitol, maltitol, mannitol, isomalt, lactitol, polyglycitol) or allulose | OKAY |
| O3-plant-sweetener | Stevia, monk fruit or thaumatin, with no worse ingredient | OKAY |
| O4-unknown-sweetener | An unknown ingredient that may sweeten (sweet-sounding name, or an unknown E950–E969 code). The name is logged (`unknown_sweetener` in the `quickgob-scan-label` logs) so it can be added to the registry | OKAY |
| C1-clean | No added sugar, no sweetener and no alcohol. Natural sugars from milk, fruit or vegetables are fine | CLEAN |

O4 was "R5-unknown-sweetener → RETRY" in the proposal; the user changed it to OKAY, so it moved into the OKAY group.

Juice and fruit concentrate count as added sugar only when they sweeten another food. A 100% juice product (juice from concentrate and nothing else sweet: only fruit, juice, puree, water, acids, vitamins, preservatives, colours, gums, salt, flavours or non-sweet additives) is natural sugar. Single-strength juice and fruit puree are always natural sugars.

Alcohol: "<0.5%", "0.0%", "0.5% ABV or less", "non-alcoholic" and "alcohol-free" mean no alcohol. Above 0.5% ABV is alcohol.

Strict mode (`src/lib/display.ts`) stays a display option: with it off, a product whose only sweetener is stevia, monk fruit or thaumatin shows as CLEAN. It never turns added sugar, an artificial sweetener or alcohol into CLEAN.

Safety floor: if any added sugar, artificial sweetener or alcohol is found, the final verdict can never be CLEAN, whatever Jev says (`src/lib/combine.ts`).

BAD triggers are checked before RETRY for a missing or cut-off list, because a cut-off list can only hide more, never less.

## Pipeline

| Stage | File | What it does |
|---|---|---|
| 1. Extraction | `supabase/functions/scan-label/index.ts` | Claude copies the ingredient list, the printed sugar numbers and any ABV / no-alcohol claim exactly as they appear. It doesn't sort anything or give a verdict. |
| 2. Normalization | `_shared/normalize.ts` | Parses nested brackets, `and/or`, lead-ins like "Contains 2% or less of", footnote marks and E/INS codes. Matches exact keys only, never substrings. |
| 3. Classification | `_shared/ingredients.ts` | One versioned registry. Each entry has an id, aliases, codes, a class, how US labels treat it, and its QuickGOB treatment. |
| 4. Policy | `_shared/policy.ts` `evaluate()` | One ordered function. It returns the verdict (or RETRY), the rule id, the evidence with the printed text, the quantities and their basis, what's missing, unknown sweeteners, warnings and a short explanation. |
| Adapter | `_shared/rules.ts` | Maps the evaluation onto the `ScanResult` the app renders. Replies carry `verdicts: 'v3'`. |

Jev makes the final call from the photo (`_shared/jev.ts`, `src/lib/combine.ts`). The app waits for both Jev and the reading (or Jev's 6 s wait) and shows one verdict that never changes. The rules verdict is used when Jev is unavailable, unsure (confidence under 0.45), or says CLEAN against the safety floor.

## Quantities

- Total and added sugars are kept separate, with their basis (per serving, per 100 g, per 100 ml or unknown). An unlabeled basis is read as per serving.
- Missing grams stay `null` and are listed in `missing`. They never become 0.
- A printed 0 g doesn't cancel a listed added sugar: it is OKAY (O1). US labels may round amounts under 0.5 g down to 0, and the output says so in `warnings`.
- If the panel shows added sugar but no added sugar was found in a complete list, the panel grams decide (X1 or O1) and the contradiction is reported in `warnings`.

## Identity vs. treatment (examples)

| Ingredient | Class | US label treatment | QuickGOB v3 |
|---|---|---|---|
| Sucralose | Non-sugar sweetener (artificial) | Not sugar | BAD |
| Erythritol, xylitol | Sugar alcohol (not drinking alcohol) | Not sugar | OKAY |
| Allulose | Rare sugar | Left out of Total and Added Sugars ([FDA](https://www.fda.gov/media/123342/download)) | OKAY |
| Tagatose, isomaltulose | Rare sugar | Counted as sugar ([Federal Register](https://www.federalregister.gov/documents/2020/10/19/2020-22900/sugars-that-are-metabolized-differently-than-traditional-sugars)) | Added sugar (grams decide) |
| Maltodextrin | Other carbohydrate (nonsweet, DE under 20, [21 CFR 184.1444](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-184/subpart-B/section-184.1444)) | Not sugar | Allowed in CLEAN |
| Resistant maltodextrin | Fiber ([FDA](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/questions-and-answers-dietary-fiber)) | Not sugar | Allowed in CLEAN |
| Juice concentrate in another food | Added sugar ([FDA](https://www.fda.gov/media/117402/download)) | Added | Added sugar (grams decide) |
| 100% juice from concentrate | Naturally occurring | Not added | Allowed in CLEAN |
| Single-strength juice, fruit puree | Naturally occurring | Not added | Allowed in CLEAN |
| Lactose listed on its own | Added sugar | Added | Added sugar (grams decide) |
| Milk, yogurt, whey | Naturally occurring | Not added | Allowed in CLEAN |

## Open items (not decided; nothing invented)

1. NHDC (E959) is grouped with the artificial sweeteners. This is an assumption.
2. "Malted Barley" (and "malt" names in general) aren't in the registry, so "malt" reads as a possible sweetener: an NA beer listing malted barley comes out OKAY (O4), not CLEAN. Adding it is a registry decision for the user.
3. Unknown ingredients with no sweet signal don't block CLEAN. They're listed in `unresolved` for transparency.
4. If the lists failed and the user taps Retry after Jev's CLEAN was shown, and the retried reading finds added sugar, the safety floor changes CLEAN to OKAY or BAD. This is the only case where a shown verdict changes.
