// POST { image: <base64 JPEG> }  →  { result: ScanResult } | { error: string }
// Signed-in users only. Claude vision lists the sugars on the label and the rules give a backstop
// verdict. Runs alongside quick-verdict (Jev), which makes the actual CLEAN / BAD / UGLY call.
import Anthropic from 'npm:@anthropic-ai/sdk@1.4.0';
import { withSupabase } from 'npm:@supabase/server@1.9.2';
import { decide, type LabelReading } from '../_shared/rules.ts';

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

// Override with the CLAUDE_MODEL secret, e.g. a faster model if the lists feel slow.
const CLAUDE_MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-opus-5-5';

const MAX_IMAGE_BASE64 = 6_000_000; // ~4.5 MB JPEG; the app sends ~0.3 MB

const list = { type: 'array', items: { type: 'string' } };

const LABEL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'is_food_label', 'natural_sugars', 'added_sugars', 'artificial_sweeteners',
    'sugar_alcohols', 'other_sweeteners', 'contains_alcohol', 'added_sugar_grams',
  ],
  properties: {
    is_food_label: { type: 'boolean' },
    natural_sugars: list,
    added_sugars: list,
    artificial_sweeteners: list,
    sugar_alcohols: list,
    other_sweeteners: list,
    contains_alcohol: { type: 'boolean' },
    added_sugar_grams: { anyOf: [{ type: 'number' }, { type: 'null' }] },
  },
};

const SYSTEM = `You read photos of food and drink labels for a sugar-checking app.
Find the ingredient list (and the nutrition panel if it is visible) and sort every sugar or sweetener you see.

- natural_sugars: sugars that come with whole ingredients, e.g. lactose in milk, fructose in whole fruit.
- added_sugars: sugars and syrups added as ingredients, e.g. sugar, sucrose, cane sugar, glucose syrup, corn syrup, dextrose, honey, maple syrup, molasses, fruit juice concentrate used to sweeten.
- artificial_sweeteners: aspartame, sucralose, acesulfame K, saccharin, neotame, advantame, cyclamate (and their E-numbers). Never list these as added sugars.
- sugar_alcohols: erythritol, xylitol, sorbitol, maltitol, mannitol, isomalt, lactitol. Never list these as added sugars.
- other_sweeteners: stevia / steviol glycosides, monk fruit, allulose, thaumatin.
- contains_alcohol: true only if the product contains drinking alcohol (beer, wine, spirits, or an ABV is shown).
- added_sugar_grams: grams of ADDED sugar per serving, e.g. from "Includes 6g Added Sugars". Use null if it is not shown. Do not guess from total sugars.

Use the ingredient names as printed, in title case, without percentages.
Only report what you can actually read. If the photo is not a food or drink label, set is_food_label to false and leave the lists empty.`;

const json = (body: unknown, status = 200) => Response.json(body, { status });

export default {
  fetch: withSupabase({ auth: 'user' }, async (req) => {
    if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

    let image: unknown;
    try {
      ({ image } = await req.json());
    } catch {
      return json({ error: 'Body must be JSON' }, 400);
    }
    if (typeof image !== 'string' || image.length < 100 || image.length > MAX_IMAGE_BASE64) {
      return json({ error: 'Send a JPEG photo as base64 in "image"' }, 400);
    }

    let reading: LabelReading;
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
              { type: 'text', text: 'Read the sugars on this label.' },
            ],
          },
        ],
      });

      if (response.stop_reason === 'refusal') return json({ error: "Couldn't read this photo. Try again." }, 422);
      const text = response.content.find((b) => b.type === 'text');
      if (!text || text.type !== 'text') throw new Error(`No text block (stop_reason ${response.stop_reason})`);
      reading = JSON.parse(text.text);
    } catch (err) {
      console.error('label reading failed', err);
      return json({ error: 'The label reader is unavailable. Try again in a moment.' }, 502);
    }

    if (!reading.is_food_label) {
      return json({ error: "That doesn't look like a food label. Fit the ingredient list in the box." }, 422);
    }

    const result = decide(reading);

    return json({ result });
  }),
};
