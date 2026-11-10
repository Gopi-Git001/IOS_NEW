// Ingredient registry: what each sweet-relevant ingredient IS, kept separate from what QuickGOB
// thinks of it. Pure data, no network, no Deno APIs (runs under Node tests too).
//
// Three separate facts per entry:
//   cls       chemical/functional identity (e.g. sucralose is a non-sugar sweetener, not a sugar)
//   labeling  how US labels treat it (FDA "Added Sugars" line), for transparency only
//   treatment QuickGOB policy preference (see policy.ts). This is a product preference, not a
//             medical safety finding.
//
// Matching is exact on a normalized key (see normalize.ts). No substring matching: "sugar" never
// matches "sugar alcohol", and "maltodextrin" never matches "resistant maltodextrin".
//
// Sources:
//   FDA added sugars definition, 21 CFR 101.9(c)(6)(iii): https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label
//   FDA added sugars Q&A (juice concentrates, purees, lactose): https://www.fda.gov/media/117402/download
//   FDA allulose guidance (2020): https://www.fda.gov/media/123342/download
//   FDA, tagatose and isomaltulose are chemically sugars: https://www.federalregister.gov/documents/2020/10/19/2020-22900/sugars-that-are-metabolized-differently-than-traditional-sugars
//   Maltodextrin, 21 CFR 184.1444 (nonsweet saccharide polymer, DE < 20): https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-184/subpart-B/section-184.1444
//   Resistant maltodextrin as dietary fiber (FDA 2018): https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/questions-and-answers-dietary-fiber
//   EU sweetener E-numbers (E420, E421, E950-E969), Regulation (EC) 1333/2008 Annex II.

export const REGISTRY_VERSION = 'registry-2026.11.09';

export type IngredientClass =
  | 'added_sugar' // free mono/disaccharides, syrups, honey, juice concentrates used to sweeten
  | 'non_sugar_sweetener' // high-intensity sweeteners, artificial or plant-derived
  | 'sugar_alcohol' // polyols; NOT drinking alcohol
  | 'rare_sugar' // allulose, tagatose, isomaltulose
  | 'naturally_occurring_sugar' // sugar that comes with a whole food (milk, fruit)
  | 'other_carbohydrate' // starches, maltodextrin, fibers; not sugar
  | 'context_dependent' // depends on form (e.g. puree concentrate)
  | 'drinking_alcohol' // ethanol in beer, wine, spirits
  | 'non_sweet'; // common ingredients with no sweetening role

export type Labeling = 'counted_as_added_sugar' | 'counted_as_total_sugar_only' | 'not_counted_as_sugar' | 'depends';

/** QuickGOB policy treatment under Rules v3. Added sugar is graded by grams in policy.ts. */
export type Treatment = 'added_sugar' | 'bad' | 'okay' | 'clean_ok' | 'needs_context';

export type Entry = {
  id: string;
  name: string;
  cls: IngredientClass;
  /** For non_sugar_sweetener: artificial vs plant-derived. */
  subtype?: 'artificial' | 'plant';
  labeling: Labeling;
  treatment: Treatment;
  /** Normalized aliases (lowercase, single spaces). */
  aliases: string[];
  /** E / INS numbers, normalized like "e955". */
  codes?: string[];
  /** Plain-language note about context or why it is treated this way. */
  note?: string;
};

const added = (id: string, name: string, aliases: string[], note?: string): Entry => ({
  id, name, cls: 'added_sugar', labeling: 'counted_as_added_sugar', treatment: 'added_sugar', aliases, note,
});
const plain = (id: string, name: string, aliases: string[], cls: IngredientClass = 'non_sweet'): Entry => ({
  id, name, cls, labeling: 'not_counted_as_sugar', treatment: 'clean_ok', aliases,
});
const natural = (id: string, name: string, aliases: string[], note?: string): Entry => ({
  id, name, cls: 'naturally_occurring_sugar', labeling: 'counted_as_total_sugar_only', treatment: 'clean_ok', aliases, note,
});

export const REGISTRY: Entry[] = [
  // ---- Added sugars (FDA 21 CFR 101.9(c)(6)(iii)) ----
  added('sugar', 'Sugar', [
    'sugar', 'cane sugar', 'raw cane sugar', 'evaporated cane sugar', 'beet sugar', 'granulated sugar', 'white sugar',
    'brown sugar', 'light brown sugar', 'dark brown sugar', 'raw sugar', 'turbinado sugar', 'turbinado', 'demerara sugar',
    'demerara', 'muscovado sugar', 'muscovado', 'powdered sugar', 'confectioners sugar', "confectioner's sugar", 'icing sugar',
    'caster sugar', 'sucrose', 'cane juice', 'evaporated cane juice', 'dried cane syrup', 'cane syrup', 'cane juice crystals',
    'rapadura', 'panela', 'jaggery', 'sucanat', 'sugar syrup', 'simple syrup', 'liquid sugar', 'invert sugar', 'invert cane sugar',
    'invert syrup', 'invert sugar syrup', 'coconut sugar', 'coconut palm sugar', 'palm sugar', 'date sugar', 'maple sugar',
    'golden syrup', 'treacle', 'molasses', 'blackstrap molasses', 'cane molasses', 'caramel', 'burnt sugar',
  ]),
  added('dextrose', 'Dextrose', ['dextrose', 'dextrose monohydrate', 'anhydrous dextrose', 'glucose', 'grape sugar']),
  added('fructose', 'Fructose', ['fructose', 'crystalline fructose', 'fruit sugar']),
  added('maltose', 'Maltose', ['maltose', 'malt sugar']),
  added('trehalose', 'Trehalose', ['trehalose']),
  added('galactose', 'Galactose', ['galactose']),
  added('lactose_added', 'Lactose (added)', ['lactose'],
    'Lactose listed as its own ingredient is added sugar (FDA). Lactose that comes with milk is not.'),
  added('honey', 'Honey', ['honey', 'raw honey', 'clover honey', 'wildflower honey', 'manuka honey', 'honey powder', 'dried honey']),
  added('maple_syrup', 'Maple syrup', ['maple syrup', 'pure maple syrup']),
  added('agave', 'Agave syrup', ['agave', 'agave syrup', 'agave nectar', 'blue agave', 'blue agave syrup', 'agave inulin syrup']),
  added('corn_syrup', 'Corn syrup', ['corn syrup', 'corn syrup solids', 'glucose syrup', 'glucose syrup solids', 'dried glucose syrup', 'corn sweetener']),
  added('hfcs', 'High fructose corn syrup', ['high fructose corn syrup', 'hfcs', 'glucose-fructose syrup', 'glucose fructose syrup', 'glucose-fructose', 'fructose syrup', 'fructose-glucose syrup', 'isoglucose']),
  added('rice_syrup', 'Rice syrup', ['rice syrup', 'brown rice syrup', 'rice malt syrup', 'tapioca syrup', 'oat syrup', 'sorghum syrup', 'carob syrup', 'date syrup', 'fig syrup']),
  added('malt_syrup', 'Malt syrup', ['malt syrup', 'barley malt syrup', 'barley malt extract', 'malt extract', 'malted barley extract', 'barley malt']),
  added('juice_concentrate', 'Fruit juice concentrate', [
    'fruit juice concentrate', 'juice concentrate', 'concentrated fruit juice', 'concentrated juice', 'fruit juice concentrates',
  ], 'FDA counts juice concentrate used to sweeten as added sugar. Exception: 100% juice products.'),
  // Rare sugars that FDA labels as sugar (chemically sugars).
  { id: 'tagatose', name: 'Tagatose', cls: 'rare_sugar', labeling: 'counted_as_added_sugar', treatment: 'added_sugar', aliases: ['tagatose', 'd-tagatose'],
    note: 'A rare sugar that FDA still counts as added sugar.' },
  { id: 'isomaltulose', name: 'Isomaltulose', cls: 'rare_sugar', labeling: 'counted_as_added_sugar', treatment: 'added_sugar', aliases: ['isomaltulose', 'palatinose'],
    note: 'A rare sugar that FDA still counts as added sugar.' },

  // ---- Rare sugar not counted as sugar on US labels ----
  { id: 'allulose', name: 'Allulose', cls: 'rare_sugar', labeling: 'not_counted_as_sugar', treatment: 'okay',
    aliases: ['allulose', 'd-allulose', 'psicose', 'd-psicose'],
    note: 'Chemically a sugar, but FDA lets labels leave it out of Total and Added Sugars.' },

  // ---- Non-sugar sweeteners, artificial (BAD under Rules v3) ----
  { id: 'sucralose', name: 'Sucralose', cls: 'non_sugar_sweetener', subtype: 'artificial', labeling: 'not_counted_as_sugar', treatment: 'bad', aliases: ['sucralose', 'splenda'], codes: ['e955'] },
  { id: 'aspartame', name: 'Aspartame', cls: 'non_sugar_sweetener', subtype: 'artificial', labeling: 'not_counted_as_sugar', treatment: 'bad', aliases: ['aspartame'], codes: ['e951'] },
  { id: 'acesulfame_k', name: 'Acesulfame K', cls: 'non_sugar_sweetener', subtype: 'artificial', labeling: 'not_counted_as_sugar', treatment: 'bad',
    aliases: ['acesulfame k', 'acesulfame-k', 'acesulfame potassium', 'acesulfame', 'ace-k', 'ace k'], codes: ['e950'] },
  { id: 'saccharin', name: 'Saccharin', cls: 'non_sugar_sweetener', subtype: 'artificial', labeling: 'not_counted_as_sugar', treatment: 'bad',
    aliases: ['saccharin', 'sodium saccharin', 'calcium saccharin'], codes: ['e954'] },
  { id: 'cyclamate', name: 'Cyclamate', cls: 'non_sugar_sweetener', subtype: 'artificial', labeling: 'not_counted_as_sugar', treatment: 'bad',
    aliases: ['cyclamate', 'sodium cyclamate', 'calcium cyclamate'], codes: ['e952'] },
  { id: 'neotame', name: 'Neotame', cls: 'non_sugar_sweetener', subtype: 'artificial', labeling: 'not_counted_as_sugar', treatment: 'bad', aliases: ['neotame'], codes: ['e961'] },
  { id: 'advantame', name: 'Advantame', cls: 'non_sugar_sweetener', subtype: 'artificial', labeling: 'not_counted_as_sugar', treatment: 'bad', aliases: ['advantame'], codes: ['e969'] },
  { id: 'aspartame_acesulfame', name: 'Aspartame-acesulfame salt', cls: 'non_sugar_sweetener', subtype: 'artificial', labeling: 'not_counted_as_sugar', treatment: 'bad',
    aliases: ['aspartame-acesulfame salt', 'aspartame acesulfame salt'], codes: ['e962'] },
  { id: 'nhdc', name: 'Neohesperidin DC', cls: 'non_sugar_sweetener', subtype: 'artificial', labeling: 'not_counted_as_sugar', treatment: 'bad',
    aliases: ['neohesperidin dc', 'neohesperidine dc', 'neohesperidin dihydrochalcone', 'nhdc'], codes: ['e959'],
    note: 'Chemically modified from citrus; grouped with artificial sweeteners (assumption, see open items).' },

  // ---- Non-sugar sweeteners, plant-derived (OKAY under Rules v3) ----
  { id: 'stevia', name: 'Stevia', cls: 'non_sugar_sweetener', subtype: 'plant', labeling: 'not_counted_as_sugar', treatment: 'okay',
    aliases: [
      'stevia', 'stevia extract', 'stevia leaf extract', 'purified stevia leaf extract', 'stevia leaf', 'stevia rebaudiana',
      'stevia rebaudiana leaf extract', 'steviol glycosides', 'steviol glycoside', 'steviol glycosides from stevia',
      'rebaudioside a', 'reb a', 'rebaudioside m', 'reb m', 'rebaudioside d', 'reb d', 'rebiana', 'enzyme modified stevia',
      'glucosylated steviol glycosides',
    ],
    codes: ['e960', 'e960a', 'e960b', 'e960c', 'e960d'] },
  { id: 'monk_fruit', name: 'Monk fruit', cls: 'non_sugar_sweetener', subtype: 'plant', labeling: 'not_counted_as_sugar', treatment: 'okay',
    aliases: [
      'monk fruit', 'monk fruit extract', 'monkfruit', 'monkfruit extract', 'monk fruit sweetener', 'luo han guo', 'luo han guo extract',
      'luo han guo fruit extract', 'lo han guo', 'siraitia grosvenorii', 'siraitia grosvenorii fruit extract', 'mogroside', 'mogrosides',
      'mogroside v', 'swingle fruit extract',
    ] },
  { id: 'thaumatin', name: 'Thaumatin', cls: 'non_sugar_sweetener', subtype: 'plant', labeling: 'not_counted_as_sugar', treatment: 'okay', aliases: ['thaumatin'], codes: ['e957'] },

  // ---- Sugar alcohols (polyols). Not drinking alcohol. ----
  { id: 'erythritol', name: 'Erythritol', cls: 'sugar_alcohol', labeling: 'not_counted_as_sugar', treatment: 'okay', aliases: ['erythritol', 'non-gmo erythritol'], codes: ['e968'] },
  { id: 'xylitol', name: 'Xylitol', cls: 'sugar_alcohol', labeling: 'not_counted_as_sugar', treatment: 'okay', aliases: ['xylitol', 'birch xylitol'], codes: ['e967'] },
  { id: 'sorbitol', name: 'Sorbitol', cls: 'sugar_alcohol', labeling: 'not_counted_as_sugar', treatment: 'okay', aliases: ['sorbitol', 'sorbitol syrup', 'sorbitol solution'], codes: ['e420'] },
  { id: 'mannitol', name: 'Mannitol', cls: 'sugar_alcohol', labeling: 'not_counted_as_sugar', treatment: 'okay', aliases: ['mannitol'], codes: ['e421'] },
  { id: 'isomalt', name: 'Isomalt', cls: 'sugar_alcohol', labeling: 'not_counted_as_sugar', treatment: 'okay', aliases: ['isomalt'], codes: ['e953'] },
  { id: 'maltitol', name: 'Maltitol', cls: 'sugar_alcohol', labeling: 'not_counted_as_sugar', treatment: 'okay', aliases: ['maltitol', 'maltitol syrup'], codes: ['e965'] },
  { id: 'lactitol', name: 'Lactitol', cls: 'sugar_alcohol', labeling: 'not_counted_as_sugar', treatment: 'okay', aliases: ['lactitol'], codes: ['e966'] },
  { id: 'polyglycitol', name: 'Polyglycitol syrup', cls: 'sugar_alcohol', labeling: 'not_counted_as_sugar', treatment: 'okay',
    aliases: ['polyglycitol', 'polyglycitol syrup', 'hydrogenated starch hydrolysate', 'hydrogenated starch hydrolysates'], codes: ['e964'] },

  // ---- Other carbohydrates and fillers: not sugar ----
  { id: 'maltodextrin', name: 'Maltodextrin', cls: 'other_carbohydrate', labeling: 'not_counted_as_sugar', treatment: 'clean_ok',
    aliases: ['maltodextrin', 'corn maltodextrin', 'tapioca maltodextrin', 'rice maltodextrin', 'potato maltodextrin', 'dextrin'],
    note: 'A starch polymer, not a sugar (FDA: nonsweet, DE under 20). Listed for transparency.' },
  { id: 'resistant_maltodextrin', name: 'Resistant maltodextrin', cls: 'other_carbohydrate', labeling: 'not_counted_as_sugar', treatment: 'clean_ok',
    aliases: ['resistant maltodextrin', 'resistant dextrin', 'soluble corn fiber', 'soluble wheat fiber', 'wheat dextrin', 'resistant wheat dextrin'],
    note: 'A fiber (FDA 2018), different from ordinary maltodextrin.' },
  plain('fiber_other', 'Added fiber', [
    'polydextrose', 'inulin', 'chicory root fiber', 'chicory root inulin', 'chicory root extract', 'oligofructose',
    'fructooligosaccharides', 'fos', 'galactooligosaccharides', 'gos', 'acacia fiber', 'oat fiber', 'psyllium husk', 'citrus fiber',
    'isomaltooligosaccharide', 'isomaltooligosaccharides', 'imo', 'soluble tapioca fiber',
  ], 'other_carbohydrate'),
  plain('starch', 'Starch', [
    'corn starch', 'cornstarch', 'tapioca starch', 'potato starch', 'rice starch', 'wheat starch', 'modified food starch',
    'modified corn starch', 'modified tapioca starch', 'tapioca', 'arrowroot', 'pea starch',
  ], 'other_carbohydrate'),

  // ---- Naturally occurring sugar (whole foods) ----
  natural('milk', 'Milk', [
    'milk', 'whole milk', 'skim milk', 'nonfat milk', 'low fat milk', 'lowfat milk', 'reduced fat milk', 'fat free milk',
    'cultured milk', 'cultured pasteurized milk', 'cultured pasteurized grade a milk', 'pasteurized milk', 'grade a milk',
    'milk powder', 'whole milk powder', 'skim milk powder', 'nonfat dry milk', 'dry milk', 'condensed skim milk', 'ultra-filtered milk',
    'ultrafiltered milk', 'yogurt', 'plain yogurt', 'whey', 'sweet whey', 'whey powder', 'buttermilk', 'kefir', 'goat milk',
  ], 'Lactose that comes with milk is naturally occurring, not added.'),
  natural('fruit', 'Fruit', [
    'apple', 'apples', 'banana', 'bananas', 'strawberries', 'strawberry', 'blueberries', 'blueberry', 'raspberries', 'raspberry',
    'blackberries', 'cherries', 'cherry', 'mango', 'pineapple', 'peach', 'peaches', 'pear', 'pears', 'grapes', 'orange', 'oranges',
    'lemon', 'lime', 'cranberries', 'pomegranate', 'kiwi', 'coconut', 'raisins', 'dates', 'date', 'medjool dates', 'figs', 'dried figs',
    'prunes', 'apricots', 'dried apricots', 'dried cranberries', 'dried fruit', 'fruit', 'mixed fruit', 'currants', 'goji berries',
  ], 'Whole and dried fruit carry their own sugar. Dried fruit with added sugar lists the sugar separately.'),
  natural('fruit_puree', 'Fruit puree', [
    'fruit puree', 'apple puree', 'banana puree', 'mango puree', 'pear puree', 'strawberry puree', 'peach puree', 'pumpkin puree',
    'applesauce', 'unsweetened applesauce', 'date paste', 'fig paste', 'fruit paste', 'fruit powder',
  ], 'FDA does not count single-strength fruit puree or paste as added sugar.'),
  natural('vegetable', 'Vegetables', [
    'carrots', 'carrot', 'tomatoes', 'tomato', 'tomato paste', 'tomato puree', 'sweet potato', 'sweet potatoes', 'beets', 'pumpkin',
    'onion', 'onions', 'garlic', 'celery', 'spinach', 'peppers', 'red peppers', 'corn', 'peas',
  ]),
  { id: 'puree_concentrate', name: 'Fruit puree concentrate', cls: 'context_dependent', labeling: 'depends', treatment: 'needs_context',
    aliases: ['fruit puree concentrate', 'puree concentrate', 'apple puree concentrate', 'strawberry puree concentrate', 'pear puree concentrate', 'banana puree concentrate'],
    note: 'Counts as added sugar when it sweetens another food; in a product made only of fruit it does not (policy.ts decides from the rest of the list).' },

  // ---- Drinking alcohol above 0.5% ABV (Rules v3: BAD) ----
  { id: 'drinking_alcohol', name: 'Alcohol', cls: 'drinking_alcohol', labeling: 'not_counted_as_sugar', treatment: 'bad',
    aliases: ['alcohol', 'ethanol', 'ethyl alcohol', 'beer', 'wine', 'red wine', 'white wine', 'rum', 'vodka', 'whiskey', 'whisky', 'bourbon',
      'brandy', 'gin', 'tequila', 'sake', 'liqueur', 'malt beverage', 'cider', 'hard cider'] },

  // ---- Common non-sweet ingredients (so ordinary labels can resolve to CLEAN) ----
  plain('water', 'Water', ['water', 'filtered water', 'purified water', 'carbonated water', 'sparkling water', 'spring water', 'mineral water', 'coconut water']),
  plain('salt', 'Salt', ['salt', 'sea salt', 'kosher salt', 'himalayan pink salt', 'pink salt', 'iodized salt']),
  plain('acids', 'Food acids', ['citric acid', 'malic acid', 'lactic acid', 'tartaric acid', 'phosphoric acid', 'fumaric acid', 'ascorbic acid', 'acetic acid', 'vinegar', 'apple cider vinegar', 'distilled vinegar', 'white vinegar', 'wine vinegar', 'red wine vinegar', 'rice vinegar', 'balsamic vinegar']),
  plain('flavors', 'Flavors', ['natural flavor', 'natural flavors', 'natural flavour', 'natural flavours', 'artificial flavor', 'artificial flavors', 'flavor', 'flavors', 'flavoring', 'natural flavoring', 'natural and artificial flavors', 'natural and artificial flavor', 'vanilla extract', 'vanilla', 'vanilla bean', 'cinnamon', 'spices', 'spice', 'herbs', 'cocoa', 'cocoa powder', 'cocoa butter', 'cacao', 'unsweetened chocolate', 'chocolate liquor', 'coffee', 'tea', 'green tea', 'black tea', 'caffeine']),
  plain('gums', 'Thickeners and emulsifiers', ['xanthan gum', 'guar gum', 'gellan gum', 'gum arabic', 'acacia gum', 'locust bean gum', 'carrageenan', 'pectin', 'agar', 'gelatin', 'cellulose', 'cellulose gum', 'microcrystalline cellulose', 'methylcellulose', 'lecithin', 'soy lecithin', 'sunflower lecithin', 'mono and diglycerides', 'mono- and diglycerides']),
  plain('preservatives', 'Preservatives', ['potassium sorbate', 'potassium benzoate', 'sodium phosphate', 'disodium phosphate', 'calcium chloride', 'calcium lactate', 'd-alpha-tocopherol', 'calcium disodium edta', 'edta', 'sodium benzoate', 'calcium propionate', 'sorbic acid', 'rosemary extract', 'tocopherols', 'mixed tocopherols', 'vitamin e', 'nisin']),
  plain('minerals_vitamins', 'Vitamins and minerals', ['calcium carbonate', 'tricalcium phosphate', 'calcium phosphate', 'dipotassium phosphate', 'potassium citrate', 'sodium citrate', 'magnesium citrate', 'sodium bicarbonate', 'baking soda', 'baking powder', 'potassium chloride', 'magnesium oxide', 'zinc oxide', 'reduced iron', 'iron', 'ferrous sulfate', 'niacin', 'niacinamide', 'thiamine', 'thiamine mononitrate', 'riboflavin', 'folic acid', 'vitamin a', 'vitamin a palmitate', 'vitamin c', 'vitamin d', 'vitamin d2', 'vitamin d3', 'vitamin b6', 'vitamin b12', 'pyridoxine hydrochloride', 'cyanocobalamin', 'biotin', 'zinc', 'calcium', 'potassium', 'magnesium', 'sodium']),
  plain('colors', 'Colors', ['caramel color', 'annatto', 'turmeric', 'paprika', 'paprika extract', 'beta carotene', 'beet juice color', 'vegetable juice color', 'fruit and vegetable juice color', 'spirulina extract', 'titanium dioxide', 'red 40', 'yellow 5', 'yellow 6', 'blue 1']),
  plain('fats', 'Fats and oils', ['olive oil', 'extra virgin olive oil', 'canola oil', 'sunflower oil', 'high oleic sunflower oil', 'safflower oil', 'palm oil', 'palm kernel oil', 'coconut oil', 'vegetable oil', 'soybean oil', 'avocado oil', 'butter', 'cream', 'heavy cream', 'ghee', 'shortening']),
  plain('proteins', 'Proteins', ['egg', 'eggs', 'egg whites', 'egg yolks', 'whey protein isolate', 'whey protein concentrate', 'milk protein concentrate', 'milk protein isolate', 'casein', 'sodium caseinate', 'soy protein isolate', 'pea protein', 'pea protein isolate', 'rice protein', 'collagen', 'cheese', 'cheddar cheese', 'cultures', 'live and active cultures', 'live cultures', 'enzymes', 'rennet', 'yeast', 'nutritional yeast']),
  plain('grains_nuts', 'Grains, nuts and seeds', ['oats', 'rolled oats', 'whole grain oats', 'oat flour', 'wheat flour', 'enriched flour', 'enriched wheat flour', 'whole wheat flour', 'whole grain wheat', 'bleached flour', 'unbleached flour', 'rice', 'brown rice', 'rice flour', 'brown rice flour', 'corn flour', 'cornmeal', 'quinoa', 'barley', 'rye', 'almonds', 'almond butter', 'almond flour', 'peanuts', 'peanut butter', 'cashews', 'walnuts', 'pecans', 'hazelnuts', 'pistachios', 'sunflower seeds', 'pumpkin seeds', 'chia seeds', 'flax seeds', 'flaxseed', 'sesame seeds', 'hemp seeds', 'soybeans', 'chickpeas', 'black beans', 'lentils']),
];

// ---- Lookup tables (built once) ----
const byAlias = new Map<string, Entry>();
const byCode = new Map<string, Entry>();
for (const e of REGISTRY) {
  for (const a of e.aliases) {
    if (byAlias.has(a)) throw new Error(`Registry alias "${a}" is in both ${byAlias.get(a)!.id} and ${e.id}`);
    byAlias.set(a, e);
  }
  for (const c of e.codes ?? []) {
    if (byCode.has(c)) throw new Error(`Registry code "${c}" is in both ${byCode.get(c)!.id} and ${e.id}`);
    byCode.set(c, e);
  }
}

export const lookupAlias = (key: string): Entry | undefined => byAlias.get(key);
export const lookupCode = (code: string): Entry | undefined => byCode.get(code);
export const getEntry = (id: string): Entry | undefined => REGISTRY.find((e) => e.id === id);

/** EU sweetener range: E420, E421 and E950-E969. Any other E-number is an additive that is not a sweetener. */
export const isSweetenerCode = (code: string) => {
  const n = Number(code.replace(/^e/, '').replace(/[a-z]$/, ''));
  return n === 420 || n === 421 || (n >= 950 && n <= 969);
};

// Juice wording is a small, anchored grammar rather than an alias list, so "apple juice concentrate"
// and "concentrated white grape juice" resolve without substring matching.
export const JUICE_CONCENTRATE = /^(?:concentrated (?:[a-z]+ ){0,3}juice|(?:[a-z]+ ){0,3}juice concentrates?|(?:[a-z]+ ){0,3}juice from concentrate)$/;
export const SINGLE_STRENGTH_JUICE = /^(?:[a-z]+ ){0,3}juice$/;
export const NOT_FROM_CONCENTRATE = /^(?:[a-z]+ ){0,3}juice not from concentrate$/;

export const juiceEntries: Record<'concentrate' | 'reconstituted' | 'single', Entry> = {
  concentrate: getEntry('juice_concentrate')!,
  reconstituted: {
    id: 'juice_from_concentrate', name: 'Juice from concentrate', cls: 'context_dependent', labeling: 'depends', treatment: 'needs_context', aliases: [],
    note: 'Reconstituted to normal strength it is not added sugar; used to sweeten another food it is (policy.ts decides from the rest of the list).',
  },
  single: {
    id: 'single_strength_juice', name: 'Fruit or vegetable juice', cls: 'naturally_occurring_sugar', labeling: 'counted_as_total_sugar_only', treatment: 'clean_ok', aliases: [],
    note: 'FDA does not count single-strength juice as added sugar.',
  },
};

/** Words in an unknown ingredient that suggest it might sweeten. Used only to decide "unresolved", never to classify. */
export const SWEET_SIGNAL = /(sugar|syrup|sweet|honey|nectar|ose\b|itol\b|malt|molasses|treacle|juice|stevi|monk|dextrin|glycoside|caramel|concentrate|agave|mogros)/;
