// Phone sign-in without Supabase's SMS provider settings: Twilio Verify sends and checks the code,
// then we hand the app a one-time token it trades for a normal Supabase session.
// POST { action: 'send', phone } -> { sent: true }
// POST { action: 'verify', phone, code } -> { token_hash }
// POST { action: 'guest' } -> { token_hash }   (testing only: a fresh account with no phone check)
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { env } from '../_shared/env.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const E164 = /^\+[1-9]\d{7,14}$/;

async function twilio(path: 'Verifications' | 'VerificationCheck', form: Record<string, string>) {
  const sid = env('TWILIO_ACCOUNT_SID');
  const token = env('TWILIO_AUTH_TOKEN');
  const service = env('TWILIO_VERIFY_SERVICE_SID');
  if (!sid || !token || !service) throw new Error('SMS is not set up yet.');
  const res = await fetch(`https://verify.twilio.com/v2/Services/${service}/${path}`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

// Each phone number maps to one hidden email so we can mint a session with the admin API.
const emailFor = (phone: string) => `p${phone.slice(1)}@phone.sugarhunter.app`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  let input: { action?: string; phone?: string; code?: string };
  try {
    input = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  const admin = () =>
    createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  const tokenFor = async (email: string) => {
    const link = await admin().auth.admin.generateLink({ type: 'magiclink', email });
    const token_hash = link.data?.properties?.hashed_token;
    if (link.error || !token_hash) console.error('generate link failed', link.error?.message);
    return token_hash ?? null;
  };

  // Testing: skip phone verification. Each guest gets a new hidden account; the app keeps the session.
  if (input.action === 'guest') {
    if (env('GUEST_SIGNIN') !== 'on') return json({ error: 'Guest sign-in is off.' }, 403);
    const email = `guest-${crypto.randomUUID()}@guest.sugarhunter.app`;
    const created = await admin().auth.admin.createUser({ email, email_confirm: true, user_metadata: { app: 'sugar-hunter', guest: true } });
    if (created.error) {
      console.error('create guest failed', created.error.message);
      return json({ error: 'Could not start a test session. Try again.' }, 500);
    }
    const token_hash = await tokenFor(email);
    return token_hash ? json({ token_hash }) : json({ error: 'Could not start a test session. Try again.' }, 500);
  }

  const phone = String(input.phone ?? '').replace(/[\s()-]/g, '');
  if (!E164.test(phone)) return json({ error: 'Enter your full number with country code.' }, 400);

  try {
    if (input.action === 'send') {
      const r = await twilio('Verifications', { To: phone, Channel: 'sms' });
      if (!r.ok) {
        console.error('twilio send failed', r.status, r.body?.code, r.body?.message);
        const msg = r.body?.code === 21608 || r.body?.code === 21614
          ? 'This test SMS account can only text verified numbers.'
          : 'Could not send the code. Check the number and try again.';
        return json({ error: msg }, 400);
      }
      return json({ sent: true });
    }

    if (input.action === 'verify') {
      const code = String(input.code ?? '');
      if (!/^\d{4,10}$/.test(code)) return json({ error: 'Enter the code from the text.' }, 400);
      const r = await twilio('VerificationCheck', { To: phone, Code: code });
      if (!r.ok || r.body?.status !== 'approved') return json({ error: 'That code is wrong or expired.' }, 400);

      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const email = emailFor(phone);
      const created = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { phone, app: 'sugar-hunter' },
      });
      if (created.error && !/already|registered|exists/i.test(created.error.message)) {
        console.error('create user failed', created.error.message);
        return json({ error: 'Could not sign you in. Try again.' }, 500);
      }
      const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
      const token_hash = link.data?.properties?.hashed_token;
      if (link.error || !token_hash) {
        console.error('generate link failed', link.error?.message);
        return json({ error: 'Could not sign you in. Try again.' }, 500);
      }
      return json({ token_hash });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('phone-auth error', e);
    return json({ error: e instanceof Error && e.message === 'SMS is not set up yet.' ? e.message : 'Something went wrong.' }, 500);
  }
});
