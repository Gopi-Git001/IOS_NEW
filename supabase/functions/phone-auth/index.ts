// Guest sign-in for testing builds (EXPO_PUBLIC_GUEST_MODE=1). Real sign-in is Google via Supabase Auth.
// POST { action: 'guest' } -> { token_hash }   a fresh hidden account with no identity check
//
// Off unless the GUEST_SIGNIN secret is "on", and capped at GUEST_HOURLY_LIMIT new guests per hour
// across everyone, because each guest can run paid scans.
// (The old SMS sign-in through Twilio was removed: the app no longer uses it, and an open SMS
// endpoint invites SMS-pumping fraud. The slug stays quickgob-phone-auth so testing builds keep working.)
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { env } from '../_shared/env.ts';
import { allow, intSetting } from '../_shared/guard.ts';

const DEFAULT_ORIGINS = ['https://app.sugardepth.com', 'https://quickgob-web.vercel.app', 'http://localhost:8081'];

function corsFor(req: Request): Record<string, string> {
  const allowed = (env('ALLOWED_ORIGINS')?.split(',').map((o) => o.trim()).filter(Boolean)) ?? DEFAULT_ORIGINS;
  const origin = req.headers.get('Origin');
  return {
    ...(origin && allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  let input: { action?: string };
  try {
    input = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  if (input.action !== 'guest') return json({ error: 'Unknown action' }, 400);
  if (env('GUEST_SIGNIN') !== 'on') return json({ error: 'Guest sign-in is off.' }, 403);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!(await allow(admin, 'guest:create', 3_600, intSetting('GUEST_HOURLY_LIMIT', 20)))) {
    return json({ error: 'Too many test sessions right now. Try again later.' }, 429);
  }

  const email = `guest-${crypto.randomUUID()}@guest.sugarhunter.app`;
  const created = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { app: 'sugar-hunter', guest: true } });
  if (created.error) {
    console.error('create guest failed', created.error.message);
    return json({ error: 'Could not start a test session. Try again.' }, 500);
  }
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const token_hash = link.data?.properties?.hashed_token;
  if (link.error || !token_hash) {
    console.error('generate link failed', link.error?.message);
    return json({ error: 'Could not start a test session. Try again.' }, 500);
  }
  return json({ token_hash });
});
