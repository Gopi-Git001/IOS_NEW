// Added-sugar aliases, copied from the scanner's registry (supabase/functions/_shared/ingredients.ts,
// registry-2026.11.06, branch feature/clean-bad-ugly-jev-sugarcane). Keep in sync when the registry changes.
// Every name here makes a label UGLY under rules v2 (rule U1). Grouped as in the registry.

export type SugarGroup = { name: string; blurb: string; aliases: string[]; note?: string; guide?: string };

export const ADDED_SUGARS: SugarGroup[] = [
  {
    name: 'Sugar (sucrose and cane or beet sugars)',
    blurb: 'Table sugar and its many costumes.',
    guide: 'evaporated-cane-juice',
    aliases: [
      'sugar', 'cane sugar', 'raw cane sugar', 'evaporated cane sugar', 'beet sugar', 'granulated sugar', 'white sugar',
      'brown sugar', 'light brown sugar', 'dark brown sugar', 'raw sugar', 'turbinado sugar', 'turbinado', 'demerara sugar',
      'demerara', 'muscovado sugar', 'muscovado', 'powdered sugar', 'confectioners sugar', "confectioner's sugar", 'icing sugar',
      'caster sugar', 'sucrose', 'cane juice', 'evaporated cane juice', 'dried cane syrup', 'cane syrup', 'cane juice crystals',
      'rapadura', 'panela', 'jaggery', 'sucanat', 'sugar syrup', 'simple syrup', 'liquid sugar', 'invert sugar', 'invert cane sugar',
      'invert syrup', 'invert sugar syrup', 'coconut sugar', 'coconut palm sugar', 'palm sugar', 'date sugar', 'maple sugar',
      'golden syrup', 'treacle', 'molasses', 'blackstrap molasses', 'cane molasses', 'caramel', 'burnt sugar',
    ],
  },
  { name: 'Dextrose (glucose)', blurb: 'Pure glucose, usually made from corn.', aliases: ['dextrose', 'dextrose monohydrate', 'anhydrous dextrose', 'glucose', 'grape sugar'] },
  { name: 'Fructose', blurb: 'Fruit sugar, added on its own.', aliases: ['fructose', 'crystalline fructose', 'fruit sugar'] },
  { name: 'Maltose', blurb: 'Malt sugar.', aliases: ['maltose', 'malt sugar'] },
  { name: 'Trehalose', blurb: 'A sugar made of two glucose units.', aliases: ['trehalose'] },
  { name: 'Galactose', blurb: 'A simple sugar, added on its own.', aliases: ['galactose'] },
  {
    name: 'Lactose (listed on its own)',
    blurb: 'Milk sugar sold as an ingredient.',
    aliases: ['lactose'],
    note: 'Lactose listed as its own ingredient is added sugar. Lactose that comes with milk, yogurt or whey is not.',
  },
  { name: 'Honey', blurb: 'Natural, and still added sugar.', aliases: ['honey', 'raw honey', 'clover honey', 'wildflower honey', 'manuka honey', 'honey powder', 'dried honey'] },
  { name: 'Maple syrup', blurb: 'Tree sap boiled down to sugar.', aliases: ['maple syrup', 'pure maple syrup'] },
  { name: 'Agave syrup', blurb: 'A syrup that is mostly fructose.', aliases: ['agave', 'agave syrup', 'agave nectar', 'blue agave', 'blue agave syrup', 'agave inulin syrup'] },
  { name: 'Corn syrup', blurb: 'Corn starch broken down into a sugary syrup.', aliases: ['corn syrup', 'corn syrup solids', 'glucose syrup', 'glucose syrup solids', 'dried glucose syrup', 'corn sweetener'] },
  {
    name: 'High fructose corn syrup',
    blurb: 'Corn syrup with part of its glucose turned into fructose.',
    aliases: ['high fructose corn syrup', 'hfcs', 'glucose-fructose syrup', 'glucose fructose syrup', 'glucose-fructose', 'fructose syrup', 'fructose-glucose syrup', 'isoglucose'],
  },
  {
    name: 'Grain, root and fruit syrups',
    blurb: 'Starch or fruit turned into syrup.',
    aliases: ['rice syrup', 'brown rice syrup', 'rice malt syrup', 'tapioca syrup', 'oat syrup', 'sorghum syrup', 'carob syrup', 'date syrup', 'fig syrup'],
  },
  { name: 'Malt syrup', blurb: 'Sugar made from sprouted grain.', aliases: ['malt syrup', 'barley malt syrup', 'barley malt extract', 'malt extract', 'malted barley extract', 'barley malt'] },
  {
    name: 'Fruit juice concentrate',
    blurb: 'Fruit juice boiled down to its sugar.',
    guide: 'juice-concentrate',
    aliases: ['fruit juice concentrate', 'juice concentrate', 'concentrated fruit juice', 'concentrated juice', 'fruit juice concentrates'],
    note: 'Also any "[fruit] juice concentrate" or "concentrated [fruit] juice", such as apple juice concentrate. "Juice from concentrate" needs context and is unresolved.',
  },
  { name: 'Tagatose', blurb: 'A rare sugar that FDA still counts as sugar.', aliases: ['tagatose', 'd-tagatose'] },
  { name: 'Isomaltulose', blurb: 'A rare sugar that FDA still counts as sugar.', aliases: ['isomaltulose', 'palatinose'] },
];

export const ADDED_SUGAR_ALIAS_COUNT = ADDED_SUGARS.reduce((n, g) => n + g.aliases.length, 0);
