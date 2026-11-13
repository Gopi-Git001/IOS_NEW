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
import { isRunningInExpoGo } from 'expo';
import { getBundleOrigin } from 'expo/internal/bundle-origin';
import { parseAuthResult, redactUrl, type RedirectEnv, resolveNativeRedirect } from './authRedirect';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createCodeExchanger,
  createSingleFlight,
  describeAuthUrl,
  describeIncomingExchange,
  flowOutcome,
  incomingLinkAction,
  safeMessage,
  type UsedCodeStore,
} from './authFlow';
import { confirmDeleted, DELETE_FAILED, DELETE_SLUG, deletedFlag } from './accountDeletion';
import { devLog } from './devLog';

// Dev only: one line per JS start, so a reload while the Google sheet is open shows up in the log.
devLog('auth', `app start ${Platform.OS}`);

const GOOGLE_OPEN_FAILED = 'Could not open Google sign-in. Try again.';
const SESSION_FAILED = 'Could not sign you in. Try again.';
const googleSignIn = createSingleFlight();

// Fingerprints (not the codes) of sign-in codes already sent, so a reload that hands the same
// return link to the app again never sends a used code twice.
const USED_CODES_KEY = 'reallabel-auth-used-codes';
const usedCodes: UsedCodeStore = {
  async has(fingerprint) {
    const raw = await AsyncStorage.getItem(USED_CODES_KEY);
    return (raw ?? '').split(',').includes(fingerprint);
  },
  async add(fingerprint) {
    const raw = await AsyncStorage.getItem(USED_CODES_KEY);
    const list = (raw ?? '').split(',').filter(Boolean).slice(-9);
    await AsyncStorage.setItem(USED_CODES_KEY, [...list, fingerprint].join(','));
  },
};

// One PKCE exchange at a time, each code once: shared by the Google flow (iOS, Android without a
// reload) and the incoming return link (Android Expo Go reloads the app on return).
const codeExchange = createCodeExchanger(async (code) => {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? safeMessage(error.message) : null;
}, usedCodes);

/** True while a Google sign-in started by signInWithGoogle() has not finished (for the dev tap log). */
export const isGoogleSignInRunning = () => googleSignIn.running;

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

/**
 * Asks the server to delete the signed-in account. Resolves only when the server replied 2xx with
 * `{ deleted: true }`; otherwise throws with a message to show. It does NOT sign out: account.ts signs out
 * after the local cleanup, and only once this resolved (accountDeletion.ts).
 */
export async function deleteAccount() {
  if (__DEV__) console.log(`[delete] request sent ${DELETE_SLUG}`);
  const { data, error, response } = await supabase.functions.invoke(DELETE_SLUG, { method: 'POST' });
  const status = error instanceof FunctionsHttpError || error instanceof FunctionsRelayError ? error.context.status : error ? 0 : (response?.status ?? 200);
  if (__DEV__) console.log(`[delete] server reply status=${status || 'network'} deleted=${deletedFlag(data)}`);
  confirmDeleted({ status, data: error ? null : data, message: error ? await messageFrom(error, DELETE_FAILED) : undefined });
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

/** Runs a lookup that can throw (native module missing, manifest missing) and gives null instead. */
function safely<T>(read: () => T): T | null {
  try {
    return read() ?? null;
  } catch {
    return null;
  }
}

/**
 * Expo Go (iOS + Android): exps://<host>/--/auth (https dev server, e.g. tunnel) or
 * exp://<host>/--/auth (LAN), built from the dev server host; native builds: reallabel://auth.
 * Read at sign-in time so a changed LAN / tunnel host is picked up. See authRedirect.ts.
 */
function nativeRedirect(): string {
  const env: RedirectEnv = {
    os: Platform.OS,
    isRunningInExpoGo: safely(() => isRunningInExpoGo()),
    appOwnership: safely(() => Constants.appOwnership),
    executionEnvironment: safely(() => Constants.executionEnvironment),
    // Only a dev-server manifest has `developer`; an embedded release manifest does not.
    hasExpoGoConfig: safely(() => Constants.expoGoConfig?.developer != null),
    bundleOrigin: safely(() => getBundleOrigin()),
    experienceUrl: safely(() => Constants.experienceUrl),
    hostUri: safely(() => Constants.expoConfig?.hostUri),
    linkingUri: safely(() => Constants.linkingUri),
    createURL: safely(() => Linking.createURL('auth')),
  };
  const choice = resolveNativeRedirect(env);
  if (__DEV__) {
    // Hosts and links only (query / fragment cut off): no tokens, no keys.
    devLog(
      'auth',
      'detect ' +
      JSON.stringify({
        isRunningInExpoGo: env.isRunningInExpoGo,
        executionEnvironment: env.executionEnvironment,
        appOwnership: env.appOwnership,
        hostUri: redactUrl(env.hostUri),
        linkingUri: redactUrl(env.linkingUri),
        bundleOrigin: redactUrl(env.bundleOrigin),
        createURL: redactUrl(env.createURL),
      }),
    );
    if (choice.noHost) devLog('auth', 'Expo Go detected but no dev server host');
  }
  return choice.url;
}

/**
 * Google sign-in through Supabase Auth (free; no SMS). Returns an error message, or null when it
 * started (web: the page leaves for Google and comes back signed in) or the person closed the
 * sign-in sheet (phones). An ?error= redirect is a failure message, never silent.
 */
export function signInWithGoogle(): Promise<string | null> {
  // A return link is being traded for a session: a new flow now would replace the stored PKCE
  // verifier that exchange needs (and Google would be opened a second time).
  if (codeExchange.running) {
    devLog('auth', 'ignored: incoming link exchange in progress');
    return Promise.resolve(null);
  }
  // One sign-in at a time: a second tap while the browser sheet is open does nothing.
  return googleSignIn.run(signInWithGoogleOnce, null, () => {
    devLog('auth', 'ignored: already in progress');
  });
}

async function signInWithGoogleOnce(): Promise<string | null> {
  if (Platform.OS === 'web') {
    const back = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back } });
    return error ? GOOGLE_OPEN_FAILED : null;
  }
  const step: { current: 'cancel' | 'error' | 'session-set' } = { current: 'error' };
  try {
    return await nativeGoogleSignIn(step);
  } catch (e) {
    devLog('auth', `error: ${safeMessage(e)}`);
    return 'Google sign-in failed. Try again.';
  } finally {
    if (__DEV__) {
      const hasSession = await logSessionState();
      devLog('auth', `flow end ${flowOutcome(step.current, hasSession)}`);
    }
  }
}

async function nativeGoogleSignIn(step: { current: 'cancel' | 'error' | 'session-set' }): Promise<string | null> {
  const failed = GOOGLE_OPEN_FAILED;
  const redirect = nativeRedirect();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirect, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return failed;
  devLog('auth', `redirectTo ${redactUrl(redirect)}`);
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirect);
  devLog('auth', `result ${result.type}`);
  // Only whether a code / tokens came back and the error text; never the values or the full URL.
  if (result.type === 'success') devLog('auth', `return url: ${describeAuthUrl(result.url)}`);
  const outcome = parseAuthResult(result);
  if (outcome.kind === 'cancel') {
    step.current = 'cancel';
    return null;
  }
  if (outcome.kind === 'error') return outcome.message;
  if (outcome.kind === 'code') {
    // Shared with the incoming-link handler: the same code is never sent twice.
    const exchanged = await codeExchange.exchange(outcome.code);
    if (exchanged.status === 'failed') {
      devLog('auth', `exchange failed: ${safeMessage(exchanged.message)}`);
      return SESSION_FAILED;
    }
    devLog('auth', exchanged.status === 'ok' ? `exchange ok${exchanged.duplicate ? ' (shared)' : ''}` : `exchange skipped (${exchanged.reason})`);
    step.current = 'session-set';
    return null;
  }
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: outcome.accessToken,
    refresh_token: outcome.refreshToken,
  });
  devLog('auth', sessionError ? `setSession failed: ${safeMessage(sessionError.message)}` : 'setSession ok');
  if (sessionError) return SESSION_FAILED;
  step.current = 'session-set';
  return null;
}

/**
 * The sign-in return link reached the app outside the running flow (Android Expo Go reloads the
 * app when exps://<host>/--/auth?code=... arrives, so openAuthSessionAsync never returns; or the
 * Custom Tab "dismiss" won the race against the link). Trades its code for a session exactly once;
 * onAuthStateChange (App.tsx) then sets the session. Returns an error message to show, or null.
 * Waits for a running Google flow to finish first (it may be exchanging this very code).
 */
export async function completeSignInFromLink(url: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const action = incomingLinkAction(url);
  if (action.kind === 'ignore') return null;
  if (action.kind === 'error') {
    devLog('auth', describeIncomingExchange({ status: 'failed', message: action.detail }));
    return action.message;
  }
  if (action.kind === 'no-code') {
    devLog('auth', describeIncomingExchange({ status: 'skipped', reason: 'no code in link' }));
    return null;
  }
  try {
    await googleSignIn.whenIdle();
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      devLog('auth', describeIncomingExchange({ status: 'skipped', reason: 'already signed in' }));
      return null;
    }
    const result = await codeExchange.exchange(action.code);
    devLog('auth', describeIncomingExchange(result));
    return result.status === 'failed' ? SESSION_FAILED : null;
  } catch (e) {
    devLog('auth', describeIncomingExchange({ status: 'failed', message: safeMessage(e) }));
    return SESSION_FAILED;
  }
}

/** "[auth] session: yes|no user: yes|no" (presence only, no ids or tokens). Dev only. */
async function logSessionState(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session ?? null;
    devLog('auth', `session: ${session ? 'yes' : 'no'} user: ${session?.user ? 'yes' : 'no'}`);
    return !!session;
  } catch (e) {
    devLog('auth', `session: unknown (${safeMessage(e)})`);
    return false;
  }
}

/** On the web, Google sends people back with ?error=... when they cancel or something fails. */
export function takeAuthRedirectError(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''));
  if (!params.get('error')) return null;
  window.history.replaceState(null, '', window.location.pathname);
  return params.get('error') === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google sign-in failed. Try again.';
}
