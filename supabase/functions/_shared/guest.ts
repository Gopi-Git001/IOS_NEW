import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';
import { allow, allowScan, intSetting, tooMany } from './guard.ts';
import { env } from './env.ts';

type Claims = { id: string; email?: string; appMetadata?: Record<string, unknown> };
type Model = 'label' | 'verdict';
export type GuestQuota = { limit: number; remaining: number };

/** Only signed, server-owned metadata and the reserved legacy email domain identify guests. */
export function isGuest(claims: Omit<Claims, 'id'>): boolean {
  return claims.appMetadata?.guest === true || /@guest\.sugarhunter\.app$/i.test(claims.email ?? '');
}

export const guestLimit = () => Math.min(intSetting('GUEST_SCAN_LIMIT', 3), 100);
const keyFor = (id: string, model: Model) => `guest:${model}:${id}`;
// The existing RPC deletes windows older than two days. Lifetime slots must survive that
// cleanup: use a reserved future sentinel, not a rolling/day/epoch window. No schema change.
const slotTime = (slot: number) => `9999-01-01T00:${String(Math.floor(slot / 60)).padStart(2, '0')}:${String(slot % 60).padStart(2, '0')}Z`;

/** Unique PK inserts atomically reserve at most `limit` calls, including concurrent requests. */
export async function reserveGuestModel(admin: SupabaseClient, id: string, model: Model, limit: number): Promise<boolean> {
  for (let slot = 0; slot < limit; slot++) {
    const { error } = await admin.from('quickgob_rate_limits').insert({ key: keyFor(id, model), window_start: slotTime(slot), hits: 1 });
    if (!error) return true;
    if (error.code !== '23505') throw new Error('Guest allowance unavailable');
  }
  return false;
}

export async function guestQuota(admin: SupabaseClient, id: string, limit: number): Promise<GuestQuota | null> {
  const { data, error } = await admin.from('quickgob_rate_limits').select('key')
    .in('key', [keyFor(id, 'label'), keyFor(id, 'verdict')]);
  if (error || !data) return null;
  const used = Math.max(
    data.filter((row) => row.key === keyFor(id, 'label')).length,
    data.filter((row) => row.key === keyFor(id, 'verdict')).length,
  );
  return { limit, remaining: Math.max(0, limit - used) };
}

export const guestDenied = (code = 'guest_limit') => Response.json({
  error: code === 'guest_disabled' ? 'Sign in with Google to start scanning.' : 'Your free scans are used. Sign in with Google to keep scanning.',
  code,
}, { status: 403 });

/** Shared by ALL paid routes. Warm/status/timing never enter this function. */
export async function reserveScan(admin: SupabaseClient, claims: Claims, model?: Model): Promise<Response | null> {
  if (isGuest(claims)) {
    if (env('GUEST_SIGNIN') !== 'on') return guestDenied('guest_disabled');
    // Every paid guest request spends a WHOLE trial slot, even a single legacy model call.
    // Reserving both in the same order gives unified, legacy and retry one shared ceiling.
    const models: Model[] = ['label', 'verdict'];
    try {
      for (const name of models) {
        if (!await reserveGuestModel(admin, claims.id, name, guestLimit())) return guestDenied();
      }
    } catch {
      return Response.json({ error: 'Free scans are unavailable. Sign in with Google.', code: 'guest_unavailable' }, { status: 503 });
    }
    return null;
  }
  const limit = intSetting('SCAN_DAILY_LIMIT', 100);
  const allowed = model
    ? await allow(admin, `${model}:${claims.id}`, 86_400, limit)
    : await allowScan(admin, claims.id, limit);
  return allowed ? null : tooMany();
}

/** Require the hosting ingress to overwrite this header; never trust arbitrary XFF fallbacks. */
export async function guestIpKey(headers: Headers, salt: string | undefined): Promise<string | null> {
  const ip = headers.get('cf-connecting-ip')?.trim().toLowerCase();
  if (!salt || !ip || ip.length > 64 || !/^[0-9a-f:.]+$/.test(ip)) return null;
  // URL normalizes equivalent IPv6 spellings, preventing textual aliases of one address.
  let canonical: string;
  try { canonical = new URL(ip.includes(':') ? `http://[${ip}]` : `http://${ip}`).hostname; }
  catch { return null; }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(canonical));
  return `guest:ip:${Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join('')}`;
}

export async function reserveGuestCreation(admin: SupabaseClient, headers: Headers): Promise<'unavailable' | 'limited' | null> {
  const ipKey = await guestIpKey(headers, env('GUEST_IP_SALT'));
  if (!ipKey) return 'unavailable';
  if (!await allow(admin, ipKey, 3_600, intSetting('GUEST_IP_HOURLY_LIMIT', 3))) return 'limited';
  if (!await allow(admin, 'guest:create', 3_600, intSetting('GUEST_HOURLY_LIMIT', 20))) return 'limited';
  return null;
}
