// Sugar rules adapter (CLEAN / OKAY / BAD / RETRY). Pure functions: no network, no Deno APIs.
//
// The pipeline is staged so no model judgment reaches the rules verdict:
//   1. extraction   scan-label asks Claude only for the literal label text and printed numbers (LiteralLabel)
//   2. normalization normalize.ts parses the list and matches the registry exactly (ingredients.ts)
//   3. classification + 4. policy   policy.ts evaluate(), one ordered function, Rules v3
// This file maps the Evaluation onto the ScanResult the app renders.
//
// Jev makes the call from the photo (see _shared/jev.ts and src/lib/combine.ts). These rules decide when
// Jev is unavailable or unsure, and their safety floor keeps added sugar, artificial sweeteners and
// alcohol from ever showing as CLEAN.
import { evaluate, type Evaluation, type LiteralLabel, type ShownVerdict, type Verdict } from './policy.ts';

export type { Evaluation, LiteralLabel, ShownVerdict, Verdict };
export { POLICY_VERSION } from './policy.ts';

/** Sent with every response so the app can tell CLEAN / OKAY / BAD from the old CLEAN / BAD / UGLY. */
export const VERDICT_SCHEME = 'v3';

/** The shape the app renders. Keep in sync with src/types.ts. */
export type ScanResult = {
  verdict: ShownVerdict;
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
  | { status: 'retry'; message: string; evaluation: Evaluation };

const HEADLINE: Record<string, string> = {
  'X1-added-sugar-over-4g': 'Too much added sugar',
  'X2-added-sugar-no-grams': 'Added sugar',
  'X3-artificial-sweetener': 'Artificial sweeteners',
  'X4-alcohol': 'Contains alcohol',
  'O1-added-sugar-up-to-4g': 'A little added sugar',
  'O3-plant-sweetener': 'Gentler sweetener',
  'O4-unknown-sweetener': 'Unfamiliar sweetener',
  'C1-clean': 'No added sugar',
};

const fmtGrams = (g: number) => `${Number.isInteger(g) ? g : g.toFixed(1)} g`;

export function toScanResult(ev: Evaluation): ScanResult {
  const f = ev.found;
  const naturalSugars = f.naturally_occurring_sugar.map((e) => e.literal);
  const addedSugars = [...f.added_sugar, ...f.rare_sugar.filter((e) => e.treatment === 'added_sugar')].map((e) => e.literal);
  const g = ev.quantity.addedSugarsG;
  // Only a per-serving amount uses the "N g added per serving" line the app parses; never invented.
  if (g !== null && g > 0 && ev.quantity.basis === 'per_serving') addedSugars.push(`${fmtGrams(g)} added per serving`);
  const sweeteners = [
    ...f.non_sugar_sweetener.map((e) => e.literal),
    ...f.sugar_alcohol.map((e) => `${e.literal} (sugar alcohol)`),
    ...f.rare_sugar.filter((e) => e.treatment !== 'added_sugar').map((e) => e.literal),
    ...(ev.ruleId === 'O4-unknown-sweetener' ? ev.unknownSweeteners : []),
  ];
  const headline = ev.ruleId === 'O2-sugar-alcohol'
    ? (f.sugar_alcohol.length ? 'Contains sugar alcohols' : 'Gentler sweetener')
    : HEADLINE[ev.ruleId] ?? 'Checked';
  const note = ev.ruleId === 'X2-added-sugar-no-grams'
    ? 'Scan the nutrition panel to see the grams'
    : ev.ruleId === 'O3-plant-sweetener' || (ev.ruleId === 'O2-sugar-alcohol' && !f.sugar_alcohol.length)
      ? 'The gentlest option, but still a sweetener'
      : ev.ruleId === 'C1-clean'
        ? 'Great pick, no added sugar'
        : undefined;
  return { verdict: ev.verdict as ShownVerdict, headline, naturalSugars, addedSugars, sweeteners, note, analysis: ev };
}

export function decide(label: LiteralLabel): Decision {
  const evaluation = evaluate(label);
  if (evaluation.status === 'retry') return { status: 'retry', message: evaluation.explanation, evaluation };
  return { status: 'decided', result: toScanResult(evaluation), evaluation };
}

/** Headline for a verdict when only Jev's call is known. */
export const quickHeadline: Record<ShownVerdict, string> = {
  CLEAN: 'No added sugar',
  OKAY: 'A little sugar or a gentler sweetener',
  BAD: 'Added sugar or harsh sweeteners',
};
