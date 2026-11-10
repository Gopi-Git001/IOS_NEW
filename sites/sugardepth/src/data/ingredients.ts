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

/** Index sections, in the order the rules check them. */
export const GROUPS: { id: GroupId; tone: string; nav: string; title: string; blurb: string }[] = [
  {
    id: 'added_sugar',
    tone: 'mixed',
    nav: 'Added sugar',
    title: 'Added sugar: the grams decide',
    blurb: `Every name here is added sugar. More than ${MAX_OKAY_ADDED_G} g per serving, or grams that can't be read, is BAD. ${MAX_OKAY_ADDED_G} g or less is OKAY.`,
  },
  { id: 'bad', tone: 'bad', nav: 'BAD', title: 'BAD: artificial sweeteners and alcohol', blurb: 'One of these on the label is enough.' },
  { id: 'okay', tone: 'okay', nav: 'OKAY', title: 'OKAY: sugar alcohols, allulose and plant sweeteners', blurb: 'Not counted as sugar on US labels, but there to sweeten.' },
  { id: 'depends', tone: 'mixed', nav: 'Depends on the label', title: 'Depends on the rest of the label', blurb: 'Added sugar when it sweetens another food. Natural sugar in a product made only of fruit or juice.' },
  { id: 'clean_sweet', tone: 'clean', nav: 'CLEAN, sounds sweet', title: "Allowed in CLEAN: sounds sweet, isn't added sugar", blurb: 'Starches, fibers and whole foods that carry their own sugar.' },
  { id: 'clean_plain', tone: 'clean', nav: 'CLEAN, everyday', title: 'Allowed in CLEAN: everyday ingredients', blurb: 'No sweetening role. The registry knows them so an ordinary label can come out CLEAN.' },
];
