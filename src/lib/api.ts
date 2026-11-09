import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { JevVerdict, ScanResult } from '../types';
import { supabase } from './supabase';

/** Reads the error message (and optional code) our Edge Functions send back, or a fallback. */
async function errorFrom(error: unknown, fallback: string): Promise<{ message: string; code?: string }> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().json();
      if (typeof body?.error === 'string') return { message: body.error, code: typeof body.code === 'string' ? body.code : undefined };
    } catch {}
  }
  return { message: fallback };
}

async function messageFrom(error: unknown, fallback: string) {
  return (await errorFrom(error, fallback)).message;
}

/** Thrown by readLabel when the photo is too blurry, dark or cut off to read. */
export class UnreadableError extends Error {}

const MAX_SIDE = 1280;

/**
 * Shrinks the photo once so its LONGEST side is 1280 px (Jev rejects any side over 1568 px, and
 * portrait phone photos resized by width alone came out 1280x1707) and returns it as base64 JPEG.
 */
export async function preparePhoto(photoUri: string): Promise<string> {
  const original = await ImageManipulator.manipulate(photoUri).renderAsync();
  const portrait = original.height > original.width;
  const longest = Math.max(original.width, original.height);
  const ctx = ImageManipulator.manipulate(photoUri);
  if (longest > MAX_SIDE) ctx.resize(portrait ? { height: MAX_SIDE } : { width: MAX_SIDE });
  const rendered = await ctx.renderAsync();
  const { base64 } = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!base64) throw new Error('Could not prepare the photo.');
  return base64;
}

/** Fast path: Jev makes the CLEAN / BAD / UGLY call straight from the photo. Never throws. */
export async function quickVerdict(image: string): Promise<JevVerdict> {
  const { data, error } = await supabase.functions.invoke<{ jev: JevVerdict }>('quickgob-quick-verdict', { body: { image } });
  if (error || !data?.jev) return { status: 'unavailable', reason: await messageFrom(error, 'quick-verdict failed') };
  return data.jev;
}

/** Detail path: Claude lists the sugars, and the rules give a backstop verdict. */
export async function readLabel(image: string): Promise<ScanResult> {
  const { data, error } = await supabase.functions.invoke<{ result: ScanResult }>('quickgob-scan-label', { body: { image } });
  if (error || !data?.result) {
    const e = await errorFrom(error, "Couldn't read the label. Try again.");
    throw e.code === 'unreadable' ? new UnreadableError(e.message) : new Error(e.message);
  }
  return data.result;
}

export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('quickgob-delete-account', { method: 'POST' });
  if (error) throw new Error(await messageFrom(error, 'Could not delete account. Try again.'));
  // The account is gone; drop the local session too.
  await supabase.auth.signOut({ scope: 'local' });
}

/** Testing builds skip phone verification: set EXPO_PUBLIC_GUEST_MODE=1 at build time. */
export const guestMode = process.env.EXPO_PUBLIC_GUEST_MODE === '1';

/** Starts a test session with no phone check (the server must also allow it). Returns an error message or null. */
export async function signInAsGuest(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{ token_hash: string }>('quickgob-phone-auth', { body: { action: 'guest' } });
  if (error || !data?.token_hash) return messageFrom(error, 'Could not start a test session.');
  const { error: authError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'email' });
  return authError ? 'Could not start a test session.' : null;
}

const NATIVE_REDIRECT = 'reallabel://auth';

/**
 * Google sign-in through Supabase Auth (free; no SMS). Returns an error message, or null when it
 * started (web: the page leaves for Google and comes back signed in) or the person cancelled (phones).
 */
export async function signInWithGoogle(): Promise<string | null> {
  const failed = 'Could not open Google sign-in. Try again.';
  if (Platform.OS === 'web') {
    const back = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back } });
    return error ? failed : null;
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return failed;
  const result = await WebBrowser.openAuthSessionAsync(data.url, NATIVE_REDIRECT);
  if (result.type !== 'success') return null;
  const code = new URL(result.url).searchParams.get('code');
  if (!code) return 'Google sign-in was cancelled.';
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  return exchangeError ? 'Could not sign you in. Try again.' : null;
}

/** On the web, Google sends people back with ?error=... when they cancel or something fails. */
export function takeAuthRedirectError(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''));
  if (!params.get('error')) return null;
  window.history.replaceState(null, '', window.location.pathname);
  return params.get('error') === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google sign-in failed. Try again.';
}
