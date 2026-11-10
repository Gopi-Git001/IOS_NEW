# Review: check each photo, fix labels.json, set verified = true

## PROPOSED ANSWERS (needs my approval)

Read from the photos on Nov 9, 2026 and worked out under Rules v3 (RULES.md). No API calls were made and
labels.json was NOT changed for these items. 17-coca-cola is not listed: its photo matched labels.json and it was
set to `verified: true`. Lists are written natural / added / sweeteners; "—" means empty. "added sugar g" is the
per-serving "Includes X g Added Sugars" line on the photo.

Tally: 37 photos, 27 match, 10 need a change (4 verdicts, 3 lists only, 3 DECIDE items), 0 can't read.

| id | ingredients as read | added sugar g | current answer | proposed answer | match? | notes |
|---|---|---|---|---|---|---|
| 12-hard-boiled-eggs | none visible (front of the carton: "Organic Brown Eggs, 12 large") | not visible | CLEAN · — / — / — | RETRY · — / — / — | NO (verdict) | R3-no-ingredient-list. To keep CLEAN, retake a side of the carton that prints "Ingredients: eggs". |
| 16-sweetleaf-drops | Fibre: modified starch (contains wheat), Erythritol**, Sweetener: Steviol Glycosides | not visible | BAD · — / — / Erythritol, Steviol Glycosides | OKAY · — / — / Erythritol, Steviol Glycosides | NO (verdict) | O2 sugar alcohol + O3 stevia, no added sugar, no artificial sweetener. The photo is a Hermesetas stevia box, not SweetLeaf drops. |
| 29-vitaminwater-zero | reverse osmosis water, less than 1% of: erythritol, citric acid, calcium phosphate, magnesium lactate and calcium lactate and potassium phosphate (electrolyte sources), gum acacia, phosphoric acid, vitamin C (ascorbic acid), stevia leaf extract, natural flavors, zinc gluconate, glycerol ester of rosin, vitamin B5 (calcium pantothenate), vitamin E (alpha-tocopheryl acetate), vitamin B6 (pyridoxine hydrochloride), vitamin A palmitate | not visible | BAD · — / — / Erythritol, Stevia Leaf Extract | OKAY · — / — / Erythritol, Stevia Leaf Extract | NO (verdict) | O2 + O3 only. |
| 58-nutrition-panel-only | Panel: serving 1 1/4 cup (41 g), Total Sugars …, "Includes 1? g Added Sugars 30%". Ingredients (small, rotated, but visible): Milled Corn, Sugar, Contains 2% or less of: Corn Syrup, Salt, Barley Malt Extract, Wheat Starch. Vitamins and Minerals: Ferric Orthophosphate (source of iron), Niacinamide (Vitamin B3), Zinc Oxide (source of zinc), Thiamin Mononitrate (Vitamin B1), Calcium Pantothenate (B-Vitamin), Pyridoxine Hydrochloride (Vitamin B6), Folic Acid. | about 15 g (30% DV; second digit under glare) | RETRY · — / — / — | BAD · — / Sugar, Corn Syrup, Barley Malt Extract / — | NO (verdict + lists) | The photo is not panel-only: the ingredient list is at the right. X1 (over 4 g). For a real "panel only" test, retake with the list out of frame (then: over 4 g on the panel is still BAD under v3). |
| 26-monster-original | Carbonated Water, Sugar, Glucose, Citric Acid, Natural Flavors, Taurine, Sodium Citrate, Color Added, Panax Ginseng Extract, L-Carnitine L-Tartrate, Caffeine, Sorbic Acid (Preservative), Benzoic Acid (Preservative), Niacinamide (Vit. B3), Sucralose, Salt, D-Glucuronolactone, Inositol, Guarana Extract, Pyridoxine Hydrochloride (Vit. B6), Riboflavin (Vit B2), Maltodextrin, Cyanocobalamin (Vit. B12) | not visible | BAD · — / Sugar, Glucose / — | BAD · — / Sugar, Glucose / Sucralose | NO (lists) | Sucralose is on the photo. Maltodextrin left out, as for item 05. |
| 33-white-claw | Purified Carbonated Water, Alcohol, Natural Flavors, Cane Sugar, Citric Acid, Natural Cherry Juice Concentrate, Sodium Citrate | not visible | BAD · — / — / — | BAD · — / Cane Sugar, Cherry Juice Concentrate / — | NO (lists) | X2 and X4. The concentrate sweetens another drink, so it is added sugar. The photo is upside down. |
| 39-clif-chocolate-chip | Organic Brown Rice Syrup, Organic Rolled Oats, Soy Protein Isolate, Organic Cane Syrup, Organic Roasted Soybeans, Rice Flour, Cane Sugar, Unsweetened Chocolate, Organic Soy Flour, Organic Oat Fiber, Organic High Oleic Sunflower Oil, Cocoa Butter, Barley Malt Extract, Sea Salt, Natural Flavors, Soy Lecithin, Organic Cinnamon. Vitamins & Minerals: … | not visible | BAD · — / Brown Rice Syrup, Cane Syrup, Cane Sugar / — | BAD · — / Brown Rice Syrup, Cane Syrup, Cane Sugar, Barley Malt Extract / — | NO (lists) | Barley malt extract is added sugar (decided Nov 9). |
| 51-athletic-brewing-na | (cut at left) "…ients: Water, Malted Barley, Oats, Wheat, Yeast" (blurry; no hops on the photo) | not visible | DECIDE · — / — / — | CLEAN · — / — / — | NO (DECIDE) | Malted barley is the brewing grain. No ABV or "non-alcoholic" line is on the photo, so only the ingredients decide. Borderline photo: blurry and the first word is cut. A retake that includes the NA claim is recommended. |
| 52-gts-kombucha | GT's Kombucha*▲, passion fruit puree, orange juice, and guava juice. ▲30-day ferment of Kombucha culture*, black tea*, green tea*, kiwi juice*, and cane sugar*♦. ♦Used for fermentation, not as an added sweetener. | not visible | DECIDE · — / — / — | BAD · Passion Fruit Puree, Orange Juice, Guava Juice, Kiwi Juice / Cane Sugar / — | NO (DECIDE) | RULES.md has no exception for fermentation sugar, so cane sugar with no grams is X2 BAD. If you decide fermentation sugar isn't added sugar, this becomes CLEAN. No ABV claim is visible. Juices and puree are single-strength, so they count as natural. |
| 60-non-english-label | (French, slightly blurry) Sucre, graisses végétales (huiles: tournesol, …, colza et beurre de cacao), LAIT écrémé en poudre …%, pâte de NOISETTES …%, éclats de PISTACHES enrobés de sucre …% (PISTACHES …%, sucre …%), cacao maigre en poudre, fleur de sel …%, émulsifiant: lécithine de SOJA. Nutrition per 100 g only. | not visible (per 100 g only) | DECIDE · — / — / — | BAD · Lait écrémé en poudre (skim milk powder) / Sucre (sugar) / — | NO (DECIDE) | X2: grams per 100 g only. Decide whether the expected names should be French or English. |
| 01-lacroix-pamplemousse | Carbonated Water, Natural Flavor | not visible | CLEAN · — / — / — | CLEAN · — / — / — | yes | |
| 03-smartwater | vapor distilled water, calcium chloride and magnesium chloride and potassium bicarbonate (electrolyte sources*) | not visible | CLEAN · — / — / — | CLEAN · — / — / — | yes | |
| 06-quaker-old-fashioned-oats | Whole grain rolled oats | not visible | CLEAN · — / — / — | CLEAN · — / — / — | yes | |
| 07-fage-total-0-plain | Grade A Pasteurized Skimmed Milk, Live Active Yogurt Cultures (L. Bulgaricus, S. Thermophilus, L. Acidophilus, Bifidus, L. Casei) | not visible | CLEAN · Milk / — / — | CLEAN · Milk / — / — | yes | |
| 10-365-peanut-butter | Organic Dry Roasted Peanuts | not visible | CLEAN · — / — / — | CLEAN · — / — / — | yes | |
| 11-unsweetened-almond-milk | Almondmilk (Filtered Water, Almonds), Calcium Carbonate, Natural Vanilla Flavor with Other Natural Flavors, Sea Salt, Potassium Citrate, Sunflower Lecithin, Gellan Gum, Vitamin A Palmitate, Vitamin D2, D-Alpha-Tocopherol (Natural Vitamin E) | not visible | CLEAN · — / — / — | CLEAN · — / — / — | yes | The photo has gellan gum, not the database's carrageenan. No effect. |
| 13-lmnt-citrus-salt | Salt (Sodium Chloride), Citric Acid, Magnesium Malate, Potassium Chloride, Natural Flavors, Stevia Leaf Extract (4 flavours side by side; the 4th adds Malic Acid, Watermelon Flavor) | not visible | OKAY · — / — / Stevia Leaf Extract | OKAY · — / — / Stevia Leaf Extract | yes | O3. |
| 14-zevia-cola | Carbonated Water, Stevia Leaf Extract, Natural Flavors, Citric Acid | not visible (Total Sugars 0 g) | OKAY · — / — / Stevia Leaf Extract | OKAY · — / — / Stevia Leaf Extract | yes | O3. |
| 19-diet-coke | Carbonated Water, Caramel Color, Aspartame, Phosphoric Acid, Potassium Benzoate (to Protect Taste), Natural Flavors, Citric Acid, Caffeine | not visible | BAD · — / — / Aspartame | BAD · — / — / Aspartame | yes | X3. |
| 20-coke-zero | Carbonated Water, Caramel Color, Phosphoric Acid, Aspartame, Potassium Benzoate (to Protect Taste), Natural Flavors, Potassium Citrate, Acesulfame Potassium, Caffeine | not visible | BAD · — / — / Aspartame, Acesulfame Potassium | BAD · — / — / Aspartame, Acesulfame Potassium | yes | X3. |
| 22-gatorade-zero | Water, Citric Acid, Sodium Citrate, Salt, Monopotassium Phosphate, Gum Arabic, Natural Flavor, Sucralose, Acesulfame Potassium, Sucrose Acetate Isobutyrate, Glycerol Ester of Rosin, Yellow 6 (3 flavours shown) | 0 g | BAD · — / — / Sucralose, Acesulfame Potassium | BAD · — / — / Sucralose, Acesulfame Potassium | yes | X3. Sucrose acetate isobutyrate is an emulsifier (see the finding below). |
| 25-liquid-iv-lemon-lime | Pure Cane Sugar, Dextrose, Citric Acid, Salt, Potassium Citrate, Sodium Citrate, Dipotassium Phosphate, Silicon Dioxide, Stevia Leaf Extract (Rebaudioside A), Vitamin C (Ascorbic Acid), Natural Flavors, Vitamin B3 (Niacinamide), Vitamin B5 (D-Calcium Pantothenate), Vitamin B6 (Pyridoxine Hydrochloride), Vitamin B12 (Cyanocobalamin) | not visible | BAD · — / Cane Sugar, Dextrose / Stevia Leaf Extract | BAD · — / Cane Sugar, Dextrose / Stevia Leaf Extract | yes | X2. |
| 30-starbucks-frappuccino | Brewed Starbucks Coffee (Water, Coffee), Reduced-Fat Milk, Sugar, Cocoa, Pectin | not visible | BAD · Milk / Sugar / — | BAD · Milk / Sugar / — | yes | X2. Glare, but readable. |
| 31-snapple-peach-tea | Filtered Water, Citric Acid, Tea, Aspartame, Potassium Citrate, Natural Flavors, Malic Acid | not visible | BAD · — / — / Aspartame | BAD · — / — / Aspartame | yes | X3. |
| 34-michelob-ultra | no ingredient list; "4.2% ALC./VOL", per 12 fl oz: calories 95, carbohydrates 2.6 g | not visible | BAD · — / — / — | BAD · — / — / — | yes | X4 (4.2% ABV) is checked before R3 (no list). |
| 35-honey-nut-cheerios | Whole Grain Oats, Sugar, Corn Starch, Honey, Brown Sugar Syrup, Salt, Tripotassium Phosphate, Canola and/or Sunflower Oil, Natural Almond Flavor, Vitamin E (mixed tocopherols) … Vitamins and Minerals: … | not visible | BAD · — / Sugar, Honey, Brown Sugar Syrup / — | BAD · — / Sugar, Honey, Brown Sugar Syrup / — | yes | X2. |
| 37-nature-valley-oats-honey | Whole Grain Oats, Sugar, Canola Oil, Rice Flour, Honey, Salt, Brown Sugar Syrup, Baking Soda, Soy Lecithin, Natural Flavor | not visible | BAD · — / Sugar, Honey, Brown Sugar Syrup / — | BAD · — / Sugar, Honey, Brown Sugar Syrup / — | yes | X2. |
| 38-kind-dark-choc-nuts | Almonds, tapioca syrup, sugar, palm kernel oil, chicory root fiber, rice flour, honey, canola oil, alkalized cocoa, unsweetened chocolate, sea salt, natural flavor, soy lecithin, cocoa butter, Vitamin E (tocopherols to maintain freshness) | not visible | BAD · — / Tapioca Syrup, Sugar, Honey / — | BAD · — / Tapioca Syrup, Sugar, Honey / — | yes | X2. |
| 40-quest-bar | Protein blend (milk protein isolate, whey protein isolate), soluble corn fiber, cashew butter, isomalto-oligosaccharides (vegetable source), unsweetened chocolate, erythritol, water, cocoa butter, natural flavors, sea salt, sunflower lecithin, steviol glycosides (stevia) | not visible | BAD · — / Isomalto-Oligosaccharides / Erythritol, Steviol Glycosides | BAD · — / Isomalto-Oligosaccharides / Erythritol, Steviol Glycosides | yes | X2: IMO is added sugar and the grams are not on the photo. |
| 44-nutella | Sugar, Palm Oil, Hazelnuts, Cocoa, Skim Milk, Reduced Minerals Whey (Milk), Lecithin as Emulsifier (Soy), Vanillin: An Artificial Flavor | not visible | BAD · Skim Milk / Sugar / — | BAD · Skim Milk / Sugar / — | yes | X2. Whey is also a natural sugar (RULES.md); add it to the natural list if the app lists it. |
| 45-heinz-ketchup | (Dutch) Tomaten (148 g per 100 g Tomato Ketchup), azijn, suiker, zout, specerij- en kruidextracten (bevatten selderij), specerij. (French list cut off below.) | not visible | BAD · Tomatoes / Sugar / — | BAD · Tomatoes / Sugar / — | yes | X2. A Dutch label: the app may report "Tomaten" / "suiker", which won't match the English expected names. |
| 46-syrup-corn-syrup | High Fructose Corn Syrup, Water, Cellulose Gum, Salt, Natural and Artificial Flavor, Caramel Color, Sorbic Acid and Sodium Benzoate (Preservatives), Sodium Hexametaphosphate | not visible | BAD · — / High Fructose Corn Syrup / — | BAD · — / High Fructose Corn Syrup / — | yes | X2. |
| 47-daves-killer-bread | Organic Whole Wheat Flour, Water, Organic Cracked Whole Wheat, Organic Cane Sugar, Organic Wheat Gluten, Organic Expeller Pressed Canola Oil, Contains 2% or less of each of the following: Organic Molasses, Sea Salt, Yeast, Organic Cultured Wheat Flour, Organic Vinegar, Organic Acerola Powder, Enzymes | not visible | BAD · — / Organic Cane Sugar, Organic Molasses / — | BAD · — / Organic Cane Sugar, Organic Molasses / — | yes | X2. |
| 48-ritz-crackers | Unbleached Enriched Flour (Wheat Flour, Niacin, Reduced Iron, Thiamine Mononitrate {Vitamin B1}, Riboflavin {Vitamin B2}, Folic Acid), Soybean and/or Canola Oil, Palm Oil, Sugar, Salt, Leavening (Calcium Phosphate, Baking Soda), High Fructose Corn Syrup, Soy Lecithin, Natural Flavor | not visible | BAD · — / Sugar, High Fructose Corn Syrup / — | BAD · — / Sugar, High Fructose Corn Syrup / — | yes | X2. |
| 54-blurry-lacroix | unreadable (deliberately blurred copy of 01) | not visible | RETRY · — / — / — | RETRY · — / — / — | yes | R2. |
| 55-glare-coke-can | (glare) "…Water, High Fructose Corn Syrup, Caramel [Color], Phosphoric Acid, Natural Flavors, Caffeine" | not visible | BAD · — / High Fructose Corn Syrup / — | BAD · — / High Fructose Corn Syrup / — | yes | X2 is checked before R4. Same 519×168 shot as 17 with a glare overlay. In the one-photo eval, Claude called 17 unreadable, so a larger photo may be needed for both. |
| 57-dim-light-cereal | same list as 35 (darkened copy), readable | not visible | BAD · — / Sugar, Honey, Brown Sugar Syrup / — | BAD · — / Sugar, Honey, Brown Sugar Syrup / — | yes | X2. |

## RE-CHECK AFTER RULE CHANGE

Rules v3 (RULES.md, Nov 9, 2026) changed what OKAY and BAD mean. Many expected verdicts in labels.json were
pre-filled with the old policy (any added sugar, sugar alcohol, artificial sweetener or alcohol = BAD). The
expected verdicts below were NOT changed; check each photo and set `expected_verdict` yourself. Items not listed
keep their verdict (nothing sweet, stevia or monk fruit only, an artificial sweetener, or alcohol over 0.5% ABV).
"photo" is the item's `photo_status`: only `ok` items are scored; `replace` items need your own photo first
(see PHOTOS-TO-TAKE.md).

**Added sugar: now OKAY at 4 g or less per serving, BAD over 4 g or when the grams can't be read**

| id | photo | expected now | why it may change |
|---|---|---|---|
| 17-coca-cola, 55-glare-coke-can | ok | BAD | read the per-serving added-sugar grams on the photo |
| 18-sprite | replace | BAD | grams per serving |
| 21-gatorade-lemon-lime, 56-curved-gatorade | replace | BAD | grams per serving; on a curved bottle the panel may be off-photo (unreadable grams = BAD) |
| 25-liquid-iv-lemon-lime | ok | BAD | cane sugar + dextrose grams per stick (the stevia alone would be OKAY) |
| 26-monster-original | ok | BAD | grams per can; the database text also lists sucralose, which is BAD whatever the grams |
| 27-red-bull | replace | BAD | grams per can |
| 28-vitaminwater | replace | BAD | regular vitaminwater: crystalline fructose + cane sugar grams per bottle |
| 30-starbucks-frappuccino | ok | BAD | grams per bottle |
| 32-simply-lemonade | replace | BAD | cane sugar grams per serving (the lemon juice stays natural) |
| 35-honey-nut-cheerios, 57-dim-light-cereal | ok | BAD | grams per serving; the dim photo may hide the panel |
| 36-frosted-flakes | replace | BAD | grams per serving |
| 37-nature-valley-oats-honey | ok | BAD | grams per serving |
| 38-kind-dark-choc-nuts | ok | BAD | grams per bar |
| 39-clif-chocolate-chip | ok | BAD | grams per bar |
| 41-halo-top-vanilla | replace | BAD | cane sugar grams per serving (erythritol + stevia alone would be OKAY) |
| 43-oreo | replace | BAD | grams per serving (old photo deleted) |
| 44-nutella, 46-syrup-corn-syrup | ok | BAD | grams per serving |
| 45-heinz-ketchup | ok | BAD | grams per 1 tbsp serving (small serving, near the 4 g line) |
| 47-daves-killer-bread | ok | BAD | grams per slice (small serving) |
| 48-ritz-crackers | ok | BAD | grams per serving (small) |
| 49-chobani-vanilla | replace | BAD | grams per cup |
| 50-coffee-mate-original | replace | BAD | grams per 1 tsp serving (small) |
| 05-blue-diamond-almonds | replace | BAD | sugar in the wasabi seasoning: grams per serving |
| 08-larabar-cashew-cookie | replace | BAD | sugar in the chocolate chips: grams per bar |

**Sugar alcohols and allulose: now OKAY (were BAD)**

| id | photo | expected now | why it may change |
|---|---|---|---|
| 16-sweetleaf-drops | ok | BAD | erythritol + steviol glycosides, no added sugar, no artificial sweetener |
| 29-vitaminwater-zero | ok | BAD | erythritol + stevia, no added sugar, no artificial sweetener |
| 40-quest-bar | ok | BAD | erythritol + steviol glycosides, plus isomalto-oligosaccharides, which now count as added sugar: the grams per bar decide (4 g or less = OKAY) |
| 42-lilys-dark-chocolate | replace | BAD | maltitol + stevia, no sugar added |

**Juice and fruit concentrate: added sugar only when it sweetens another food**

| id | photo | expected now | why it may change |
|---|---|---|---|
| 53-simply-orange-juice | replace | (DECIDE) | a 100% juice product is natural sugar, not added sugar |
| 04-spindrift-grapefruit | replace | CLEAN | juice in sparkling water; check whether your photo's label says "concentrate" |

**Alcohol: "<0.5%", "0.0%", "0.5% ABV or less", "non-alcoholic", "alcohol-free" are not alcohol**

| id | photo | expected now | why it may change |
|---|---|---|---|
| 51-athletic-brewing-na | ok | (DECIDE) | the NA claim is not alcohol, and malted barley is now the brewing grain (not sugar): the rules give CLEAN on the database text |
| 52-gts-kombucha | ok | (DECIDE) | check for a <0.5% ABV / non-alcoholic claim and for added cane sugar grams |

**Other rule changes**

| id | photo | expected now | why it may change |
|---|---|---|---|
| 58-nutrition-panel-only | ok | RETRY | a panel showing more than 4 g added sugar is now BAD before "no ingredient list" asks for a retake; 4 g or less with no list stays RETRY |
| 60-non-english-label | ok | (DECIDE) | grams per 100 g only count as unreadable grams: any added sugar is BAD |
| 55-glare-coke-can, 57-dim-light-cereal | ok | BAD | if the glare or dim light cuts the list off but sugar is still readable, v3 says BAD (added sugar, grams unreadable) instead of RETRY |

## Rules vs your expected lists (database text, not your photo)

These don't change an expected verdict on their own; they are places where the rules and labels.json disagree
about an ingredient. Nothing was changed.

| id | finding |
|---|---|
| 26-monster-original | the database text lists sucralose; expected_sweeteners is empty. |
| 33-white-claw | the database text lists cane sugar and cherry juice concentrate; expected_added_sugars is empty (BAD stays, for the alcohol). |
| 39-clif-chocolate-chip | the database text lists barley malt extract (added sugar); expected_added_sugars doesn't. |
| 22-gatorade-zero | "sucrose acetate isobutyrate" (an emulsifier) reads as an unknown sweetener; BAD stays (sucralose). |
| 43-oreo `source.image` | still points at the deleted screenshot; fetch-photos.mjs now skips every item whose photo_status isn't `ok`, so it won't be downloaded again. |

## All items

| id | photo | matched product | label text from database | expected verdict | natural | added | sweeteners |
|---|---|---|---|---|---|---|---|
| 01-lacroix-pamplemousse | ok | Coconut Sparkling Water,  LaCroix · Naturally Essenced Coconut Sparkling Water | ONLY CARBONATED WATER, NATURALLY ESSENCED | CLEAN | — | — | — |
| 02-topo-chico | replace | Topo chico | MINERAL WATER, CARBON DIOXIDE Size 1 Bottle MADE IN MEXICO BY: Per Serving Calories Total Fat 0g m 15mg Mal Carb Protein 00 0 CIA. TOPO CHICO, S. DE R.L. DE C.V. MONTERREY NO. 6500 COL. TOPO CHICO, MTY N.LC.P 64260 FOR BOTTLED WATER % Daily Value QUALITY INFORMATION 56-4357 0% PLEASE CONTACT TOPO 1% 0% OLD! | CLEAN | — | — | — |
| 03-smartwater | ok | Glaceau · Glaceau smartwater, vapor distilled water | Vapor distilled water, calcium chloride and magnesium chloride and potassium bicarbonate (electrolyte sources*). | CLEAN | — | — | — |
| 04-spindrift-grapefruit | replace | Ardor Energy · Pink Grapefruit | carbonated purified water, organic L-theanine, organic green tea, organic flavor, organic caffeine (from green tea), sea salt | CLEAN | Grapefruit Juice, Lemon Juice | — | — |
| 05-blue-diamond-almonds | replace | Blue Diamond Almonds · Blue diamond almonds | Almonds, wasabi soy sauce seasoning (sugar, modified corn starch, salt, soy sauce [soybean, wheat, salt], horseradish, onion, spice, fractionated coconut oil and/or palm kernel oil, garlic, maltodextrin, yeast extract, natural flavor, citric acid, disodiu | BAD | — | Sugar | — |
| 06-quaker-old-fashioned-oats | ok | quaker old fashion oats | whole grain rolled oats, | CLEAN | — | — | — |
| 07-fage-total-0-plain | ok | Fage · Fage Total 0% | grade A pasteurized skimmed milk, live active yogurt cultures (L. bulgaricus, S. thermophilus, L. acidophilus, bifidus, L. casei) | CLEAN | Milk | — | — |
| 08-larabar-cashew-cookie | replace | Fair · Larabar Chocolate Chip Cookie Dough | cashews, dates, semisweet chocolate chips (unsweetened chocolate, sugar, cocoa butter, vanilla), apples, sea salt, vanilla extract. | BAD | Dates | Sugar | — |
| 09-raos-marinara | replace | Rao's Homemade Alfredo | light cream (cream, milk), water, butter (cream, natural flavorings), parmesan and romano cheese (pasteurized part-skim milk, cheese cultures, salt, enzymes), enzyme modified egg yolks, parmesan cheese (pasteurized milk, salt, rennet), sea salt, black pepper, white pepper, modified cornstarch, disodium phosphate xanthan gum, contains: egg, milk | CLEAN | Tomatoes | — | — |
| 10-365-peanut-butter | ok | 365 Whole Foods Market · Organic Unsalted Unsweetened Creamy Peanut Butter | Organic dry roasted peanuts. | CLEAN | — | — | — |
| 11-unsweetened-almond-milk | ok | Great Value,   Wal-Mart Stores  Inc. · Unsweetened almondmilk | almondmilk (filtered water, almonds), calcium carbonate, natural vanilla flavor with other natural flavors, sea salt, potassium citrate, carrageenan, sunflower lecithin, vitamin a palmitate, vitamin d2, d-alpha-tocopherol, (natural vitamin e), | CLEAN | — | — | — |
| 12-hard-boiled-eggs | ok | GoldEgg, JauneDoré · Organic Large Brown Eggs | Large Organic Free-Range Chicken Eggs. | CLEAN | — | — | — |
| 13-lmnt-citrus-salt | ok | LMNT · LMNT Electrolyte drink mix | Salt (Sodium Chloride), Citric Acid, Magnesium Malate, Potassium Chloride, Natural Flavors, Stevia Leaf Extract, Malic Acid, Watermelon Flavor. | OKAY | — | — | Stevia Leaf Extract |
| 14-zevia-cola | ok | zevia · zevia | carbonated water, stevia leaf extract, natural flavors, citric acid. | OKAY | — | — | Stevia Leaf Extract |
| 15-zevia-ginger-ale | replace | zevia · zevia | carbonated water, stevia leaf extract, natural flavors, citric acid. | OKAY | — | — | Stevia Leaf Extract |
| 16-sweetleaf-drops | ok | Stevia Sweet · Stevia | for hermes s fibre: modified starch (contains wheat), erythritol&quot;, sweetener: steviol glycosides *excess con have a laxa store in a cool and dry place, recyclable | BAD | — | — | Erythritol, Steviol Glycosides |
| 17-coca-cola | ok | Coca-Cola,  Coke · Coca-cola Coke - Classic | CARBONATED WATER, HIGH FRUCTOSE CORN SYRUP, CARAMEL COLOR, PHOSPHORIC ACID, NATURAL FLAVORS, CAFFEINE. | BAD | — | High Fructose Corn Syrup | — |
| 18-sprite | replace | Sprite Lemon lime soda | — | BAD | — | High Fructose Corn Syrup | — |
| 19-diet-coke | ok | Coke · Diet Coke - 6pk/16.9 fl oz Bottles | CARBONATED WATER, CARAMEL COLOR, ASPARTAME, PHOSPHORIC ACID, POTASSIUM 0% BENZOATE (TO PROTECT TASTE), NATURAL FLAVORS, CITRIC ACID, CAFFEINE. | BAD | — | — | Aspartame |
| 20-coke-zero | ok | Coca-Cola · Coca-Cola Zero Sugar | carbonated water, caramel color, phosphoric acid, ašpartame, pótasshum benzoate (to protect tasté), natural flavors, potassium citrate, acesulfame potassium, caffeine. caffeine content: 48 mg/16.9fl oz | BAD | — | — | Aspartame, Acesulfame Potassium |
| 21-gatorade-lemon-lime | replace | Gatorade · Gatorade thirst quencher | contains no no fruit juice no juice water lemon-lime fruit punch orange | BAD | — | Sugar, Dextrose | — |
| 22-gatorade-zero | ok | Gatorade · Gatorade zero | er case 12 1 bottle (360 ml) serving size rving ies 0g 160mg % daily value* arbohydrate &lt;1g sugars og udes og added sugars ein og amount per serving o calories 0% 1 bottle (360 ml) serving size ssium 50mg 0% a significant source of saturated fat, stat, cholesterol, dietary fiber, amin d, calcium, and iron. 0% total fat og 7% sodium 160mg 0% total carbohydrate &lt;1g 0% total sugars og includes og added sugars 0% protein og amount per serving o calories % daily value* 0% 7% potassium 50mg 0% not a significant source of saturated fat, trans fat, cholesterol, dietary fiber, vitamin d, calcium, and iron. the % daily value (dv) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories & gay is used for general nutrition advice. water, citric acid, sodium citrate, natural flavor, salt, monopotassium phosphate, modified food starch, sucralose, acesulfame potassium, *the % daily value (dv) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice. water, citric acid, sodium citrate, salt, monopotassium phosphate, gum arabic, natural flavor, sucralose, acesulfame glycerol ester of rosin, red 40, blue 1. glycerol ester of rosin, yellow 6. potassium, sucrose acetate isobutyrate, gatorade 1 total fat og sodium 160mg total carbohydrate total sugars og includes og added sug protein og potassium 50mg not a significant source of sat trans fat, cholesterol, dietary fi vitamin d, calcium, and iron. * the % daily value (dv) tells you how muc in a serving of food contributes to a daily d calories a day is used for general nutrition a water, citric acid, sodium citrate monopotassium phosphate, mo food starch, natural flavor, sucra acesulfame potassium, glycerol of rosin, | BAD | — | — | Sucralose, Acesulfame Potassium |
| 23-propel | replace | Gatorade · propel water | cholestero, delay fhe, vianin and ion, of s-vc, inc, total og 0% (vitamin b3), dropel, electrolyte water beverage s no fruit juice water, citric acid, natural flavor sodium hexametaphosphate (to protect flavor), salt, | BAD | — | — | Sucralose, Acesulfame Potassium |
| 24-pedialyte | replace | Pedialyte · Electrolytes | ANHYDROUS DEXTROSE, CITRIC ACID, SHORT-CHAIN FRUCTOOLIGOSACCHARIDES, SALT, POTASSIUM CITRATE, POTASSIUM PHOSPHATE, SODIUM CITRATE, MAGNESIUM CHLORIDE, NATURAL AND ARTIFICIAL FLAVORS, CALCIUM SILICATE, SUCRALOSE, ACESULFAME POTASSIUM, AND RED 40 | BAD | — | Dextrose | Sucralose, Acesulfame Potassium |
| 25-liquid-iv-lemon-lime | ok | Liquid IV | pure cane sugar, dextrose, citric acid, salt, potassium citrate, sodium citrate, dipotassium phosphate, silicon dioxide, stevia leaf extract (rebaudioside a), vitamin c (ascorbic acid), acid), natural b3 flavors, (niacinamide), vitamin b5 (d-calcium pantothenate), vitamin [pyridoxine b6 vitamin hydrochloride), vitamin b12 (cyanocobalamin), | BAD | — | Cane Sugar, Dextrose | Stevia Leaf Extract |
| 26-monster-original | ok | MonsterMonster Energy · Monster Energy | carbonated water, sugar, glucose, citric acid, natural flavors, taurine, sodium citrate, color added, panax ginseng extract, l-carnitine l-tartrate, caffeine, sorbic acid (preservative), benzoic acid (preservative), niacinamide (vit, b3), sucralose, salt, d-glucuronolactone, inositol, guarana extract, pyridoxine hydrochloride (vit, b6), riboflavin (vit, b2), maltodextrin, cyanocobalamin (vit, b12), | BAD | — | Sugar, Glucose | — |
| 27-red-bull | replace | Red Bull · Red bull | carbonated water, sucrose, glucose, citric acid, taurine, sodium bicarbonate, magnesium carbonate, caffeine, niacinamide, calcium pantothenate, pyridoxine hcl, vitamin b12, natural and artificial flavors, colors, | BAD | — | Sucrose, Glucose | — |
| 28-vitaminwater | replace | VitaminWater · Zero xxx | Reverse osmosis water, less than 0.5% of: vitamins A. C. B3, B5, B6, B12 (beta-carotene, ascorbic acid, niacinamide, calcium pantothenate. pyridoxine hydrochloride. cyanocobalamin), fruit and vegetable juices (for color), natural flavors, citric acid, stevia leaf extract, electrolytes (calcium and magnesium lactates and potassium phosphate), monk fruit extract. sodium selenate, manganese citrate. | BAD | — | Crystalline Fructose, Cane Sugar | — |
| 29-vitaminwater-zero | ok | Glaceau · Vitamin water, vitaminwater zero squeezed, lemonade, lemonade | Reverse osmosis water, less than 1% of: erythritol, citric acid, calcium phosphate, magnesium lactate and calcium lactate and potassium phosphate (electrolyte source), gum acacia, phosphoric acid, vitamin c (ascorbic acid), stevia leaf extract, natural flavors, zinc gluconate, glycerol ester of rosin, vitamin b5 (calcium pantothenate), vitamin e (alpha-tocopheryl acetate), vitamin b6 (pyridoxine hydrochloride), vitamin a palmitate. | BAD | — | — | Erythritol, Stevia Leaf Extract |
| 30-starbucks-frappuccino | ok | Starbucks · Mocha Frappuccino | BREWED * COFFEE (WATER, COFFEE), REDUCED FAT MILK, SUGAR, COCOA, PECTIN, *: STARBUCKS. | BAD | Milk | Sugar | — |
| 31-snapple-peach-tea | ok | Snapple · Diet snapple peach tea | Filtered Water, Citric Acid, Tea, Aspartame, Potassium Citrate, Natural Flavors, Malic Acid | BAD | — | — | Aspartame |
| 32-simply-lemonade | replace | Simply Lemonade · Simply Lemonade | — | BAD | Lemon Juice | Cane Sugar | — |
| 33-white-claw | ok | White claw, Libman, High Noon · White Claw Hard Seltzer, Black Cherry | purified carbonated water, alcohol, natural flavors, cane sugar, citric acid, natural cherry juice concentrate, sodium citrate, | BAD | — | — | — |
| 34-michelob-ultra | ok | Michelob ultra | 4,2 % ALC./VOL - BREWED AND ANHEUSER-BUSCH. SI LOUIS MO | BAD | — | — | — |
| 35-honey-nut-cheerios | ok | Cheerios · Honey Nut Cheerios | Whole Grain Oats, Sugar, Corn Starch, Honey, Brown Sugar Syrup, Salt, Tripotassium Phosphate, Canola and/or Sunflower Oil, Natural Almond Flavor, Vitamin E (mixed tocopherols).  Vitamins and Minerals: Calcium Carbonate, Vitamin C (sodium ascorbate), Iron and Zinc (mineral nutrients), A B Vitamin (niacinamide), Vitamin B6 (pyridoxine hydrochloride), Vitamin B₁ (thiamin mononitrate), Vitamin A (palmitate) Vitamin B₂ (riboflavin), A B Vitamin (folic acid), Vitamin B12, Vitamin D3. | BAD | — | Sugar, Honey, Brown Sugar Syrup | — |
| 36-frosted-flakes | replace | Kellogg's · Kelloggs Frosted Flakes | — | BAD | — | Sugar | — |
| 37-nature-valley-oats-honey | ok | Nature Valley · Nature Valley Crunchy Oats 'N Honey Granola Bar | Whole Grain Oats, Sugar, Canola Oil, Rice Flour, Honey, Salt, Brown Sugar Syrup, Baking Soda, Soy Lecithin, Natural Flavor. CONTAINS SOY; MAY CONTAIN PEANUT, ALMOND AND PECAN INGREDIENTS | BAD | — | Sugar, Honey, Brown Sugar Syrup | — |
| 38-kind-dark-choc-nuts | ok | Kind · kind thins dark chocolate nuts and sea salt | almonds, tapioca syrup, sugar, palm kemel oil, chicory root fiber, rice flour, honey, canola oil, alkalīzed cocoa, unsweetened chocolate, sea salt, naturál flavor, soy lecithin, cocoa butter, vitamin e (tocopherols to maintain freshness). 29670-00-wo allergen information: contains almonds and soy. may contain tree nuts. | BAD | — | Tapioca Syrup, Sugar, Honey | — |
| 39-clif-chocolate-chip | ok | Clif Bar - Chocolate chip | organic brown rice syrup, organic rolled oats, soy protein isolate, organic cane syrup, organic roasted soybeans, rice flour, cane sugar, unsweetened chocolate, organic soy flour, organic oat fiber, organic high oleic sunflower oil, cocoa butter, barley malt extract, sea salt, natural flavors, soy lecithin, organic cinnamon, vitamins , minerals: dicalcium phosphate, magnesium oxide, ascorbic acid (vit, c), dl-alpha tocopheryl acetate (vit, e) , beta carotene (vit, a), niacinamide (vit, b3), ergocalciferol (vit, d2), thiamine mononitrate (vit, b1), pyridoxine hydrochloride (vit, b6), riboflavin (vit, b2), cyanocobalamin (vit, b12), allergen statement: contains soy, may contain peanuts, tree nuts, milk, and wheat, itm | BAD | — | Brown Rice Syrup, Cane Syrup, Cane Sugar | — |
| 40-quest-bar | ok | Kirkland · Protein Bar, Chocolate Chip Cookie Dough | protein blend (milk protein isolate, whey protein isolate), soluble corn fiber, cashew butter, isomalto-oligosaccharides (vegetable source), unsweetened chocolate, erythritol, water, cocoa butter, natural flavors, sea salt, sunflower lecithin, steviol glycosides (stevia). | BAD | — | Isomalto-Oligosaccharides | Erythritol, Steviol Glycosides |
| 41-halo-top-vanilla | replace | Halo Top · Cookie & Cream Light Ice Cream | Skim milk, eggs, erythritol, prebiotic fiber, milk protein concentrate, cream, organic cane sugar, cookie crumbs (wheat flour, sugar, cocoa, honey, unsweetened chocolate, salt, whey), vegetable glycerin, sea salt, natural flavors, organic carob gum, organic guar gum, organic stevia leaf extract. | BAD | Milk | Cane Sugar | Erythritol, Stevia Leaf Extract |
| 42-lilys-dark-chocolate | replace | Pobeda · Bitterschokolade ohne Zuckerzusatz &quot;72% Kakao&quot; &quot;Charged&quot; | cocoa mass, sweetener (maltitol), cocoa powder, prebiotic (inulin 10%), cocoa butter, emulsifier (soya lecithin), natural sweetener (stevia 0.03%), natural vanilla. | BAD | — | — | Maltitol |
| 43-oreo | replace | Oreo,  Nabisco · Oreo (Chocolate Sandwich Cookies) | unbleached enriched flour (wheat flour, niacin, reduced iron, thiamine mononitrate {vitamin b1}, riboflavin {vitamin b2}, folic acid), sugar, palm and/or canola oil, cocoa (processed with alkali), high fructose corn syrup, leavening (baking soda and/or calcium phosphate), salt, soy lecithin, chocolate, artificial flavor, | BAD | — | Sugar, High Fructose Corn Syrup | — |
| 44-nutella | ok | Ferrero, Nutella · Nutella, hazelnut spread with cocoa, hazelnut | Sugar, palm oil, hazelnuts, cocoa, skim milk, whey (milk), lecithin as emulsifier (soy), vanillin: an artificial flavor. | BAD | Skim Milk | Sugar | — |
| 45-heinz-ketchup | ok | Heinz · Tomato Ketchup | tomatoes (148 g per 100 tomato ketchup), vinegar, sugar, salt, spice and spice extracts (contain celery), spice, | BAD | Tomatoes | Sugar | — |
| 46-syrup-corn-syrup | ok | Pearl Milling Company | high fructose corn syrup, water, cellulose gum, salt, natural and artificial flavor, caramel color, sorbic acid and sodium benzoate (preservatives) sodium hexametaphosphate (568-l03-14) | BAD | — | High Fructose Corn Syrup | — |
| 47-daves-killer-bread | ok | killer daves wheat bread | organic whole wheat flour, water, organic cracked whole wheat, organic cane sugar, organic wheat gluten, organic expeller pressed canola oil, contains 2% or less of each of the following: organic molasses, sea salt, yeast, organic cultured wheat flour, organic vinegar, organic acerola powder, enzymes, 526-050919 ted by, organ distri deb-al barer | BAD | — | Organic Cane Sugar, Organic Molasses | — |
| 48-ritz-crackers | ok | Mondelez · ritz crackers original | unbleached enriched flour (wheat flour, niacin, reduced iron, thiamine mononitrate (vitamin b1), riboflavin (vitamin b2), folic acid), soybean and/or canola oil, palm oil, sugar, salt, leavening (calcium phosphate, baking soda), high fructose corn syrup, soy lecithin, natural flavor. contains: wheat, soy. mondelez global llc east hanover, nj 07936 usa contains a bioengineered food ingredient made in mexico | BAD | — | Sugar, High Fructose Corn Syrup | — |
| 49-chobani-vanilla | replace | chobani vanilla greek yogurt | — | BAD | Nonfat Milk | Cane Sugar | — |
| 50-coffee-mate-original | replace | Nestlé · Coffee mate the original powder coffee creamer | — | BAD | — | Corn Syrup Solids | — |
| 51-athletic-brewing-na | ok | Athletic Brewing Co, Athletic Brewing Company · Upside Dawn | Water, Malted Barley, Oats, Hops, Wheat, Yeast | DECIDE | — | — | — |
| 52-gts-kombucha | ok | GT's · synergy raw kombucha | — | DECIDE | — | — | — |
| 53-simply-orange-juice | replace | Carrefour Bio, Carrefour · 100% Pur jus Orange Sans pulpe | 100% pure leak pressed organic orange juice | DECIDE | Orange Juice | — | — |
| 54-blurry-lacroix | ok | Coconut Sparkling Water,  LaCroix · Naturally Essenced Coconut Sparkling Water | — | RETRY | — | — | — |
| 55-glare-coke-can | ok | Coca-Cola,  Coke · Coca-cola Coke - Classic | — | BAD | — | High Fructose Corn Syrup | — |
| 56-curved-gatorade | replace | Gatorade · Gatorade thirst quencher | — | BAD | — | Sugar, Dextrose | — |
| 57-dim-light-cereal | ok | Cheerios · Honey Nut Cheerios | — | BAD | — | Sugar, Honey, Brown Sugar Syrup | — |
| 58-nutrition-panel-only | ok | Malt O'Meal · Frosted Flakes Cereal | Milled corn, sugar, contains 2% or less of: corn syrup, salt, barley malt extract, wheat starch. vitamins and minerals: ferric orthophosphate (source of iron), niacinamide (vitamin b3), zinc oxide (source of zinc), thiamin mononitrate (vitamin b1), calcium pantothenate (vitamin b5), pyridoxine hydrochloride (vitamin b6), folic acid. | RETRY | — | — | — |
| 59-not-food-shoe | missing | — | — | RETRY | — | — | — |
| 60-non-english-label | ok | Au comptoir de Mathilde · Pâte à tartiner | — | DECIDE | — | — | — |
