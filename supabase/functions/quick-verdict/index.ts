// POST { image: <base64 JPEG> }  →  { jev: JevVerdict } | { error: string }
// Signed-in users only. The fast path: Jev reads the label photo and makes the CLEAN / BAD / UGLY
// call in one request. The app calls this and scan-label (ingredient lists) at the same time and
// shows the verdict as soon as this one answers.
import { withSupabase } from 'npm:@supabase/server@1.9.2';
import { askJev } from '../_shared/jev.ts';
import { env } from '../_shared/env.ts';
import { allow, intSetting, isJpegBase64, tooMany } from '../_shared/guard.ts';

const json = (body: unknown, status = 200) => Response.json(body, { status });

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

    let image: unknown;
    try {
      ({ image } = await req.json());
    } catch {
      return json({ error: 'Body must be JSON' }, 400);
    }
    if (!isJpegBase64(image)) {
      return json({ error: 'Send a JPEG photo as base64 in "image"' }, 400);
    }

    // Each scan calls a paid model, so cap scans per account per day (SCAN_DAILY_LIMIT secret).
    const userId = ctx.userClaims?.id;
    if (!userId) return json({ error: 'Not signed in' }, 401);
    if (!(await allow(ctx.supabaseAdmin, `verdict:${userId}`, 86_400, intSetting('SCAN_DAILY_LIMIT', 100)))) return tooMany();

    const started = Date.now();
    const jev = await askJev(image, env('TYPESAFE_API_KEY'));
    const ms = Date.now() - started;
    if (jev.status === 'unavailable') console.warn('jev unavailable', { reason: jev.reason, ms });
    else console.log('jev', { status: jev.status, ms, ...((jev.status === 'decided' || jev.status === 'unsure') ? { verdict: jev.verdict, confidence: jev.confidence } : {}) });

    return json({ jev });
  }),
};
