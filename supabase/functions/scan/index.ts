// One upload, one debit per model allowance, two incremental NDJSON outcomes.
import { withSupabase } from 'npm:@supabase/server@1.9.2';
import { allowScan, intSetting, isJpegBase64, tooMany } from '../_shared/guard.ts';
import { askJev } from '../_shared/jev.ts';
import { readLabel } from '../_shared/reader.ts';
import { env } from '../_shared/env.ts';
import { clientFields, imageKb, requestTimer, timed } from '../_shared/timing.ts';
import { clientTrace } from '../_shared/clientTrace.ts';

export default {
  fetch: timed('scan', withSupabase({ auth: 'user' }, async (req, ctx) => {
    const timer = requestTimer();
    timer.mark('auth');
    if (req.method !== 'POST') return Response.json({ error: 'Use POST' }, { status: 405 });
    let body;
    try { body = await req.json(); }
    catch { return Response.json({ error: 'Body must be JSON' }, { status: 400 }); }
    if (!body || typeof body !== 'object') return Response.json({ error: 'Body must be an object' }, { status: 400 });
    const userId = ctx.userClaims?.id;
    if (!userId) return Response.json({ error: 'Not signed in' }, { status: 401 });
    // Authenticated but free: neither variant invokes models or the limiter.
    if (body.action === 'warm') return Response.json({ ok: true });
    if (body.action === 'timing') {
      console.log(JSON.stringify({ event: 'scan_timing_client', ...clientTrace(body.trace) }));
      return Response.json({ ok: true });
    }
    timer.mark('body');
    const image = body.image;
    if (!isJpegBase64(image)) return Response.json({ error: 'Send a JPEG photo as base64 in "image"' }, { status: 400 });
    if (typeof body.scan_id === 'string') timer.set({ scan_id: body.scan_id.slice(0, 32) });
    timer.set(clientFields(body.client));
    timer.set({ image_kb: imageKb(image) });
    // Each model shares its legacy allowance, preventing extra paid calls via mixed clients.
    if (!await allowScan(ctx.supabaseAdmin, userId, intSetting('SCAN_DAILY_LIMIT', 100))) return tooMany();
    timer.mark('checks');
    const encoder = new TextEncoder();
    let disconnected = false;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: Record<string, unknown>) => {
          if (!disconnected) controller.enqueue(encoder.encode(JSON.stringify({ ...event, timing: timer.snapshot() }) + '\n'));
        };
        // Start the reader now, but always emit Jev first even if the reader wins.
        const reading = readLabel(image, timer).catch(() => ({
          body: { error: 'The label reader is unavailable. Try again in a moment.', code: 'reader_unavailable' },
          status: 502,
        }));
        timer.mark('jev_start');
        const jev = await askJev(image, env('TYPESAFE_API_KEY'));
        timer.mark('jev_end');
        send({ event: 'jev', jev });
        const outcome = await reading;
        send({ event: 'reading', ...outcome.body, status: outcome.status });
        timer.mark('stream_end');
        console.log(JSON.stringify({ event: 'scan_timing_complete', status: 200, ...timer.snapshot() }));
        if (!disconnected) controller.close();
      },
      cancel() { disconnected = true; },
    });
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
  })),
};
