// Shared setup for the Edge Function tests. Local stack only: run through `npm run test:functions`,
// which starts `supabase functions serve` with _tests/.env.test and passes the local URL and keys.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

function required(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} is not set; run the tests with npm run test:functions`);
  return v;
}

export const SUPABASE_URL = required('SUPABASE_URL');
export const ANON_KEY = required('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = required('SUPABASE_SERVICE_ROLE_KEY');

const host = new URL(SUPABASE_URL).hostname;
if (!['127.0.0.1', 'localhost'].includes(host)) throw new Error(`Refusing to run against ${host}: local stack only`);

/** Must match ANTHROPIC_BASE_URL in .env.test. */
export const FAKE_CLAUDE_PORT = 54399;

/** A real 16×16 JPEG, base64. */
export const JPEG =
  '/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABQb/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCiAJki/9k=';

export const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const anonClient = () => createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

export type TestUser = { id: string; token: string };

/** A confirmed email user with a fresh access token. */
export async function makeUser(): Promise<TestUser> {
  const email = `fn-test-${crypto.randomUUID()}@test.local`;
  const password = `pw-${crypto.randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  const signedIn = await anonClient().auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error('no session');
  return { id: created.data.user.id, token: signedIn.data.session.access_token };
}

export async function dropUser(user: TestUser | string) {
  await admin.auth.admin.deleteUser(typeof user === 'string' ? user : user.id);
}

/** Fills today's window so the next scan for `key` is over the daily limit. */
export async function exhaustLimit(key: string) {
  const day = 86_400_000;
  const { error } = await admin.from('quickgob_rate_limits').upsert({
    key,
    window_start: new Date(Math.floor(Date.now() / day) * day).toISOString(),
    hits: 1_000_000,
  });
  if (error) throw error;
}

type CallOptions = { token?: string; body?: unknown; rawBody?: string; method?: string; headers?: Record<string, string> };

/** Calls a deployed slug on the local functions server; always reads the body. */
export async function call(slug: string, { token, body, rawBody, method = 'POST', headers = {} }: CallOptions = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method,
    headers: {
      apikey: ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined || rawBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Not JSON (e.g. "ok" from a CORS preflight).
  }
  return { status: res.status, headers: res.headers, text, json };
}
