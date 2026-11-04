// Jev (TypeSafe AI) second opinion on the verdict. Docs: https://docs.typesafe.ai/api
// Jev answers typed questions; we ask one "choice" question: CLEAN, OKAY or BAD?
// The rules always decide. Jev only confirms, and a Jev failure never blocks a scan.
import type { LabelReading, Verdict } from './rules.ts';

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const MODEL = 'jev-latest';
const TIMEOUT_MS = 4000;

export type JevCheck =
  | { status: 'agrees' | 'disagrees'; jevVerdict: Verdict; confidence: number | null; model: string }
  | { status: 'unavailable'; reason: string };

export function buildJevRequest(reading: LabelReading) {
  return {
    model: MODEL,
    state: {
      label: {
        natural_sugars: reading.natural_sugars,
        added_sugars: reading.added_sugars,
        artificial_sweeteners: reading.artificial_sweeteners,
        sugar_alcohols: reading.sugar_alcohols,
        other_sweeteners: reading.other_sweeteners,
        contains_alcohol: reading.contains_alcohol,
        added_sugar_grams_per_serving: reading.added_sugar_grams,
      },
    },
    questions: {
      verdict: {
        type: 'choice',
        instructions:
          'Rate this food or drink label for sugar. Artificial sweeteners, alcohol, or more than 4 g added sugar per serving is BAD. ' +
          'Sugar alcohols, other sweeteners, or 1 to 4 g added sugar (or added sugar with unknown grams) is OKAY. ' +
          'No added sugar and no sweeteners is CLEAN.',
        criteria: {
          CLEAN: 'No added sugar and no sweeteners of any kind',
          OKAY: 'Sugar alcohols or plant sweeteners, or a small or unknown amount of added sugar',
          BAD: 'Artificial sweeteners, alcohol, or more than 4 g added sugar per serving',
        },
      },
    },
  };
}

/** Turns a Jev response body into a check against the rules verdict. */
export function readJevResponse(body: unknown, rulesVerdict: Verdict): JevCheck {
  const b = body as { model?: unknown; answers?: { verdict?: { choice?: unknown; confidence?: unknown } } };
  const choice = b?.answers?.verdict?.choice;
  if (choice !== 'CLEAN' && choice !== 'OKAY' && choice !== 'BAD') {
    return { status: 'unavailable', reason: 'unexpected response shape' };
  }
  const confidence = typeof b.answers?.verdict?.confidence === 'number' ? b.answers.verdict.confidence : null;
  return {
    status: choice === rulesVerdict ? 'agrees' : 'disagrees',
    jevVerdict: choice,
    confidence,
    model: typeof b.model === 'string' ? b.model : MODEL,
  };
}

export async function askJev(reading: LabelReading, rulesVerdict: Verdict, apiKey: string | undefined): Promise<JevCheck> {
  if (!apiKey) return { status: 'unavailable', reason: 'TYPESAFE_API_KEY not set' };
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildJevRequest(reading)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const requestId = res.headers.get('x-typesafe-request-id');
      return { status: 'unavailable', reason: `HTTP ${res.status}${requestId ? ` (request ${requestId})` : ''}` };
    }
    return readJevResponse(await res.json(), rulesVerdict);
  } catch (err) {
    return { status: 'unavailable', reason: err instanceof Error ? err.message : String(err) };
  }
}
