# Sugar rules (policy `rules-v2.1`, registry `registry-2026.11.06`)

The policy is Rules v2, which the user approved and re-confirmed on Nov 6, 2026. There's no GOOD tier. Any added sugar of any type is UGLY, with no gram cutoff. These verdicts are QuickGOB's preferences, not medical safety findings.

## Pipeline

| Stage | File | What it does |
|---|---|---|
| 1. Extraction | `supabase/functions/scan-label/index.ts` | Claude copies the ingredient list and the printed sugar numbers exactly as they appear. It doesn't sort anything or give a verdict. |
| 2. Normalization | `_shared/normalize.ts` | Parses nested brackets, `and/or`, lead-ins like "Contains 2% or less of", footnote marks and E/INS codes. Matches exact keys only, never substrings. |
| 3. Classification | `_shared/ingredients.ts` | One versioned registry. Each entry has an id, aliases, codes, a class, how US labels treat it, and its QuickGOB treatment. |
| 4. Policy | `_shared/policy.ts` `evaluate()` | One ordered function. It returns the verdict (or unresolved), the rule id, the evidence with the printed text, the quantities and their basis, what's missing, warnings and a short explanation. |
| Adapter | `_shared/rules.ts` | Maps the evaluation onto the `ScanResult` the app renders. |

Jev's role is unchanged, by the user's decision on Nov 6, 2026. Jev makes the final call from the photo (`_shared/jev.ts`, `src/lib/combine.ts`). These rules decide only when Jev is unavailable or unsure.

## Rule table (first match wins)

| Rule | Condition | Result |
|---|---|---|
| A1-not-a-label | The photo isn't a food label | Unresolved, retake |
| A2-unreadable | The ingredient text can't be read | Unresolved, retake |
| U1-added-sugar | Any added sugar is listed, including juice concentrate, added lactose, tagatose or isomaltulose | UGLY |
| U2-panel-added-sugar | The panel shows Added Sugars above 0 g | UGLY |
| U3-artificial-sweetener | Sucralose, aspartame, acesulfame K, saccharin, cyclamate, neotame, advantame, aspartame-acesulfame salt or NHDC | UGLY |
| U4-erythritol-xylitol | Erythritol or xylitol | UGLY |
| U5-drinking-alcohol | Beer, wine, spirits or ethanol listed, or an ABV printed | UGLY |
| A3-no-ingredient-list | No ingredient list is visible | Unresolved, retake |
| A4-incomplete-list | The list is cut off or partly unreadable | Unresolved, retake |
| A5-unknown-ingredient | An unknown ingredient that may sweeten (sweet-sounding words or an unknown code in E950–E969) | Unresolved |
| A6-needs-context | Juice from concentrate, or fruit puree concentrate | Unresolved |
| B1-sugar-alcohol | Sorbitol, maltitol, mannitol, isomalt, lactitol or polyglycitol | BAD |
| B2-plant-sweetener | Stevia, monk fruit or thaumatin | BAD |
| B3-allulose | Allulose | BAD |
| C1-nothing-sweet-added | A complete list with none of the above | CLEAN |

UGLY triggers are checked before an incomplete list counts as unresolved, because a cut-off list can only hide more, never less. Every ingredient inside a blend is evaluated, and stevia never overrides a worse ingredient. The rules make no inferences from an ingredient's position in the list, its quantity, or deception.

## Quantities

- Total and added sugars are kept separate, with their basis (per serving, per 100 g, per 100 ml or unknown).
- Missing grams stay `null` and are listed in `missing`. They never become 0.
- A printed 0 g doesn't cancel a listed added sugar. US labels may round amounts under 0.5 g down to 0, and the output says so in `warnings`.
- If the panel shows added sugar but no added sugar was found in a complete list, the result is UGLY and the contradiction is reported in `warnings`.

## Identity vs. treatment (examples)

| Ingredient | Class | US label treatment | QuickGOB v2 |
|---|---|---|---|
| Sucralose | Non-sugar sweetener (artificial) | Not sugar | UGLY |
| Erythritol | Sugar alcohol (not drinking alcohol) | Not sugar | UGLY |
| Allulose | Rare sugar | Left out of Total and Added Sugars ([FDA](https://www.fda.gov/media/123342/download)) | BAD |
| Tagatose, isomaltulose | Rare sugar | Counted as sugar ([Federal Register](https://www.federalregister.gov/documents/2020/10/19/2020-22900/sugars-that-are-metabolized-differently-than-traditional-sugars)) | UGLY |
| Maltodextrin | Other carbohydrate (nonsweet, DE under 20, [21 CFR 184.1444](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-184/subpart-B/section-184.1444)) | Not sugar | Allowed in CLEAN |
| Resistant maltodextrin | Fiber ([FDA](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/questions-and-answers-dietary-fiber)) | Not sugar | Allowed in CLEAN |
| Juice concentrate | Added sugar ([FDA](https://www.fda.gov/media/117402/download)) | Added | UGLY |
| Single-strength juice, fruit puree | Naturally occurring | Not added | Allowed in CLEAN |
| Lactose listed on its own | Added sugar | Added | UGLY |
| Milk, yogurt, whey | Naturally occurring | Not added | Allowed in CLEAN |

## Open items (not decided; nothing invented)

1. The 100% juice exception. Under v2, a 100% juice made from concentrate is unresolved (A6), and juice concentrate in other foods is UGLY. Should 100% juice ever be CLEAN?
2. NHDC (E959) is grouped with the artificial sweeteners. This is an assumption.
3. The client's strict-mode switch (`src/lib/display.ts`) shows stevia-only or monk-fruit-only products as CLEAN when it's off. That's a display-level exception to v2.
4. Jev keeps the final call, so a Jev verdict can override a deterministic rules verdict, including UGLY from a listed sugar.
5. Unknown ingredients with no sweet signal don't block CLEAN. They're listed in `unresolved` for transparency.
