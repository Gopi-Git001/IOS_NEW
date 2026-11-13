import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { JevVerdict, ScanResult } from '../types';
import { type CaptureMeta, type Photo, type Rect, toPixels, UPLOAD_MAX_SIDE, UPLOAD_MIN_SIDE } from './photo';
import { markScan, noteScan, scanTimingId } from './scanTiming';
import { supabase } from './supabase';
import { postScan } from './scanTransport';
import { requestScanStream, RetryableScanError, type ScanEvent } from './scanStream';
import { normalizeJev, normalizeResult } from './verdicts';
import { parseGuestQuota } from './guestTrial';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { buildNativeRedirect, parseAuthResult, redactUrl } from './authRedirect';

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

/** The verdict waits for the lists, so they get a short leash. */
const LISTS_TIMEOUT_MS = 12_000;
const READ_FAILED = "Couldn't read the label. Try again.";

/** A single streamed upload, retaining the live reader's timeout and explicit lists retry. */
export async function streamScan(image: string, onEvent: (event: ScanEvent) => void, client?: CaptureMeta): Promise<boolean> {
  try {
    return await requestScanStream(
      async (signal) => {
        const response = await postScan({ image, scan_id: scanTimingId(), client }, signal, markScan);
        // `whole`: this runtime buffers the body, so both answers arrive together at the end.
        const incremental = typeof TextDecoder !== 'undefined' && typeof response.body?.getReader === 'function';
        noteScan({ stream_status: response.status, stream_body: incremental ? 'incremental' : 'whole' });
        return response;
      },
      onEvent,
      LISTS_TIMEOUT_MS,
    );
  } catch (error) {
    if (error instanceof RetryableScanError) throw new RetryableReadError(error.message);
    throw error;
  }
}

/** Jev rejects any side over 1568 px or under 280 px (one source of truth in photo.ts). */
const MAX_SIDE = UPLOAD_MAX_SIDE;
const MIN_SIDE = UPLOAD_MIN_SIDE;
const UPLOAD_QUALITY = 0.85;

/**
 * Crops the photo to the guide box (when known) so the label text gets the pixels, shrinks it so its
 * LONGEST side is at most 1568 px (portrait photos resized by width alone come out too tall), and
 * returns it as base64 JPEG. The full photo stays on screen; only this copy is uploaded.
 */
export async function preparePhoto(photo: Photo): Promise<string> {
  // The web camera already cropped, scaled and encoded the upload in one pass.
  if (photo.upload) return photo.upload;
  const started = performance.now();
  try {
    return await encodeForUpload(photo, photo.crop);
  } catch (e) {
    if (!photo.crop) throw e;
    noteScan({ crop_failed: true });
    return encodeForUpload(photo, undefined);
  } finally {
    noteScan({ prepare_ms: Math.round(performance.now() - started) });
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
  const t0 = performance.now();
  const rendered = await ctx.renderAsync();
  const t1 = performance.now();
  noteScan({ upload_px: `${rendered.width}x${rendered.height}`, crop_resize_ms: Math.round(t1 - t0) });
  const { base64 } = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: UPLOAD_QUALITY, base64: true });
  noteScan({ encode_ms: Math.round(performance.now() - t1) });
  if (!base64) throw new Error('Could not prepare the photo.');
  noteScan({ upload_bytes: Math.round((base64.length * 3) / 4) });
  return base64;
}

/** Fast path: Jev makes the CLEAN / OKAY / BAD call straight from the photo. Never throws. */
export async function quickVerdict(image: string, client?: CaptureMeta): Promise<JevVerdict> {
  markScan('legacy_request_start');
  const { data, error } = await supabase.functions.invoke<{ jev: JevVerdict; verdicts?: string; timing?: unknown }>('quickgob-quick-verdict', {
    body: { image, scan_id: scanTimingId(), client },
  });
  if (error || !data?.jev) {
    const e = await errorFrom(error, 'quick-verdict failed');
    noteScan({ quick_verdict_server: e.timing, quick_verdict_error: e.message });
    return { status: 'unavailable', reason: e.message };
  }
  noteScan({ quick_verdict_server: data.timing });
  return normalizeJev(data.jev, data.verdicts);
}

/** Detail path: Claude lists the sugars, and the rules give a backstop verdict. */
export async function readLabel(image: string, client?: CaptureMeta): Promise<ScanResult> {
  markScan('legacy_request_start');
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
    const { data, error } = await supabase.functions.invoke<{ result: ScanResult; verdicts?: string; timing?: unknown }>('quickgob-scan-label', {
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
    const result = normalizeResult(data.result, data.verdicts);
    if (!result) {
      outcome('bad_verdict');
      throw new Error(READ_FAILED);
    }
    outcome('ok');
    noteScan({ scan_label_server: data.timing });
    return result;
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
/** Visitor trial is web-only, independently opt-in, and also requires server consent. */
export const guestTrialFlag = Platform.OS === 'web' && process.env.EXPO_PUBLIC_GUEST_SCANS === '1';

export async function guestConfig() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const { data, error } = await supabase.functions.invoke('quickgob-phone-auth', { body: { action: 'guest_config' }, signal: controller.signal });
    return !error && data?.enabled === true ? parseGuestQuota({ limit: data.limit, remaining: data.limit }) : null;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

export async function getGuestQuota() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await postScan({ action: 'guest_status' }, controller.signal);
    return response.ok ? parseGuestQuota(await response.json()) : null;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

/** Starts an opt-in guest session (the server must also allow it). Returns an error message or null. */
export async function signInAsGuest(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{ token_hash: string }>('quickgob-phone-auth', { body: { action: 'guest' } });
  if (error || !data?.token_hash) return messageFrom(error, 'Free scans are unavailable. Sign in with Google.');
  const { error: authError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'email' });
  return authError ? 'Free scans are unavailable. Sign in with Google.' : null;
}

/**
 * Expo Go (iOS + Android): exp://<host>/--/auth from expo-linking; native builds: reallabel://auth.
 * Read at sign-in time so a changed LAN / tunnel host is picked up. See authRedirect.ts.
 */
function nativeRedirect(): string {
  return buildNativeRedirect({
    os: Platform.OS,
    appOwnership: Constants.appOwnership,
    executionEnvironment: Constants.executionEnvironment,
    expoGoUrl: Linking.createURL('auth'),
  });
}

/**
 * Google sign-in through Supabase Auth (free; no SMS). Returns an error message, or null when it
 * started (web: the page leaves for Google and comes back signed in) or the person closed the
 * sign-in sheet (phones). An ?error= redirect is a failure message, never silent.
 */
export async function signInWithGoogle(): Promise<string | null> {
  const failed = 'Could not open Google sign-in. Try again.';
  if (Platform.OS === 'web') {
    const back = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back } });
    return error ? failed : null;
  }
  const redirect = nativeRedirect();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirect, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return failed;
  if (__DEV__) console.log('[auth] redirect', redirect);
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirect);
  if (__DEV__) console.log('[auth] result', result.type);
  const outcome = parseAuthResult(result);
  if (outcome.kind === 'cancel') return null;
  if (outcome.kind === 'error') {
    // Never log the code, tokens or full URL: only the URL without its query / fragment.
    if (__DEV__) console.warn('[auth] Google sign-in redirect error', result.type === 'success' ? redactUrl(result.url) : result.type);
    return outcome.message;
  }
  const { error: sessionError } =
    outcome.kind === 'code'
      ? await supabase.auth.exchangeCodeForSession(outcome.code)
      : await supabase.auth.setSession({ access_token: outcome.accessToken, refresh_token: outcome.refreshToken });
  if (sessionError && __DEV__) console.warn('[auth] setting the session failed', outcome.kind, sessionError.message);
  return sessionError ? 'Could not sign you in. Try again.' : null;
}

/** On the web, Google sends people back with ?error=... when they cancel or something fails. */
export function takeAuthRedirectError(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''));
  if (!params.get('error')) return null;
  window.history.replaceState(null, '', window.location.pathname);
  return params.get('error') === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google sign-in failed. Try again.';
}
