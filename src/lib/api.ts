import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { JevVerdict, ScanResult } from '../types';
import { type CaptureMeta, type Photo, type Rect, toPixels } from './photo';
import { noteScan, scanTimingId } from './scanTiming';
import { supabase } from './supabase';
import { postScan } from './scanTransport';
import { requestScanStream, RetryableScanError, type ScanEvent } from './scanStream';

/** Reads the error message (and optional code) our Edge Functions send back, or a fallback. */
async function errorFrom(error: unknown, fallback: string): Promise<{ message: string; code?: string; timing?: unknown }> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().json();
      if (typeof body?.error === 'string') return { message: body.error, code: typeof body.code === 'string' ? body.code : undefined, timing: body.timing };
    } catch {}
  }
  return { message: fallback };
}

async function messageFrom(error: unknown, fallback: string) {
  return (await errorFrom(error, fallback)).message;
}

/** Thrown by readLabel when the photo is too blurry, dark or cut off to read. */
export class UnreadableError extends Error {}

/** Thrown by readLabel when the lists timed out, the connection dropped or the server failed: worth a retry. */
export class RetryableReadError extends Error {}

/** The verdict is already on screen by then, so the lists get a short leash. */
const LISTS_TIMEOUT_MS = 12_000;
const READ_FAILED = "Couldn't read the label. Try again.";

/** A single streamed upload, retaining the live reader's timeout and explicit lists retry. */
export async function streamScan(image: string, onEvent: (event: ScanEvent) => void, client?: CaptureMeta): Promise<boolean> {
  try {
    return await requestScanStream(
      (signal) => postScan({ image, scan_id: scanTimingId(), client }, signal),
      onEvent,
      LISTS_TIMEOUT_MS,
    );
  } catch (error) {
    if (error instanceof RetryableScanError) throw new RetryableReadError(error.message);
    throw error;
  }
}

/** Jev rejects any side over 1568 px or under 280 px. */
const MAX_SIDE = 1568;
const MIN_SIDE = 280;
const UPLOAD_QUALITY = 0.85;

/**
 * Crops the photo to the guide box (when known) so the label text gets the pixels, shrinks it so its
 * LONGEST side is at most 1568 px (portrait photos resized by width alone come out too tall), and
 * returns it as base64 JPEG. The full photo stays on screen; only this copy is uploaded.
 */
export async function preparePhoto(photo: Photo): Promise<string> {
  // The web camera already cropped, scaled and encoded the upload in one pass.
  if (photo.upload) return photo.upload;
  try {
    return await encodeForUpload(photo, photo.crop);
  } catch (e) {
    if (!photo.crop) throw e;
    return encodeForUpload(photo, undefined);
  }
}

async function encodeForUpload({ uri, width, height }: Photo, crop: Rect | undefined): Promise<string> {
  if (!width || !height) ({ width, height } = await ImageManipulator.manipulate(uri).renderAsync());
  const ctx = ImageManipulator.manipulate(uri);
  const rect = crop && toPixels(crop, width, height);
  if (rect && Math.min(rect.width, rect.height) >= MIN_SIDE) {
    ctx.crop(rect);
    ({ width, height } = rect);
  }
  if (Math.max(width, height) > MAX_SIDE) ctx.resize(height > width ? { height: MAX_SIDE } : { width: MAX_SIDE });
  const rendered = await ctx.renderAsync();
  noteScan({ upload_px: `${rendered.width}x${rendered.height}` });
  const { base64 } = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: UPLOAD_QUALITY, base64: true });
  if (!base64) throw new Error('Could not prepare the photo.');
  return base64;
}

/** Fast path: Jev makes the CLEAN / BAD / UGLY call straight from the photo. Never throws. */
export async function quickVerdict(image: string, client?: CaptureMeta): Promise<JevVerdict> {
  const { data, error } = await supabase.functions.invoke<{ jev: JevVerdict; timing?: unknown }>('quickgob-quick-verdict', {
    body: { image, scan_id: scanTimingId(), client },
  });
  if (error || !data?.jev) {
    const e = await errorFrom(error, 'quick-verdict failed');
    noteScan({ quick_verdict_server: e.timing, quick_verdict_error: e.message });
    return { status: 'unavailable', reason: e.message };
  }
  noteScan({ quick_verdict_server: data.timing });
  return data.jev;
}

/** Detail path: Claude lists the sugars, and the rules give a backstop verdict. */
export async function readLabel(image: string, client?: CaptureMeta): Promise<ScanResult> {
  const started = performance.now();
  const outcome = (result: string) => noteScan({ scan_label_outcome: result, scan_label_ms: Math.round(performance.now() - started) });
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      outcome('timeout');
      reject(new RetryableReadError(READ_FAILED));
    }, LISTS_TIMEOUT_MS);
  });

  const attempt = async (): Promise<ScanResult> => {
    const { data, error } = await supabase.functions.invoke<{ result: ScanResult; timing?: unknown }>('quickgob-scan-label', {
      body: { image, scan_id: scanTimingId(), client },
      signal: controller.signal,
    });
    if (controller.signal.aborted) throw new RetryableReadError(READ_FAILED);
    if (error instanceof FunctionsFetchError) {
      outcome('network');
      throw new RetryableReadError(READ_FAILED);
    }
    if (error || !data?.result) {
      const e = await errorFrom(error, READ_FAILED);
      const status = error instanceof FunctionsHttpError || error instanceof FunctionsRelayError ? error.context.status : 0;
      outcome(status ? `http_${status}` : 'error');
      noteScan({ scan_label_server: e.timing, scan_label_error: e.code ?? e.message });
      if (e.code === 'unreadable') throw new UnreadableError(e.message);
      throw status >= 500 || error instanceof FunctionsRelayError ? new RetryableReadError(READ_FAILED) : new Error(e.message);
    }
    outcome('ok');
    noteScan({ scan_label_server: data.timing });
    return data.result;
  };

  try {
    return await Promise.race([attempt(), deadline]);
  } finally {
    clearTimeout(timer);
  }
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
