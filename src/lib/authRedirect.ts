/**
 * Google sign-in redirect for phones: where Supabase sends the browser back to, and how to read
 * what came back. Pure (no React Native imports) so it can be unit-tested.
 */

/** The app's own scheme (app.json "scheme"). Must be in the Supabase redirect allow-list. */
export const NATIVE_REDIRECT = 'reallabel://auth';

export const SIGN_IN_CANCELLED = 'Google sign-in was cancelled.';
export const SIGN_IN_FAILED = 'Google sign-in failed. Try again.';

export type RedirectEnv = {
  /** Platform.OS */
  os: string;
  /** Constants.executionEnvironment: 'storeClient' means Expo Go. */
  executionEnvironment?: string | null;
  /** Constants.linkingUri, e.g. "exp://192.168.1.5:8081/--/" in Expo Go. */
  linkingUri?: string | null;
};

/**
 * iOS (Expo Go and native builds): reallabel://auth. ASWebAuthenticationSession closes on any URL
 * with the callback scheme, even when the scheme isn't registered (Expo Go), so no exp:// is needed
 * and the redirect does not depend on the changing LAN / tunnel host.
 * Android in Expo Go: the browser polyfill waits for a deep link into the app, and Expo Go only
 * opens exp:// links, so use Expo Go's own link + "/--/auth" (allow-listed as exp://**).
 * Android native builds: reallabel://auth (registered by app.json "scheme").
 */
export function buildNativeRedirect(env: RedirectEnv): string {
  if (env.os !== 'android' || env.executionEnvironment !== 'storeClient') return NATIVE_REDIRECT;
  const base = (env.linkingUri ?? '').trim();
  if (!/^exps?:\/\//.test(base)) return NATIVE_REDIRECT;
  const root = base.includes('/--/') ? base.slice(0, base.indexOf('/--/')) : base.replace(/\/+$/, '');
  return `${root}/--/auth`;
}

export type AuthResult = { type: string; url?: string | null };

export type AuthOutcome =
  | { kind: 'code'; code: string }
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
 * - Sheet closed (Cancel / dismiss): cancel, the app shows nothing.
 * - ?code=...: PKCE code to exchange.
 * - ?error=access_denied: the person declined on Google's page (same wording as the web).
 * - Any other ?error=..., or no code at all: failure.
 */
export function parseAuthResult(result: AuthResult): AuthOutcome {
  if (result.type !== 'success') return { kind: 'cancel' };
  const params = redirectParams(result.url ?? '');
  const error = params.get('error') || params.get('error_code');
  if (error) return { kind: 'error', message: error === 'access_denied' ? SIGN_IN_CANCELLED : SIGN_IN_FAILED };
  const code = params.get('code');
  if (code) return { kind: 'code', code };
  return { kind: 'error', message: SIGN_IN_FAILED };
}
