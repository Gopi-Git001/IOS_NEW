// "Catch Me If You Can": what each ingredient on a label really is, in one line.
// Pure data + lookup, no React Native imports, so it runs under Node tests.

export type Kind = 'added' | 'natural' | 'sweetener';

export type GlossaryEntry = {
  /** Big line on the card, e.g. "That's sugar." */
  reveal: string;
  /** One plain sentence. */
  blurb: string;
  /** How it affects the verdict. */
  effect: string;
};

type Def = { keys: string[] } & Partial<GlossaryEntry>;

const SUGAR = "That's sugar.";
const ANY_ADDED = 'Any added sugar makes it UGLY.';

const ADDED: Def[] = [
  { keys: ['evaporated cane juice', 'cane juice', 'dried cane syrup'], blurb: 'A label-friendly name for cane sugar.' },
  { keys: ['high fructose corn syrup', 'hfcs', 'glucose-fructose'], blurb: 'A cheap corn syrup, about half fructose.' },
  { keys: ['corn syrup', 'glucose syrup', 'tapioca syrup', 'rice syrup', 'brown rice syrup', 'oat syrup'], blurb: 'Starch broken down into a sugary syrup.' },
  { keys: ['fruit juice concentrate', 'juice concentrate', 'concentrated juice'], blurb: 'Fruit juice boiled down to its sugar. Counts as added sugar.' },
  { keys: ['honey'], blurb: 'Natural, but still added sugar.' },
  { keys: ['agave'], blurb: 'A syrup that is mostly fructose.' },
  { keys: ['maple'], blurb: 'Tree sap boiled down to sugar.' },
  { keys: ['molasses', 'treacle'], blurb: 'The syrup left over from making sugar.' },
  { keys: ['barley malt', 'malt syrup', 'malt extract', 'maltose'], blurb: 'Sugar made from sprouted grain.' },
  { keys: ['dextrose'], blurb: 'Pure glucose, usually made from corn.' },
  { keys: ['coconut sugar', 'date sugar', 'palm sugar'], blurb: 'Sounds healthier. Still sugar.' },
  { keys: ['brown sugar', 'raw sugar', 'turbinado', 'demerara', 'muscovado', 'cane sugar', 'beet sugar', 'invert sugar', 'powdered sugar', 'icing sugar'], blurb: 'Sugar by a slightly different name.' },
  { keys: ['caramel'], blurb: 'Cooked sugar.' },
  { keys: ['sucrose'], blurb: 'The chemical name for table sugar.' },
  { keys: ['glucose'], blurb: 'The simplest sugar, added for sweetness.' },
  { keys: ['fructose'], blurb: 'Fruit sugar, added on its own.' },
  { keys: ['sugar', 'syrup'], blurb: 'Plain and simple.' },
];

const SWEETENERS: Def[] = [
  { keys: ['sucralose', 'e955'], reveal: "That's an artificial sweetener.", blurb: 'Sold as Splenda. About 600 times sweeter than sugar.', effect: 'Makes it UGLY.' },
  { keys: ['aspartame', 'e951'], reveal: "That's an artificial sweetener.", blurb: 'Sold as NutraSweet and Equal.', effect: 'Makes it UGLY.' },
  { keys: ['acesulfame', 'ace-k', 'e950'], reveal: "That's an artificial sweetener.", blurb: 'Often paired with sucralose in diet drinks.', effect: 'Makes it UGLY.' },
  { keys: ['saccharin', 'e954'], reveal: "That's an artificial sweetener.", blurb: "Sold as Sweet'N Low. The oldest one.", effect: 'Makes it UGLY.' },
  { keys: ['neotame', 'advantame', 'cyclamate', 'e961', 'e969', 'e952'], reveal: "That's an artificial sweetener.", blurb: 'A high-intensity lab-made sweetener.', effect: 'Makes it UGLY.' },
  { keys: ['erythritol', 'e968'], reveal: "That's a sugar alcohol.", blurb: 'Linked to blood clotting and heart events in NIH-funded studies.', effect: 'Makes it UGLY.' },
  { keys: ['xylitol', 'e967'], reveal: "That's a sugar alcohol.", blurb: 'Linked to blood clotting and heart events in NIH-funded studies.', effect: 'Makes it UGLY.' },
  { keys: ['sorbitol', 'maltitol', 'mannitol', 'isomalt', 'lactitol'], reveal: "That's a sugar alcohol.", blurb: 'Fewer calories than sugar, but it can upset your stomach.', effect: 'Makes it BAD.' },
  { keys: ['stevia', 'steviol', 'rebaudioside', 'reb a', 'e960'], reveal: "That's a plant sweetener.", blurb: 'The best-studied gentle option, but still a sweetener.', effect: 'Makes it BAD.' },
  { keys: ['monk fruit', 'luo han guo', 'mogroside'], reveal: "That's a plant sweetener.", blurb: 'Looks safe, but it has barely been studied in people.', effect: 'Makes it BAD.' },
  { keys: ['allulose'], reveal: "That's a rare sugar.", blurb: "The FDA doesn't count it as added sugar. It can upset your stomach.", effect: 'Makes it BAD.' },
  { keys: ['thaumatin'], reveal: "That's a plant sweetener.", blurb: 'A sweet protein from a West African fruit.', effect: 'Makes it BAD.' },
];

const NATURAL: Def[] = [
  { keys: ['lactose'], blurb: 'The sugar naturally in milk.' },
  { keys: ['fructose'], blurb: 'The sugar naturally in fruit.' },
  { keys: ['glucose'], blurb: 'Naturally in fruit and vegetables.' },
  { keys: ['galactose'], blurb: 'Naturally in milk.' },
];

const DEFAULTS: Record<Kind, GlossaryEntry> = {
  added: { reveal: SUGAR, blurb: 'Another name for added sugar.', effect: ANY_ADDED },
  sweetener: { reveal: "That's a sweetener.", blurb: 'Added to make it taste sweet without sugar.', effect: 'Counts against it.' },
  natural: { reveal: 'Naturally there.', blurb: 'Part of the food itself, not added.', effect: "Doesn't count against it." },
};

const LISTS: Record<Kind, Def[]> = { added: ADDED, sweetener: SWEETENERS, natural: NATURAL };

/** What `ingredient` really is. Matches the longest known name inside it, e.g. "Organic Cane Sugar" -> cane sugar. */
export function lookup(ingredient: string, kind: Kind): GlossaryEntry {
  const lower = ingredient.toLowerCase();
  let best: Def | null = null;
  let bestLen = 0;
  for (const def of LISTS[kind]) {
    for (const k of def.keys) {
      if (k.length > bestLen && lower.includes(k)) {
        best = def;
        bestLen = k.length;
      }
    }
  }
  const base = DEFAULTS[kind];
  return { reveal: best?.reveal ?? base.reveal, blurb: best?.blurb ?? base.blurb, effect: best?.effect ?? base.effect };
}

/** "6 g added per serving · about 1½ teaspoons" (4 g of sugar is about one teaspoon). Null when grams aren't known. */
/** Added grams and the teaspoon amount, for the panel's right column: { grams: '6 g', amount: 'about 1½ teaspoons' }. */
export function addedAmount(addedSugars: string[]): { grams: string; amount: string } | null {
  const m = addedSugars.map((s) => s.match(/^(\d+(?:\.\d+)?) g added per serving$/i)).find(Boolean);
  if (!m) return null;
  const g = Number(m[1]);
  if (!(g > 0)) return null;
  const tsp = Math.round((g / 4) * 2) / 2; // nearest half teaspoon
  const whole = Math.floor(tsp);
  const half = tsp - whole === 0.5;
  const amount = g < 2 ? 'under ½ teaspoon' : `about ${whole > 0 ? whole : ''}${half ? '½' : ''} teaspoon${tsp > 1 ? 's' : ''}`;
  return { grams: `${m[1]} g`, amount };
}

export function gramsLine(addedSugars: string[]): string | null {
  const a = addedAmount(addedSugars);
  return a ? `${a.grams} added per serving · ${a.amount}` : null;
}
