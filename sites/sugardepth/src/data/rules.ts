// The rule table from RULES.md (policy rules-v2.1), in plain words. First match wins.
export type Outcome = 'UGLY' | 'BAD' | 'CLEAN' | 'RETAKE' | 'UNRESOLVED';
export type Rule = { id: string; condition: string; outcome: Outcome; result: string };

export const RULES: Rule[] = [
  { id: 'A1', condition: "The photo isn't a food label.", outcome: 'RETAKE', result: 'No verdict. Asks for a retake.' },
  { id: 'A2', condition: "The ingredient text can't be read.", outcome: 'RETAKE', result: 'No verdict. Asks for a retake.' },
  { id: 'U1', condition: 'Any added sugar is listed, including juice concentrate, lactose listed on its own, tagatose or isomaltulose.', outcome: 'UGLY', result: 'UGLY' },
  { id: 'U2', condition: 'The Nutrition Facts panel shows Added Sugars above 0 g.', outcome: 'UGLY', result: 'UGLY' },
  { id: 'U3', condition: 'An artificial sweetener is listed: sucralose, aspartame, acesulfame K, saccharin, cyclamate, neotame, advantame, aspartame-acesulfame salt or neohesperidin DC (NHDC).', outcome: 'UGLY', result: 'UGLY' },
  { id: 'U4', condition: 'Erythritol or xylitol is listed.', outcome: 'UGLY', result: 'UGLY' },
  { id: 'U5', condition: 'Drinking alcohol is listed (beer, wine, spirits or ethanol), or an alcohol-by-volume figure is printed.', outcome: 'UGLY', result: 'UGLY' },
  { id: 'A3', condition: 'No ingredient list is visible.', outcome: 'RETAKE', result: 'No verdict. Asks for a retake.' },
  { id: 'A4', condition: 'The ingredient list is cut off or partly unreadable.', outcome: 'RETAKE', result: 'No verdict. Asks for a retake.' },
  { id: 'A5', condition: 'An unknown ingredient might be a sweetener (a sweet-sounding word, or an unknown code between E950 and E969).', outcome: 'UNRESOLVED', result: 'No verdict. Says what it could not identify.' },
  { id: 'A6', condition: 'Juice from concentrate, or fruit puree concentrate, is listed. The label alone does not say whether it counts as added sugar.', outcome: 'UNRESOLVED', result: 'No verdict. Says what needs context.' },
  { id: 'B1', condition: 'A sugar alcohol other than erythritol or xylitol is listed: sorbitol, maltitol, mannitol, isomalt, lactitol or polyglycitol.', outcome: 'BAD', result: 'BAD' },
  { id: 'B2', condition: 'A plant sweetener is listed: stevia, monk fruit or thaumatin.', outcome: 'BAD', result: 'BAD' },
  { id: 'B3', condition: 'Allulose is listed.', outcome: 'BAD', result: 'BAD' },
  { id: 'C1', condition: 'The ingredient list is complete and none of the above applies.', outcome: 'CLEAN', result: 'CLEAN' },
];

export type Treatment = { ingredient: string; cls: string; labeling: string; verdict: string; guide?: string; source?: string };

// "Identity vs. treatment" table from RULES.md.
export const TREATMENTS: Treatment[] = [
  { ingredient: 'Sucralose', cls: 'Non-sugar sweetener (artificial)', labeling: 'Not counted as sugar', verdict: 'UGLY', guide: 'sucralose' },
  { ingredient: 'Erythritol', cls: 'Sugar alcohol (not drinking alcohol)', labeling: 'Not counted as sugar', verdict: 'UGLY', guide: 'erythritol' },
  { ingredient: 'Allulose', cls: 'Rare sugar', labeling: 'Left out of Total and Added Sugars', verdict: 'BAD', guide: 'allulose', source: 'allulose' },
  { ingredient: 'Tagatose, isomaltulose', cls: 'Rare sugar', labeling: 'Counted as sugar', verdict: 'UGLY', source: 'rareSugars' },
  { ingredient: 'Maltodextrin', cls: 'Other carbohydrate (nonsweet, DE under 20)', labeling: 'Not counted as sugar', verdict: 'Allowed in CLEAN', guide: 'maltodextrin', source: 'maltodextrin' },
  { ingredient: 'Resistant maltodextrin', cls: 'Dietary fiber', labeling: 'Not counted as sugar', verdict: 'Allowed in CLEAN', guide: 'maltodextrin', source: 'fiber' },
  { ingredient: 'Juice concentrate', cls: 'Added sugar', labeling: 'Counted as Added Sugars', verdict: 'UGLY', guide: 'juice-concentrate', source: 'addedSugarsQA' },
  { ingredient: 'Single-strength juice, fruit puree', cls: 'Naturally occurring sugar', labeling: 'Not added', verdict: 'Allowed in CLEAN', source: 'addedSugarsQA' },
  { ingredient: 'Lactose listed on its own', cls: 'Added sugar', labeling: 'Counted as Added Sugars', verdict: 'UGLY', source: 'addedSugarsQA' },
  { ingredient: 'Milk, yogurt, whey', cls: 'Naturally occurring sugar', labeling: 'Not added', verdict: 'Allowed in CLEAN', source: 'addedSugarsQA' },
];
