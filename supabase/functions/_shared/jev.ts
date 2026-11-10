// Jev (TypeSafe System One) makes the fast verdict call straight from the label photo.
// Docs: https://docs.typesafe.ai/api  ·  Images: https://docs.typesafe.ai/images
//
// One request, several typed questions evaluated in parallel: is this a food label, and is it
// CLEAN, OKAY or BAD? Jev is the decision-maker. The Claude reading + rules (rules.ts) fill in the
// ingredient lists, decide when Jev is unavailable or not confident enough, and keep added sugar,
// artificial sweeteners and alcohol from ever showing as CLEAN (src/lib/combine.ts).
import type { ShownVerdict as Verdict } from './rules.ts';

export const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
export const MODEL = 'jev-latest';
const TIMEOUT_MS = 6000;

/** Below this Choice confidence the app waits for the rules verdict instead. */
export const MIN_CONFIDENCE = 0.45;
/** Below this probability that the photo is a food label, we say so instead of guessing. */
export const MIN_LABEL_PROBABILITY = 0.5;
/** Below this probability that the ingredient text is legible, we ask for a clearer photo. */
export const MIN_LEGIBLE_PROBABILITY = 0.5;

export type JevVerdict =
  | {
      status: 'decided';
      verdict: Verdict;
      confidence: number;
      probabilities: Partial<Record<Verdict, number>>;
      model: string;
    }
  | { status: 'unsure'; verdict: Verdict | null; confidence: number | null; model: string }
  | { status: 'not_a_label'; model: string }
  | { status: 'unreadable'; model: string }
  | { status: 'unavailable'; reason: string };

const VERDICT_CRITERIA = {
  CLEAN: {
    what: 'No added sugar, no sweeteners of any kind and no alcohol in the ingredient list. Sugar that comes with milk, fruit or vegetables is fine, and so is a 100% juice made only from juice (even from concentrate).',
    examples: ['Plain yogurt (milk, cultures)', 'Unsweetened almond milk', 'Whole fruit', 'Plain oats', '100% orange juice from concentrate', 'Non-alcoholic beer (<0.5% ABV) with no sugar'],
    not_for: 'Anything with sugar, syrup, honey, juice concentrate used to sweeten another food, any sweetener, or alcohol above 0.5% ABV.',
  },
  OKAY: {
    what:
      'The nutrition panel shows 4 g or less of added sugar per serving, OR the only sweetener is stevia, monk fruit, thaumatin, ' +
      'allulose or a sugar alcohol (erythritol, xylitol, sorbitol, maltitol, mannitol, isomalt...), with no artificial sweetener and no alcohol.',
    examples: ['Bread with 2 g added sugar per serving', 'Stevia-sweetened sparkling water', 'Monk fruit protein bar', 'Keto cookie with erythritol'],
    not_for: 'More than 4 g added sugar per serving, added sugar with no per-serving grams visible, artificial sweeteners, or alcohol. Those are BAD.',
  },
  BAD: {
    what:
      'More than 4 g of added sugar per serving, OR added sugar listed with no per-serving Added Sugars grams visible, OR any ' +
      'artificial sweetener (aspartame, sucralose, acesulfame K, saccharin, neotame, advantame, cyclamate, E950-E969), OR drinking alcohol above 0.5% ABV.',
    examples: ['Soda', 'Diet soda', 'Granola with honey and no nutrition panel in view', 'Beer (5% ABV)', 'Cereal with 12 g added sugar'],
  },
};

const INSTRUCTIONS =
  'Read the ingredient list (and the nutrition panel, if visible) in `label_photo` and rate the product for sugar. ' +
  'Sugar hides under many names: cane sugar, sucrose, dextrose, glucose or corn syrup, fruit juice concentrate, ' +
  'honey, agave, molasses, rice syrup, malt syrup, malt extract and more all count as added sugar (malted barley ' +
  'itself, the brewing grain, is not sugar). Use the "Added Sugars" grams per ' +
  'serving from the panel: 4 g or less is OKAY, more than 4 g is BAD, and added sugar with no per-serving grams visible is BAD. ' +
  'Sugars naturally present in whole fruit, milk, plain yogurt or 100% juice are fine. "<0.5% ABV", "0.0%", "non-alcoholic" ' +
  'and "alcohol-free" are not alcohol. Maltodextrin, resistant maltodextrin, starches and fibers are not sugars and are not sweeteners.';
/** Builds the System One request. `ref` is the per-request image reference (a UUID). */
export function buildJevRequest(imageBase64: string, ref: string) {
  return {
    model: MODEL,
    state: { label_photo: ref },
    assets: { [ref]: { type: 'image', format: 'jpg', data_base64: imageBase64 } },
    questions: {
      is_food_label: {
        type: 'noul',
        instructions: 'Does `label_photo` show the ingredient list or nutrition panel of a food or drink?',
      },
      is_legible: {
        type: 'noul',
        instructions:
          'Is the ingredient list text in `label_photo` sharp and readable word by word? ' +
          'Answer low if it is blurry, out of focus, too dark, washed out by glare, cut off, or too small to read.',
      },
      verdict: { type: 'choice', instructions: INSTRUCTIONS, criteria: VERDICT_CRITERIA },
    },
  };
}

const VERDICTS: Verdict[] = ['CLEAN', 'OKAY', 'BAD'];

/** Turns a System One response body into a verdict the app can show. */
export function readJevResponse(body: unknown): JevVerdict {
  const b = body as {
    model?: unknown;
    answers?: {
      is_food_label?: { noul?: unknown };
      is_legible?: { noul?: unknown };
      verdict?: { choice?: unknown; confidence?: unknown; probabilities?: unknown };
    };
  };
  const model = typeof b?.model === 'string' ? b.model : MODEL;
  const label = b?.answers?.is_food_label?.noul;
  const v = b?.answers?.verdict;
  const choice = v?.choice;
  if (!VERDICTS.includes(choice as Verdict)) return { status: 'unavailable', reason: 'unexpected response shape' };
  if (typeof label === 'number' && label < MIN_LABEL_PROBABILITY) return { status: 'not_a_label', model };
  const legible = b?.answers?.is_legible?.noul;
  if (typeof legible === 'number' && legible < MIN_LEGIBLE_PROBABILITY) return { status: 'unreadable', model };

  const confidence = typeof v?.confidence === 'number' ? v.confidence : null;
  if (confidence === null || confidence < MIN_CONFIDENCE) {
    return { status: 'unsure', verdict: choice as Verdict, confidence, model };
  }
  const probabilities: Partial<Record<Verdict, number>> = {};
  if (v?.probabilities && typeof v.probabilities === 'object') {
    for (const k of VERDICTS) {
      const p = (v.probabilities as Record<string, unknown>)[k];
      if (typeof p === 'number') probabilities[k] = p;
    }
  }
  return { status: 'decided', verdict: choice as Verdict, confidence, probabilities, model };
}

/** Asks Jev for the verdict. Never throws: failures come back as `unavailable`. */
export async function askJev(imageBase64: string, apiKey: string | undefined, ref = crypto.randomUUID()): Promise<JevVerdict> {
  if (!apiKey) return { status: 'unavailable', reason: 'TYPESAFE_API_KEY not set' };
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Images are opt-in ("dreamer-ready") on System One.
        'TypeSafe-Danger-Zone-Images': 'true',
      },
      body: JSON.stringify(buildJevRequest(imageBase64, ref)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const requestId = res.headers.get('x-typesafe-request-id');
      return { status: 'unavailable', reason: `HTTP ${res.status}${requestId ? ` (request ${requestId})` : ''}` };
    }
    return readJevResponse(await res.json());
  } catch (err) {
    return { status: 'unavailable', reason: err instanceof Error ? err.message : String(err) };
  }
}
