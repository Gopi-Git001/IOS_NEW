# Yuka overall food score: reconstructed logic

Prepared 2026-11-07 for QuickGOB / Reallabel. Status: research and reference code only, not wired into the app.

**How this was built.** Every rule below comes from Yuka's public help pages and terms, plus the official Nutri-Score rules from Santé publique France. The Yuka app was not decompiled or intercepted: no app file was supplied, and inspecting a third-party app is outside what we are authorized to do. The formula has not yet been compared against scores shown in the Yuka app. Each rule is labeled:

- **Stated** — Yuka or Santé publique France says it directly.
- **Derived** — follows arithmetically from stated rules and is consistent with them.
- **Assumed** — our best guess where nothing is published.

## 1. The formula

```
score = 0.60 × NutritionTable(NutriScorePoints)      // 0..60
      + max(0, 30 − Σ additive penalties)            // 0..30
      + (organic ? 10 : 0)                           // 0 or 10
if (any red additive) or (Nutri-Score is D or E): score = min(score, 49)
score = round(score)
```

| Rule | Value | Label | Source |
|---|---|---|---|
| Nutrition weight | 60% | Stated | [Yuka: How are food products rated?](https://help.yuka.io/l/en/article/ijzgfvi1jq-how-are-food-products-scored) |
| Additives weight | 30% | Stated | same |
| Organic weight | 10%, a bonus for an official national or international organic label | Stated | same |
| Red additive cap | at most 49/100 | Stated | same; also [Yuka Terms (EU/UK)](https://help.yuka.io/l/en/article/nui6tegnjw-terms-conditions-ue-uk) |
| Nutri-Score D/E cap | at most 49/100 | Stated | [Yuka: How is the Nutri-Score used to obtain the Yuka rating?](https://help.yuka.io/l/en/article/owuc9rbhqs-how-is-the-nutri-score-correlated-to-obtain-the-yuka-rating) |
| Nutrition part = table value × 0.6 | — | Derived: the best D (15) gives 9 + 30 + 10 = 49, which matches the stated D/E cap exactly | — |
| Additive penalties | green 0, yellow −6, orange −15, red −30 per additive | Stated | [Yuka: Additives' evaluation methodology](https://help.yuka.io/l/en/article/yth80j3vle-sources-analysis-of-food-additives) |
| Penalties add up, additive part floors at 0 | — | Assumed ("per additive", no floor stated) | — |
| Rounding | round to a whole number | Assumed | — |
| Everything is per 100 g or 100 mL | — | Stated | [Yuka: Does the app take quantity into account?](https://help.yuka.io/l/en/article/95yx3jtpr3-quantity-consumed) |

**Rating bands.** Excellent 75–100, Good 50–74, Poor 25–49, Bad 0–24, as reported by [Wirecutter](https://www.nytimes.com/wirecutter/reviews/advice-beauty-product-scanning-apps/?eafs_enabled=false). A [WCRF review](https://www.wcrf.org/about-us/news-and-blogs/healthy-new-you-the-yuka-app-review/) gives slightly different edges, so treat the exact edges as unconfirmed.

**Sanity check.** [BBC Good Food](https://www.bbcgoodfood.com/health/should-you-be-using-a-nutrition-app) notes that fresh fruit only reaches 100 if it is organic. The formula gives 90 for a conventional apple (60 + 30 + 0) and 100 for an organic one (see the tests).

## 2. Nutri-Score points (original 2017 algorithm)

Yuka says it still uses the **original** Nutri-Score algorithm during the transition period, not the 2023 update ([Yuka: What is the Nutri-Score?](https://help.yuka.io/l/en/article/fw1tjp24o4-what-is-the-nutri-score)). The thresholds below come from Santé publique France's conditions of use ([BLV mirror, version 26 June 2024](https://www.blv.admin.ch/dam/fr/sd-web/HGZNnGi-OQON/benutzerreglement-nutri-score-en.pdf)). A value must be strictly greater than a threshold to earn that point.

**Bad points (N, 0–40), per 100 g**

| Pts | Energy kJ | Sugars g | Sat. fat g | Sodium mg |
|---|---|---|---|---|
| 1 | >335 | >4.5 | >1 | >90 |
| 2 | >670 | >9 | >2 | >180 |
| 3 | >1005 | >13.5 | >3 | >270 |
| 4 | >1340 | >18 | >4 | >360 |
| 5 | >1675 | >22.5 | >5 | >450 |
| 6 | >2010 | >27 | >6 | >540 |
| 7 | >2345 | >31 | >7 | >630 |
| 8 | >2680 | >36 | >8 | >720 |
| 9 | >3015 | >40 | >9 | >810 |
| 10 | >3350 | >45 | >10 | >900 |

Sodium = salt ÷ 2.5.

**Good points (P, 0–15)**

| Pts | Protein g | Fiber g | Fruit/veg/legumes/nuts/rapeseed-walnut-olive oil % |
|---|---|---|---|
| 1 | >1.6 | >0.9 | >40 |
| 2 | >3.2 | >1.9 | >60 |
| 3 | >4.8 | >2.8 | — |
| 4 | >6.4 | >3.7 | — |
| 5 | >8.0 | >4.7 | >80 |

**Combining them.** If N < 11, or the product is cheese, or fruit/veg points are at the maximum: score = N − P. Otherwise protein is left out: score = N − fiber − fruit/veg.

**Beverages** use their own energy, sugar and fruit/veg tables. Energy: 0 points at ≤0 kJ, then one point per 30 kJ up to 10 points at >270 kJ. Sugars: 0 points at ≤0 g, then one point per 1.5 g up to 10 points at >13.5 g. Fruit/veg: 2 points at >40%, 4 at >60%, 10 at >80%. Milk and drinks with more than 80% milk are not counted as beverages ([AESAN](https://www.aesan.gob.es/AECOSAN/docs/documentos/Nutri_Score/Annual_report_2021_ScC_FINAL2.pdf)). Yuka confirms that beverages are rated more strictly on calories and sugar ([Yuka: Why are beverages rated differently?](https://help.yuka.io/l/en/article/3sow5h4wxs-rating-scales-beverages)).

**Fats** (oils, butter, margarine) replace saturated fat with the ratio of saturated fat to total fat: 0 points below 10%, +1 point per 6 percentage points, 10 points at ≥64% ([Yuka: fat ratio](https://help.yuka.io/l/en/article/pbnm69lz8i-fat-ratio); BLV Table 3).

## 3. Yuka's table: Nutri-Score points → 0–100

This is from the images on [Yuka's correspondence page](https://help.yuka.io/l/en/article/owuc9rbhqs-how-is-the-nutri-score-correlated-to-obtain-the-yuka-rating), saved in this folder as `table-general.jpg` and `table-beverages.jpg`.

| Solid points | min | −3 | −2 | −1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | ≥19 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Yuka /100 | 100 | 100 | 100 | 90 | 80 | 75 | 70 | 65 | 60 | 55 | 50 | 45 | 40 | 35 | 30 | 15 | 13 | 11 | 9 | 7 | 5 | 3 | 1 | 0 |

| Beverage points | min (< −3) | −3 | −2 | −1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | ≥10 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Yuka /100 | 80 | 77 | 74 | 71 | 68 | 65 | 57 | 49 | 41 | 33 | 15 | 11 | 7 | 3 | 0 |

Letters for solids: A ≤−1, B 0–2, C 3–10, D 11–18, E ≥19. For beverages: waters are A, B ≤1, C 2–5, D 6–9, E ≥10.

## 4. Special categories (stated by Yuka, details partly unpublished)

| Category | Yuka rule | Source |
|---|---|---|
| Salt | Nutrition 50% (always fails, so the maximum is 50), additives 30% (sodium ferrocyanide −6, which Yuka's page labels E235 though it is E535; potassium iodate E917 −30), unrefined +10, sea salt +10 | [Yuka: How are salts rated?](https://help.yuka.io/l/en/article/0ugjxul5pe-untitled-article-en) |
| Chocolate | Nutrition 35%, cocoa % 25%, additives 20%, organic 10%, pure cocoa butter 10%. How cocoa % turns into points is not published | [Yuka: How are the chocolates rated?](https://help.yuka.io/l/en/article/s10gg49v7c-how-are-the-chocolates-rated) |
| Reconstituted (powders, cubes, syrups) | Scored as prepared, per 100 g of the mixed product | [Yuka: reconstituted products](https://help.yuka.io/l/en/article/vj6oskxerl-rating-of-reconstituted-products) |
| Not rated | Alcohol; sugar, honey, syrups and sweeteners; infant formula; protein supplements; pet food; nutritional supplements; products with no nutrition facts | [Yuka: unrated products](https://help.yuka.io/l/en/article/erodqtx4nx-unrated-food-products), [Yuka: Why is sugar not rated?](https://help.yuka.io/l/en/article/upa9faci9p-sugar-not-rated) |
| Not considered | Pesticides (only through the organic bonus), handmade vs industrial, other labels | [Yuka: pesticides](https://help.yuka.io/l/en/article/34n7zddnal-pesticides), [Yuka: cheese](https://help.yuka.io/l/en/article/xve82ym3kc-cheese) |

## 5. How additives get their color (Yuka's criteria)

- **Red** requires all three: a serious health effect, a high level of evidence, and an estimated exposure of concern.
- **Orange** means those criteria are not fully met.
- **Yellow** covers less concerning effects, such as digestive discomfort, allergenic potential or effects on gut microbiota, or a meaningful effect with weak evidence.
- **Green** means no identified risk at food doses.

Source: [Yuka: classification of food additives](https://help.yuka.io/l/en/article/uell2r13f8-classification-food-additives).

**Biggest gap.** Yuka's color for each individual additive is only visible inside the app, and it is Yuka's own database. Do not copy it. To implement this, QuickGOB needs its own additive registry, classed with cited sources against these criteria. Our existing ingredient registry structure can hold it.

## 6. Open questions before implementing

1. **Fruit/veg %.** It is rarely on a label, and Yuka says it estimates it but does not say how. Options: assume 0 unless declared, or estimate from the ingredient order.
2. **Additive stacking.** Do penalties really add up without limit, with the 30 points floored at 0? This is assumed.
3. **Rounding and band edges.** Both are assumed or unconfirmed.
4. **Beverage minimum.** The liquid column tops out at 80, so a beverage maxes at 88 with organic, while water is A. We assume water's nutrition part is 100.
5. **Validation.** Compare the formula with a handful of products scanned in the Yuka app before claiming parity.

## 7. Reference code

- `yukaScore.ts` — the formula above as a pure function.
- `yukaScore.test.ts` — 8 worked examples. Run them with `npx -y tsx --test docs/research/yuka/yukaScore.test.ts`; all 8 passed on 2026-11-07.
