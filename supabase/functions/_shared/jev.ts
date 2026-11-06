// Jev (TypeSafe System One) makes the fast verdict call straight from the label photo.
// Docs: https://docs.typesafe.ai/api  ·  Images: https://docs.typesafe.ai/images
//
// One request, several typed questions evaluated in parallel: is this a food label, and is it
// CLEAN, BAD or UGLY? Jev is the decision-maker. The Claude reading + rules (rules.ts) only fill in
// the ingredient lists and decide when Jev is unavailable or not confident enough.
import type { Verdict } from './rules.ts';

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
    what: 'No added sugar and no sweeteners of any kind in the ingredient list.',
    examples: ['Plain yogurt (milk, cultures)', 'Unsweetened almond milk', 'Whole fruit', 'Plain oats'],
    not_for: 'Anything with sugar, syrup, honey, juice concentrate, or any sweetener listed as an ingredient.',
  },
  BAD: {
    what:
      'No added sugar at all, but sweetened with stevia, monk fruit, allulose, or a sugar alcohol other than ' +
      'erythritol and xylitol (for example sorbitol, maltitol, mannitol, isomalt).',
    examples: ['Stevia-sweetened sparkling water', 'Monk fruit protein bar with no sugar', 'Sugar-free mints with sorbitol'],
    not_for: 'Anything with ANY added sugar, artificial sweeteners, erythritol, xylitol, or drinking alcohol. Those are UGLY.',
  },
  UGLY: {
    what:
      'ANY added sugar, in any amount (sugar, cane sugar, syrups, honey, agave, molasses, fruit juice concentrate...), OR any ' +
      'artificial sweetener (aspartame, sucralose, acesulfame K, saccharin, neotame, advantame, cyclamate, E950-E969), OR ' +
      'erythritol or xylitol, OR drinking alcohol.',
    examples: ['Soda', 'Diet soda', 'Bread with 1 g added sugar', 'Keto cookie with erythritol', 'Granola with honey', 'Beer'],
  },
};

const INSTRUCTIONS =
  'Read the ingredient list (and the nutrition panel, if visible) in `label_photo` and rate the product for sugar. ' +
  'Sugar hides under many names: cane sugar, sucrose, dextrose, glucose or corn syrup, maltodextrin, fruit juice concentrate, ' +
  'honey, agave, molasses, rice syrup, barley malt and more all count as added sugar. There is no gram threshold: any ' +
  'added sugar at all makes the product UGLY. Sugars naturally present in whole fruit, milk or plain yogurt are fine.';

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

const VERDICTS: Verdict[] = ['CLEAN', 'BAD', 'UGLY'];

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
