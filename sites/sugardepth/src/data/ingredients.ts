// The scanner's registry and rules as page data. ingredients.generated.json is written by
// scripts/sync-ingredients.ts (`npm run ingredients` in the repo root) from
// supabase/functions/_shared/ingredients.ts and policy.ts. Do not edit the JSON by hand.
import generated from './ingredients.generated.json';

export type IngredientPage = (typeof generated.pages)[number];
export type Outcome = IngredientPage['outcomes'][number];
export type GroupId = 'added_sugar' | 'bad' | 'okay' | 'depends' | 'clean_sweet' | 'clean_plain';

export const POLICY_VERSION = generated.policyVersion;
export const REGISTRY_VERSION = generated.registryVersion;
export const MAX_OKAY_ADDED_G = generated.maxOkayAddedG;
export const ADDED_SUGAR_ALIAS_COUNT = generated.addedSugarAliasCount;
export const PAGES: IngredientPage[] = generated.pages;

export const pageById = (id: string) => PAGES.find((p) => p.id === id);
export const pageBySlug = (slug: string) => PAGES.find((p) => p.slug === slug);

/**
 * Colour class for a rules-v3 verdict. The class names predate v3: amber is still `.bad` and red is still `.ugly`
 * (the app maps the same tokens the same way in src/theme.ts).
 */
const TONE_CLASS: Record<string, string> = { BAD: 'ugly', OKAY: 'bad', CLEAN: 'clean', bad: 'ugly', okay: 'bad', clean: 'clean' };
export const toneClass = (verdictOrTone: string) => TONE_CLASS[verdictOrTone] ?? '';

/** Short text for the pill on a card. */
export const pillText = (p: IngredientPage) => (p.verdict.tone === 'clean' ? p.verdict.label : p.verdict.word);

/** Index sections, in the order the rules check them. One short line each. */
export const GROUPS: { id: GroupId; tone: string; nav: string; title: string; blurb: string }[] = [
  {
    id: 'added_sugar',
    tone: 'mixed',
    nav: 'Added sugar',
    title: 'Added sugar: the grams decide',
    blurb: `Over ${MAX_OKAY_ADDED_G} g of added sugar per serving, or grams that can't be read, is BAD. ${MAX_OKAY_ADDED_G} g or less is OKAY.`,
  },
  { id: 'bad', tone: 'bad', nav: 'BAD', title: 'BAD: artificial sweeteners and alcohol', blurb: 'One of these on the label is enough.' },
  { id: 'okay', tone: 'okay', nav: 'OKAY', title: 'OKAY: sugar alcohols, allulose and plant sweeteners', blurb: 'Not counted as sugar on US labels, but there to sweeten.' },
  { id: 'depends', tone: 'mixed', nav: 'Depends', title: 'Depends on the rest of the label', blurb: 'Added sugar only when it sweetens another food.' },
  { id: 'clean_sweet', tone: 'clean', nav: 'CLEAN, sounds sweet', title: "Allowed in CLEAN: sounds sweet, isn't added sugar", blurb: 'Starches, fibers and whole foods that carry their own sugar.' },
  { id: 'clean_plain', tone: 'clean', nav: 'CLEAN, everyday', title: 'Allowed in CLEAN: everyday ingredients', blurb: 'No sweetening role.' },
];

// ---------- short copy, written from the registry fields (never from a copy of the rules) ----------

/** Names that take a plural verb: "Flavors", "Fats and oils", "Isomaltooligosaccharides (IMO)". */
export const isPlural = (name: string) => /s( \([^)]*\))?$/.test(name);

/** How a page's one-sentence answer names the ingredient, where the registry name reads badly as a subject. */
const SUBJECT: Record<string, string> = { lactose_added: 'Lactose listed on its own' };

const KIND: Record<string, string> = { sugar_alcohol: 'a sugar alcohol', rare_sugar: 'a rare sugar', non_sugar_sweetener: 'a plant sweetener' };

/** A concentrate: added sugar when it sweetens another food, plain juice when it is the whole product. */
const isConcentrate = (p: IngredientPage) => p.group === 'depends' || (p.group === 'added_sugar' && p.outcomes.some((o) => o.verdict === 'CLEAN'));

/**
 * The one sentence under the H1: is it sugar, and what verdict does it get. Self-contained (it names the
 * ingredient and Sugar Depth), because it is also the meta description and the JSON-LD description.
 */
export function answerFor(p: IngredientPage): string {
  const plural = isPlural(p.name);
  const name = SUBJECT[p.id] ?? p.name;
  const [is, has, it, they] = plural ? ['are', 'have', 'them', 'they'] : ['is', 'has', 'it', 'it'];
  const g = MAX_OKAY_ADDED_G;
  if (isConcentrate(p)) return `${name} ${is} added sugar when ${they} sweeten${plural ? '' : 's'} another food, and natural sugar in a product made only of fruit or juice.`;
  switch (p.group as GroupId) {
    case 'added_sugar':
      return `${name} ${is} ${p.cls === 'rare_sugar' ? 'a rare sugar counted as added sugar' : 'added sugar'}: BAD on Sugar Depth above ${g} g of added sugar per serving, OKAY at ${g} g or less.`;
    case 'bad': {
      if (p.cls !== 'drinking_alcohol') return `${name} ${is} an artificial sweetener, not sugar, and any label that lists ${it} is BAD on Sugar Depth.`;
      // The limit lives in policy.ts; the generated outcomes carry it.
      const abv = p.outcomes.map((o) => /([\d.]+)% ABV or less/.exec(o.when)?.[1]).find(Boolean);
      if (!abv) throw new Error(`${p.id}: no ABV limit in the generated outcomes`);
      return `${name} makes a label BAD on Sugar Depth unless the label says non-alcoholic or ${abv}% ABV or less.`;
    }
    case 'okay':
      return `${name} ${is} ${KIND[p.cls]} that US labels do not count as sugar, and ${they} ${is} OKAY on Sugar Depth.`;
    default:
      if (p.cls === 'naturally_occurring_sugar') return `${name} ${has} natural sugar that US labels do not count as added sugar, and Sugar Depth allows ${it} in CLEAN.`;
      if (p.cls === 'other_carbohydrate') return `${name} ${is} a carbohydrate, not sugar, and Sugar Depth allows ${it} in CLEAN.`;
      return `${name} ${has} no sweetening role, and Sugar Depth allows ${it} in CLEAN.`;
  }
}

const labelNames = (n: number) => (n === 1 ? '1 label name' : `${n} label names`);

/** The line on an index card, six words at most. Where a whole group shares a class, the card counts names instead. */
export function tagFor(p: IngredientPage): string {
  const code = p.codes[0] ? `, ${p.codes[0]}` : '';
  if (p.group === 'depends') return 'Added sugar when it sweetens';
  switch (p.group as GroupId) {
    case 'added_sugar':
      return `${p.cls === 'rare_sugar' ? 'Rare sugar, ' : ''}${labelNames(p.aliases.length)}`;
    case 'bad':
      return p.cls === 'drinking_alcohol' ? 'Drinking alcohol' : `Artificial sweetener${code}`;
    case 'okay':
      return `${KIND[p.cls].replace(/^a /, '').replace(/^./, (c) => c.toUpperCase())}${code}`;
    case 'clean_sweet':
      return p.cls === 'naturally_occurring_sugar' ? 'Natural sugar, not added' : p.cls === 'other_carbohydrate' ? 'Carbohydrate, not sugar' : 'No sweetening role';
    default:
      return labelNames(p.aliases.length);
  }
}

/**
 * A rule row's condition without its lead-in: "It is listed, and the panel shows more than 4 g ..." reads
 * "More than 4 g ...". Only the lead-in goes; the condition is the generated text. Unknown wording is kept whole.
 */
export function shortWhen(when: string): string {
  const s = when
    .replace(/^It is listed,? (?:and|but) /, '')
    .replace(/^the panel shows /, '')
    .replace(/^the grams /, 'grams ')
    .replace(/^(It sweetens another food), and the panel shows /, '$1, with ');
  return s[0].toUpperCase() + s.slice(1);
}
