// POST { image: <base64 JPEG>, scan_id?: string }  ->  { result: ScanResult, timing } | { error: string, code?: string, timing }
// Signed-in users only. Stage 1 (extraction): Claude vision copies the label literally, with no
// sorting and no verdict. Stages 2-4 (normalize, classify, policy) run in _shared/rules.ts.
// Runs alongside quick-verdict (Jev), which makes the actual CLEAN / OKAY / BAD call.
import Anthropic from 'npm:@anthropic-ai/sdk@1.4.0';
import { env } from '../_shared/env.ts';
import { allow, intSetting, isJpegBase64, tooMany } from '../_shared/guard.ts';
import { withSupabase } from 'npm:@supabase/server@1.9.2';
import { decide, type LiteralLabel, VERDICT_SCHEME } from '../_shared/rules.ts';
import { clientFields, imageKb, requestTimer, timed } from '../_shared/timing.ts';

// The app gives up on the lists after 12 s, so the whole reading (one retry included) must end by 10 s.
const CLAUDE_DEADLINE_MS = 10_000;
const anthropic = new Anthropic({ apiKey: env('ANTHROPIC_API_KEY'), timeout: CLAUDE_DEADLINE_MS, maxRetries: 1 });

// Override with the CLAUDE_MODEL secret, e.g. a faster model if the lists feel slow.
const CLAUDE_MODEL = env('CLAUDE_MODEL') ?? 'claude-opus-5-5';


const numOrNull = { anyOf: [{ type: 'number' }, { type: 'null' }] };
const strOrNull = { anyOf: [{ type: 'string' }, { type: 'null' }] };

const LABEL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'is_food_label', 'is_readable', 'ingredients_text', 'ingredients_english', 'ingredients_complete', 'total_sugars_g', 'added_sugars_g',
    'quantity_basis', 'serving_size_text', 'abv_text',
  ],
  properties: {
    is_food_label: { type: 'boolean' },
    is_readable: { type: 'boolean' },
    ingredients_text: strOrNull,
    ingredients_english: {
      anyOf: [
        {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['printed', 'english'],
            properties: { printed: { type: 'string' }, english: { type: 'string' } },
          },
        },
        { type: 'null' },
      ],
    },
    ingredients_complete: { type: 'boolean' },
    total_sugars_g: numOrNull,
    added_sugars_g: numOrNull,
    quantity_basis: { type: 'string', enum: ['per_serving', 'per_100g', 'per_100ml', 'unknown'] },
    serving_size_text: strOrNull,
    abv_text: strOrNull,
  },
};

const SYSTEM = `You transcribe photos of food and drink labels for a sugar-checking app. Copy what is printed. Do not judge, sort or rate anything.

- ingredients_text: the ingredient list copied exactly as printed, in reading order, including parentheses, brackets, percentages and E-numbers. Do not reword, translate, reorder, summarize or add anything. Leave out the word "Ingredients:" and any allergen statement ("Contains: Milk"). Use null if no ingredient list is visible.
  - If the list is cut off, covered or partly unreadable, still copy every ingredient you can read, and always include every sugar, syrup, sweetener or alcohol you can see. Never leave out a readable ingredient because the rest of the list is missing.
  - A footnote that names more ingredients (e.g. "▲Ferment of tea, kiwi juice and cane sugar") is part of the list: copy those ingredients. Leave out footnote claims such as "*Organic", "Used for fermentation, not as an added sweetener" or "naturally occurring sugars"; they never remove an ingredient from the list.
- ingredients_english: null if the ingredient list is in English. Otherwise, one entry per ingredient in ingredients_text (sub-ingredients included), in the same order: "printed" exactly as in ingredients_text, "english" its common English name (e.g. {"printed": "suiker", "english": "sugar"}, {"printed": "lait écrémé en poudre", "english": "skimmed milk powder"}).
- ingredients_complete: false if any part of the ingredient list runs off the photo, is covered, or can't be read word by word.
- total_sugars_g: the "Total Sugars" grams as printed, or null if not visible.
- added_sugars_g: the "Added Sugars" grams as printed (e.g. "Includes 6g Added Sugars" -> 6), or null if not visible. Never estimate it from total sugars. If the panel prints "0g", use 0.
- quantity_basis: what those grams are per, as printed: per_serving, per_100g or per_100ml; unknown if unclear or no panel.
- serving_size_text: the serving size as printed, or null.
- abv_text: the alcohol content or alcohol claim as printed anywhere on the label (e.g. "5% ABV", "12% alc./vol.", "<0.5% ABV", "0.0%", "Non-alcoholic", "Alcohol-free"), or null if none is printed.
- is_readable: false if the ingredient text is blurry, out of focus, too dark, washed out by glare, or too small to read with confidence. Never guess words you cannot read.
- is_food_label: false if the photo is not a food or drink label; then use nulls and false.`;

export const UNREADABLE = "The photo isn't clear enough to read. Hold steady, move closer to the ingredient list, and try again.";

export default {
  fetch: timed('scan-label', withSupabase({ auth: 'user' }, async (req, ctx) => {
    const timer = requestTimer();
    timer.mark('auth');
    const json = (body: Record<string, unknown>, status = 200) => Response.json({ ...body, timing: timer.snapshot() }, { status });
    if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

    let image: unknown;
    let scanId: unknown;
    let client: unknown;
    try {
      ({ image, scan_id: scanId, client } = await req.json());
    } catch {
      return json({ error: 'Body must be JSON' }, 400);
    }
    timer.mark('body');
    if (typeof scanId === 'string') timer.set({ scan_id: scanId.slice(0, 32) });
    timer.set(clientFields(client));
    if (!isJpegBase64(image)) {
      return json({ error: 'Send a JPEG photo as base64 in "image"' }, 400);
    }
    timer.set({ image_kb: imageKb(image) });

    // Each scan calls a paid model, so cap scans per account per day (SCAN_DAILY_LIMIT secret).
    const userId = ctx.userClaims?.id;
    if (!userId) return json({ error: 'Not signed in' }, 401);
    const allowed = await allow(ctx.supabaseAdmin, `label:${userId}`, 86_400, intSetting('SCAN_DAILY_LIMIT', 100));
    timer.mark('checks');
    if (!allowed) return tooMany();

    let reading: LiteralLabel;
    timer.mark('claude_start');
    // Logged up front so a reading that never returns still leaves a trace.
    console.log(JSON.stringify({ event: 'scan_label_claude_start', scan_id: typeof scanId === 'string' ? scanId.slice(0, 32) : undefined }));
    try {
      const response = await anthropic.beta.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        // Re-runs on a fallback model if a safety classifier declines the request.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: { type: 'json_schema', schema: LABEL_SCHEMA } },
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
              { type: 'text', text: 'Transcribe this label.' },
            ],
          },
        ],
      }, { signal: AbortSignal.timeout(CLAUDE_DEADLINE_MS) });
      timer.mark('claude_end');
      timer.set({
        claude_model: response.model,
        claude_in_tokens: response.usage?.input_tokens,
        claude_out_tokens: response.usage?.output_tokens,
        claude_stop: response.stop_reason,
      });

      if (response.stop_reason === 'refusal') return json({ error: "Couldn't read this photo. Try again." }, 422);
      const text = response.content.find((b) => b.type === 'text');
      if (!text || text.type !== 'text') throw new Error(`No text block (stop_reason ${response.stop_reason})`);
      reading = JSON.parse(text.text);
      timer.set({ is_food_label: reading.is_food_label, is_readable: reading.is_readable });
    } catch (err) {
      timer.mark('claude_end');
      timer.set({ claude_error: err instanceof Error ? err.message.slice(0, 200) : String(err) });
      console.error('label reading failed', err);
      const timedOut = err instanceof Error && /abort|timeout/i.test(`${err.name} ${err.message}`);
      return json({ error: 'The label reader is unavailable. Try again in a moment.', code: timedOut ? 'reader_timeout' : 'reader_unavailable' }, timedOut ? 504 : 502);
    }

    if (!reading.is_food_label) {
      return json({ error: "That doesn't look like a food label. Fit the ingredient list in the box.", verdict: 'RETRY', verdicts: VERDICT_SCHEME }, 422);
    }

    if (!reading.is_readable) {
      console.log('label unreadable');
      return json({ error: UNREADABLE, code: 'unreadable', verdict: 'RETRY', verdicts: VERDICT_SCHEME }, 422);
    }

    const decision = decide(reading);
    timer.mark('rules');
    const ev = decision.evaluation;
    timer.set({ rules_status: ev.status, rules_verdict: ev.verdict, rule: ev.ruleId, policy: ev.policyVersion, unresolved: ev.unresolved.length });
    // Unknown words that may sweeten are rated OKAY for now; the log is how they get added to the registry.
    if (ev.unknownSweeteners.length) {
      console.warn(JSON.stringify({ event: 'unknown_sweetener', names: ev.unknownSweeteners, rule: ev.ruleId, registry: ev.registryVersion }));
    }
    // Every ingredient the registry doesn't know; two or more keep the verdict from being CLEAN.
    if (ev.unresolved.length) {
      console.warn(JSON.stringify({
        event: 'unrecognised_ingredients', scan_id: typeof scanId === 'string' ? scanId.slice(0, 32) : undefined,
        names: ev.unresolved, rule: ev.ruleId, registry: ev.registryVersion,
      }));
    }

    if (decision.status === 'retry') {
      return json({ error: UNREADABLE, code: 'unreadable', verdict: 'RETRY', verdicts: VERDICT_SCHEME, analysis: ev }, 422);
    }
    const result = decision.result;
    return json({ result, verdicts: VERDICT_SCHEME });
  })),
};
