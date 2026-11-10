# QuickGOB accuracy test set

This folder checks the most important thing about QuickGOB: does a real photo of a real label
give the right verdict and the right sugar lists, fast enough?

```
tests/eval/
├── README.md        this file
├── labels.json      the 60 test cases and their correct answers
├── shopping-list.csv the 60 products as a checklist (open in Excel/Sheets)
├── fetch-photos.mjs  downloads the label photos for you
├── review.md         created by the script, for checking answers
└── photos/          your label photos go here (one per case)
```

## How it works

1. You photograph each product in `labels.json` with your own phone.
2. You check the pre-filled answers against your photo and fix them.
3. `npm run eval` (`run-eval.mjs`) sends every item with `"verified": true` and `"photo_status": "ok"`
   through the same crop / resize / JPEG steps as the app and the live scan pipeline, and compares what
   the app would show with the correct answers. `--only <id>[,<id>]` runs a few; `--dry-run` only
   prepares the photos and estimates the cost. It stops before spending more than $2.
4. You get `report.md`: verdict accuracy by group, missed or wrong sugars, speed and cost, and
   `RESULT: PASS` / `RESULT: FAIL` (accuracy ≥ 95%, no sweetened item called CLEAN, p95 ≤ 8 s).
   Settings come from env only; see the header of `run-eval.mjs`.

Run it before every release, and after any change to prompts, models or rules.

## The 60 cases

| Group | Cases | What it checks |
|---|---|---|
| CLEAN | 12 | Water, plain nuts, oats, plain yogurt, marinara, "unsweetened" wording |
| OKAY | 4 | Stevia-only products |
| BAD: added sugar | 25 | Sodas, sports and energy drinks, cereals, bars, sauces, yogurt, bread |
| BAD: sweeteners | 6 | Aspartame, sucralose, ace-K, erythritol |
| BAD: alcohol | 2 | Hard seltzer, light beer |
| Edge cases | 4 | Non-alcoholic beer, kombucha, 100% juice, non-English label |
| Photo quality | 7 | Blur, glare, curved bottle, dim light, panel only, not a food |

## Getting the photos automatically

`fetch-photos.mjs` downloads real ingredient-label photos for 56 of the 60 cases from
[Open Food Facts](https://world.openfoodfacts.org), an open database of label photos people took
with their phones (license CC BY-SA 3.0, fine for internal testing). From the repo root:

```
npm i -D sharp                   # optional, makes the blur / glare / dim-light versions
node tests/eval/fetch-photos.mjs # takes ~7 minutes (the database allows ~10 searches a minute)
```

It also writes `review.md`: for every case, the product it matched, the ingredient text from the
database, and your expected answers side by side, so checking is quick. If a search picked the
wrong product, edit its search line in `PLAN` at the top of the script and rerun with
`--only <id> --force`.

Take by hand: `59-not-food-shoe` (any non-food object), plus the blur/glare/dim versions if you
skip `sharp`. Over time, add your own phone photos too: database photos are a good start, but
your own shots in store lighting test the camera path best.

## Taking the photos yourself

- Use the app's own camera framing: the ingredient list inside the dashed box.
- Normal kitchen or store light, phone held steady, unless the case says otherwise
  (blurry, glare, dim light are deliberate).
- Save as JPEG with the exact file name shown in `photo` (e.g. `photos/17-coca-cola.jpg`).
- Don't have a product? Swap in a similar one and update `product` and the answers.

## Checking the answers (important)

The answers are **pre-filled from typical US labels**. Recipes change, so **your photo is the truth**:

1. Open the photo and read its ingredient list.
2. Fix `expected_natural_sugars`, `expected_added_sugars`, `expected_sweeteners` to match it.
   Use the names as printed, in Title Case.
3. Set `expected_verdict` (CLEAN / OKAY / BAD / RETRY). Entries with `null` need you to decide.
4. Set `"verified": true`, and `"photo_status": "ok"` once the photo is the right product and usable.
   The eval script only scores entries with both.

### Verdict rules used for the pre-filled answers (current code)

| Label contains | Verdict |
|---|---|
| Nothing sweet added (natural sugars like milk, fruit or dates are fine) | CLEAN |
| Up to 4 g added sugar per serving, a sugar alcohol (erythritol, xylitol…), allulose, stevia or monk fruit | OKAY |
| Over 4 g added sugar per serving, added sugar with unreadable grams, an artificial sweetener, or alcohol over 0.5% ABV | BAD |
| Unreadable, no ingredient list, a cut-off list, or not a food | RETRY |

The app and the code both say CLEAN / OKAY / BAD (Rules v3, [RULES.md](../../RULES.md)).
Items whose verdict may have changed with v3 are listed in review.md under "RE-CHECK AFTER RULE CHANGE".
To run the eval against local Supabase, see [README-local-testing.md](../README-local-testing.md).

## Example entry

```json
{
  "id": "17-coca-cola",
  "photo": "photos/17-coca-cola.jpg",
  "product": "Coca-Cola Classic (can)",
  "tests": "High added sugar (HFCS)",
  "expected_verdict": "BAD",
  "expected_natural_sugars": [],
  "expected_added_sugars": ["High Fructose Corn Syrup"],
  "expected_sweeteners": [],
  "verified": false
}
```
