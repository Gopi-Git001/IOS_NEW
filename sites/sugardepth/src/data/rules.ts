// The rule table from RULES.md (policy rules-v3), in plain words. First match wins.
// The ids, their order, each outcome and the numbers in the conditions are checked against policy.ts by
// tests/unit/site-rules.test.ts, so a rule added, removed, reordered or changed there fails the tests until this
// file follows. The ingredient names inside X3, O2 and O3 are read from the registry data, not typed here.
import { MAX_OKAY_ADDED_G as G, PAGES } from './ingredients';

export type Outcome = 'BAD' | 'OKAY' | 'CLEAN' | 'RETAKE';
/** `id` is the short id shown on the page and used in anchors (#rule-X1); `policyId` is the rule id policy.ts returns. */
export type Rule = { id: string; policyId: string; condition: string; outcome: Outcome; result: string };

const RETAKE = 'No verdict. Asks for a retake.';

/** Names of the registry entries that a rule fires on, as a sentence list: "sucralose, aspartame or acesulfame K". */
const lowerFirst = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);
const listed = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : names[0] ?? '');
const firing = (key: string, cls?: string, not = false) =>
  PAGES.filter((p) => p.outcomes.some((o) => o.rule === key) && (cls === undefined || (p.cls === cls) !== not)).map((p) => lowerFirst(p.name));
const O2 = 'O2-sugar-alcohol';

export const RULES: Rule[] = [
  { id: 'R1', policyId: 'R1-not-food', condition: "The photo isn't a food or drink label.", outcome: 'RETAKE', result: RETAKE },
  { id: 'R2', policyId: 'R2-unreadable', condition: "The ingredient text can't be read.", outcome: 'RETAKE', result: RETAKE },
  { id: 'X1', policyId: 'X1-added-sugar-over-4g', condition: `The Nutrition Facts panel shows more than ${G}\u00a0g of added sugar per serving.`, outcome: 'BAD', result: 'BAD' },
  { id: 'X2', policyId: 'X2-added-sugar-no-grams', condition: "Added sugar is listed but the grams per serving can't be read. This includes labels that print sugar only per 100\u00a0g or 100\u00a0ml.", outcome: 'BAD', result: 'BAD' },
  { id: 'X3', policyId: 'X3-artificial-sweetener', condition: `An artificial sweetener is listed: ${listed(firing('X3-artificial-sweetener'))}.`, outcome: 'BAD', result: 'BAD' },
  { id: 'X4', policyId: 'X4-alcohol', condition: 'Drinking alcohol: the label prints more than 0.5% ABV, or lists beer, wine, spirits or ethanol without a non-alcoholic or "0.5% or less" statement.', outcome: 'BAD', result: 'BAD' },
  { id: 'R3', policyId: 'R3-no-ingredient-list', condition: 'No ingredient list is visible.', outcome: 'RETAKE', result: RETAKE },
  { id: 'O1', policyId: 'O1-added-sugar-up-to-4g', condition: `Added sugar at ${G}\u00a0g or less per serving on the Nutrition Facts panel. A listed added sugar with a printed 0\u00a0g lands here too.`, outcome: 'OKAY', result: 'OKAY' },
  { id: 'O2', policyId: 'O2-sugar-alcohol', condition: `A sugar alcohol is listed (${listed(firing(O2, 'sugar_alcohol'))}), or ${listed(firing(O2, 'sugar_alcohol', true))}.`, outcome: 'OKAY', result: 'OKAY' },
  { id: 'O3', policyId: 'O3-plant-sweetener', condition: `A plant sweetener is listed: ${listed(firing('O3-plant-sweetener'))}.`, outcome: 'OKAY', result: 'OKAY' },
  { id: 'R4', policyId: 'R4-incomplete-list', condition: 'The ingredient list is cut off or partly unreadable, and nothing above was found in the part that can be read.', outcome: 'RETAKE', result: RETAKE },
  { id: 'O4', policyId: 'O4-unknown-sweetener', condition: 'An unknown ingredient might be a sweetener (a sweet-sounding name, or an unrecognized E number in the sweetener range E950 to E969).', outcome: 'OKAY', result: 'OKAY' },
  { id: 'O5', policyId: 'O5-unrecognised-ingredients', condition: "Two or more ingredients aren't in the registry, so the rules can't vouch for the whole list.", outcome: 'OKAY', result: 'OKAY' },
  { id: 'C1', policyId: 'C1-clean', condition: 'The ingredient list is complete and none of the above applies. Sugar that comes with milk, fruit or vegetables is fine.', outcome: 'CLEAN', result: 'CLEAN' },
];

/** `/how-it-works#rule-X1` for a rule id as policy.ts returns it ("X1-added-sugar-over-4g"). */
export const ruleHref = (key: string) => {
  const rule = RULES.find((r) => r.policyId === key);
  return rule ? `/how-it-works#rule-${rule.id}` : undefined;
};

// Rows of the "Identity vs. treatment" table (RULES.md), as registry ids. Each row is one or more entries that
// share a class, a US label treatment and a verdict; the cells are read from the generated registry data.
export const TREATMENT_ROWS: string[][] = [
  ['sucralose'],
  ['erythritol', 'xylitol'],
  ['allulose'],
  ['tagatose', 'isomaltulose'],
  ['maltodextrin'],
  ['resistant_maltodextrin'],
  ['juice_concentrate'],
  ['juice_from_concentrate'],
  ['single_strength_juice', 'fruit_puree'],
  ['lactose_added'],
  ['milk'],
  ['malted_barley'],
  ['malt_syrup'],
  ['imo'],
];
