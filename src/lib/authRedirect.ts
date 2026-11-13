/**
 * Google sign-in redirect for phones: where Supabase sends the browser back to, and how to read
 * what came back. Pure (no React Native imports) so it can be unit-tested; api.ts passes in the
 * real Platform / Constants / expo-linking values.
 */

/** The app's own scheme (app.json "scheme"). Must be in the Supabase redirect allow-list. */
export const NATIVE_REDIRECT = 'reallabel://auth';

export const SIGN_IN_CANCELLED = 'Google sign-in was cancelled.';
export const SIGN_IN_FAILED = 'Google sign-in failed. Try again.';

export type RedirectEnv = {
  /** Platform.OS */
  os: string;
  /** Constants.appOwnership: 'expo' means Expo Go (older SDKs; null in native builds). */
  appOwnership?: string | null;
  /** Constants.executionEnvironment: 'storeClient' means Expo Go. */
  executionEnvironment?: string | null;
  /** expo-linking Linking.createURL('auth'), e.g. "exp://192.168.1.5:8081/--/auth" in Expo Go. */
  expoGoUrl?: string | null;
};

/** True inside the Expo Go app (either signal is enough). */
export function isExpoGo(env: Pick<RedirectEnv, 'appOwnership' | 'executionEnvironment'>): boolean {
  return env.appOwnership === 'expo' || env.executionEnvironment === 'storeClient';
}

/**
 * Redirect used for both signInWithOAuth redirectTo and openAuthSessionAsync returnUrl.
 * - Expo Go (iOS and Android): Expo Go's own link, Linking.createURL('auth') =
 *   exp://<host>/--/auth (allow-listed in Supabase as exp://**). Expo Go cannot receive
 *   reallabel:// links, so with that redirect the sheet never came back to the app.
 * - Native builds (standalone / bare): reallabel://auth (registered by app.json "scheme").
 * If Expo Go somehow gives no exp:// link, fall back to reallabel://auth.
 */
export function buildNativeRedirect(env: RedirectEnv): string {
  if (!isExpoGo(env)) return NATIVE_REDIRECT;
  const url = (env.expoGoUrl ?? '').trim();
  return /^exps?:\/\/[^/?#]+/.test(url) ? url : NATIVE_REDIRECT;
}

export type AuthResult = { type: string; url?: string | null };

export type AuthOutcome =
  | { kind: 'code'; code: string }
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'cancel' }
  | { kind: 'error'; message: string };

/** Query and #fragment parameters of a redirect URL (Supabase can put errors in either). */
function redirectParams(url: string): URLSearchParams {
  const hashAt = url.indexOf('#');
  const beforeHash = hashAt < 0 ? url : url.slice(0, hashAt);
  const hash = hashAt < 0 ? '' : url.slice(hashAt + 1);
  const queryAt = beforeHash.indexOf('?');
  const query = queryAt < 0 ? '' : beforeHash.slice(queryAt + 1);
  return new URLSearchParams([query, hash].filter(Boolean).join('&'));
}

/**
 * Reads the result of WebBrowser.openAuthSessionAsync.
 * - Sheet closed (cancel / dismiss / locked): cancel, the app shows nothing.
 * - ?error= / #error= (or error_code): failure message. access_denied (declined on Google's page)
 *   uses the same "cancelled" wording as the web; anything else is "failed".
 * - ?code=...: PKCE code to exchange (exchangeCodeForSession).
 * - #access_token=...&refresh_token=...: implicit-style tokens (setSession).
 * - Nothing usable: failure.
 */
export function parseAuthResult(result: AuthResult): AuthOutcome {
  if (result.type !== 'success') return { kind: 'cancel' };
  const params = redirectParams(result.url ?? '');
  const error = params.get('error') || params.get('error_code');
  if (error) return { kind: 'error', message: error === 'access_denied' ? SIGN_IN_CANCELLED : SIGN_IN_FAILED };
  const code = params.get('code');
  if (code) return { kind: 'code', code };
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken };
  return { kind: 'error', message: SIGN_IN_FAILED };
}

/** URL safe to log: query and #fragment removed (they can hold the code, tokens or errors). */
export function redactUrl(url: string | null | undefined): string {
  if (!url) return '';
  const cut = url.search(/[?#]/);
  return cut < 0 ? url : url.slice(0, cut);
}
