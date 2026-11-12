// POST { image: <base64 JPEG>, scan_id?: string }  ->  { result: ScanResult, timing } | { error: string, code?: string, timing }
// Signed-in users only. Stage 1 (extraction): Claude vision copies the label literally, with no
// sorting and no verdict. Stages 2-4 (normalize, classify, policy) run in _shared/rules.ts.
// Runs alongside quick-verdict (Jev), which makes the actual CLEAN / OKAY / BAD call.
import { isJpegBase64 } from '../_shared/guard.ts';
import { reserveScan } from '../_shared/guest.ts';
import { withSupabase } from 'npm:@supabase/server@1.9.2';
import { readLabel, UNREADABLE } from '../_shared/reader.ts';
import { clientFields, imageKb, requestTimer, timed } from '../_shared/timing.ts';

export { UNREADABLE };

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
    const denied = await reserveScan(ctx.supabaseAdmin, ctx.userClaims!, 'label');
    timer.mark('checks');
    if (denied) return denied;

    const outcome = await readLabel(image, timer);
    return json(outcome.body, outcome.status);
  })),
};
