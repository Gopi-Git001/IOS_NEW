// POST (no body, user's Bearer token) → { deleted: true } once the caller's Auth user is really gone.
// Published as the `quickgob-delete-account` slug (supabase/config.toml), which is what the app calls.
// Deployed with --no-verify-jwt: handleDelete verifies the caller's token itself (auth.getUser) before deleting.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { env } from '../_shared/env.ts';
import { handleDelete } from './handler.ts';

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return handleDelete(
    req,
    {
      getUser: async (jwt) => {
        const { data, error } = await admin.auth.getUser(jwt);
        return { user: data.user, error };
      },
      // shouldSoftDelete = false: a hard delete removes the user, its identities and sessions.
      deleteUser: async (id) => ({ error: (await admin.auth.admin.deleteUser(id, false)).error }),
      getUserById: async (id) => {
        const { data, error } = await admin.auth.admin.getUserById(id);
        return { user: data.user, error };
      },
      logError: (message, detail) => console.error(message, detail),
    },
    cors,
  );
});
