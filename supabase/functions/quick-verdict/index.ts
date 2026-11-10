// POST { image: <base64 JPEG>, scan_id?: string }  →  { jev: JevVerdict, timing } | { error: string, timing }
// Signed-in users only. The fast path: Jev reads the label photo and makes the CLEAN / OKAY / BAD
// call in one request. The app calls this and scan-label (ingredient lists) at the same time and
// shows one verdict once both have answered (or Jev's 6 s timeout passes).
import { withSupabase } from 'npm:@supabase/server@1.9.2';
import { askJev } from '../_shared/jev.ts';
import { env } from '../_shared/env.ts';
import { allow, intSetting, isJpegBase64, tooMany } from '../_shared/guard.ts';
import { padForJev } from '../_shared/pad.ts';
import { VERDICT_SCHEME } from '../_shared/rules.ts';
import { clientFields, imageKb, requestTimer, timed } from '../_shared/timing.ts';

export default {
  fetch: timed('quick-verdict', withSupabase({ auth: 'user' }, async (req, ctx) => {
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
    const allowed = await allow(ctx.supabaseAdmin, `verdict:${userId}`, 86_400, intSetting('SCAN_DAILY_LIMIT', 100));
    timer.mark('checks');
    if (!allowed) return tooMany();

    const prepared = padForJev(image);
    if (prepared.padded) timer.set({ jev_padded: `${prepared.from}->${prepared.to}` });
    timer.mark('jev_start');
    const jev = await askJev(prepared.image, env('TYPESAFE_API_KEY'));
    timer.mark('jev_end');
    timer.set({
      jev_status: jev.status,
      ...((jev.status === 'decided' || jev.status === 'unsure') ? { jev_verdict: jev.verdict, jev_confidence: jev.confidence } : {}),
      ...(jev.status === 'unavailable' ? { jev_reason: jev.reason } : {}),
    });

    return json({ jev, verdicts: VERDICT_SCHEME });
  })),
};
