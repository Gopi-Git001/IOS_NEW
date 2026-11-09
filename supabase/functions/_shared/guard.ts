// Shared request guards for the Edge Functions: image validation and per-key rate limits.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';
import { env } from './env.ts';

export const MAX_IMAGE_BASE64 = 6_000_000; // ~4.5 MB JPEG; the app sends ~0.3 MB

/** True when `image` is a plausible base64 JPEG (size bounds, base64 alphabet, JPEG magic bytes). */
export function isJpegBase64(image: unknown): image is string {
  if (typeof image !== 'string' || image.length < 100 || image.length > MAX_IMAGE_BASE64) return false;
  // Every JPEG starts with FF D8 FF, which is "/9j/" in base64.
  if (!image.startsWith('/9j/')) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(image.slice(0, 4096));
}

/** Reads a positive integer setting from secrets, or the default. */
export function intSetting(name: string, fallback: number): number {
  const n = Number(env(name));
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/**
 * Counts one hit against `key` in the current window and says whether it is allowed.
 * Backed by public.quickgob_rate_limit (service role only). Fails closed: if the limiter
 * can't be reached, the request is refused rather than letting paid model calls run unmetered.
 */
export async function allow(admin: SupabaseClient, key: string, windowSeconds: number, limit: number): Promise<boolean> {
  const { data, error } = await admin.rpc('quickgob_rate_limit', { p_key: key, p_window_seconds: windowSeconds, p_limit: limit });
  if (error) {
    console.error('rate limit check failed', error.message);
    return false;
  }
  return data === true;
}

export const tooMany = () =>
  Response.json({ error: "You've hit today's scan limit. Try again tomorrow.", code: 'rate_limited' }, { status: 429 });
