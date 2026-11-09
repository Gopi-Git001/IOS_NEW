// Sugar rules adapter (CLEAN / BAD / UGLY). Pure functions: no network, no Deno APIs.
//
// The pipeline is staged so no model judgment reaches the rules verdict:
//   1. extraction   scan-label asks Claude only for the literal label text and printed numbers (LiteralLabel)
//   2. normalization normalize.ts parses the list and matches the registry exactly (ingredients.ts)
//   3. classification + 4. policy   policy.ts evaluate(), one ordered function, Rules v2
// This file maps the Evaluation onto the ScanResult the app renders.
//
// Jev's role is unchanged (user decision, Nov 6, 2026): Jev makes the final call from the photo
// (see _shared/jev.ts and src/lib/combine.ts). These rules decide when Jev is unavailable or unsure.
import { evaluate, type Evaluation, type LiteralLabel, type Verdict } from './policy.ts';

export type { Evaluation, LiteralLabel, Verdict };
export { POLICY_VERSION } from './policy.ts';

/** The shape the app renders. Keep in sync with src/types.ts. */
export type ScanResult = {
  verdict: Verdict;
  headline: string;
  naturalSugars: string[];
  addedSugars: string[];
  sweeteners: string[];
  note?: string;
  /** Full structured output: policy version, rule id, evidence, quantities, missing info. */
  analysis?: Evaluation;
};

export type Decision =
  | { status: 'decided'; result: ScanResult; evaluation: Evaluation }
  | { status: 'unresolved'; retake: boolean; message: string; evaluation: Evaluation };

const HEADLINE: Record<string, string> = {
  'U1-added-sugar': 'Added sugar',
  'U2-panel-added-sugar': 'Added sugar',
  'U3-artificial-sweetener': 'Artificial sweeteners',
  'U4-erythritol-xylitol': '',
  'U5-drinking-alcohol': 'Contains alcohol',
  'B1-sugar-alcohol': 'Contains sugar alcohols',
  'B2-plant-sweetener': 'Gentler sweetener',
  'B3-allulose': 'Gentler sweetener',
  'C1-nothing-sweet-added': 'No added sugar',
};

const fmtGrams = (g: number) => `${Number.isInteger(g) ? g : g.toFixed(1)} g`;

export function toScanResult(ev: Evaluation): ScanResult {
  const f = ev.found;
  const naturalSugars = f.naturally_occurring_sugar.map((e) => e.literal);
  const addedSugars = [...f.added_sugar, ...f.rare_sugar.filter((e) => e.treatment === 'ugly')].map((e) => e.literal);
  const g = ev.quantity.addedSugarsG;
  // Only a per-serving amount uses the "N g added per serving" line the app parses; never invented.
  if (g !== null && g > 0 && ev.quantity.basis === 'per_serving') addedSugars.push(`${fmtGrams(g)} added per serving`);
  const sweeteners = [
    ...f.non_sugar_sweetener.map((e) => e.literal),
    ...f.sugar_alcohol.map((e) => `${e.literal} (sugar alcohol)`),
    ...f.rare_sugar.filter((e) => e.treatment !== 'ugly').map((e) => e.literal),
  ];
  const headline = ev.ruleId === 'U4-erythritol-xylitol'
    ? `Contains ${ev.triggers[0].name.toLowerCase()}`
    : HEADLINE[ev.ruleId] ?? 'Checked';
  const note = ev.ruleId.startsWith('U1') && g === null
    ? 'Scan the nutrition panel to see the grams'
    : ev.ruleId.startsWith('B2') || ev.ruleId.startsWith('B3')
      ? 'The gentlest option, but still a sweetener'
      : ev.ruleId === 'C1-nothing-sweet-added'
        ? 'Great pick, no added sugar'
        : undefined;
  return { verdict: ev.verdict!, headline, naturalSugars, addedSugars, sweeteners, note, analysis: ev };
}

export function decide(label: LiteralLabel): Decision {
  const evaluation = evaluate(label);
  if (evaluation.status === 'unresolved') {
    return { status: 'unresolved', retake: evaluation.retake, message: evaluation.explanation, evaluation };
  }
  return { status: 'decided', result: toScanResult(evaluation), evaluation };
}

/** Headline for a verdict when only Jev's call is known (the ingredient lists come later). */
export const quickHeadline: Record<Verdict, string> = {
  CLEAN: 'No added sugar',
  BAD: 'Contains sweeteners',
  UGLY: 'Added sugar or harsh sweeteners',
};
