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
  /** isRunningInExpoGo() from 'expo': true when the native ExpoGo module exists (most reliable). */
  isRunningInExpoGo?: boolean | null;
  /** Constants.appOwnership: 'expo' means Expo Go (deprecated; can be null even in Expo Go). */
  appOwnership?: string | null;
  /** Constants.executionEnvironment: 'storeClient' means Expo Go. */
  executionEnvironment?: string | null;
  /** Constants.expoGoConfig is set (only Expo Go has it). */
  hasExpoGoConfig?: boolean | null;
  /** getBundleOrigin() from 'expo/internal/bundle-origin', e.g. "https://<host>.on.expo.app". */
  bundleOrigin?: string | null;
  /** Constants.experienceUrl, e.g. "exps://<host>.on.expo.app" or "exp://192.168.1.5:8081". */
  experienceUrl?: string | null;
  /** Constants.expoConfig?.hostUri, e.g. "192.168.1.5:8081" (no scheme). */
  hostUri?: string | null;
  /** Constants.linkingUri, e.g. "exp://192.168.1.5:8081/--/". */
  linkingUri?: string | null;
  /** Linking.createURL('auth'); only trusted when it starts with exp:// or exps://. */
  createURL?: string | null;
};

export type RedirectChoice = {
  /** The redirect to send to Supabase and openAuthSessionAsync. */
  url: string;
  /** Expo Go was detected. */
  expoGo: boolean;
  /** Expo Go was detected but no dev server host was found: url is reallabel://auth and won't come back. */
  noHost: boolean;
};

const EXPO_GO_LINK = /^exps?:\/\//i;

/** True inside the Expo Go app. Any one signal is enough (several are deprecated or can be missing). */
export function isExpoGo(
  env: Pick<RedirectEnv, 'isRunningInExpoGo' | 'appOwnership' | 'executionEnvironment' | 'hasExpoGoConfig' | 'linkingUri'>,
): boolean {
  return (
    env.isRunningInExpoGo === true ||
    env.executionEnvironment === 'storeClient' ||
    env.appOwnership === 'expo' ||
    env.hasExpoGoConfig === true ||
    EXPO_GO_LINK.test((env.linkingUri ?? '').trim())
  );
}

type DevServer = { host: string; secure: boolean | null };

/**
 * Host (with port, if any) and https-ness from a URL or bare host. No `new URL` (React Native's
 * URL support varies); the scheme, path, query and fragment are cut off by hand.
 */
function parseHost(raw: string | null | undefined): DevServer | null {
  const value = (raw ?? '').trim();
  if (!value) return null;
  const schemeMatch = /^([a-z][a-z0-9+.-]*):\/\//i.exec(value);
  const scheme = schemeMatch ? schemeMatch[1].toLowerCase() : null;
  const rest = schemeMatch ? value.slice(schemeMatch[0].length) : value;
  const host = rest.split(/[/?#]/)[0].replace(/^.*@/, '');
  if (!host || !/^[a-z0-9.\-[\]:]+$/i.test(host)) return null;
  const secure = scheme === 'https' || scheme === 'exps' ? true : scheme === 'http' || scheme === 'exp' ? false : null;
  return { host, secure };
}

/** A host without a scheme: https only when nothing else says so and it looks like an https tunnel. */
function guessSecure(host: string): boolean {
  if (/:443$/.test(host)) return true;
  if (/:\d+$/.test(host)) return false;
  return /\.on\.expo\.app$/i.test(host);
}

/** Expo Go's dev server: host from bundle origin, experienceUrl, hostUri, linkingUri, then createURL. */
export function devServerOf(env: RedirectEnv): DevServer | null {
  const createURL = EXPO_GO_LINK.test((env.createURL ?? '').trim()) ? env.createURL : null;
  const sources = [env.bundleOrigin, env.experienceUrl, env.hostUri, env.linkingUri, createURL].map(parseHost);
  const found = sources.find((s): s is DevServer => s !== null);
  if (!found) return null;
  // https-ness: the first source that knows it (the bundle origin is what the phone actually reached).
  const known = sources.find((s) => s !== null && s.host === found.host && s.secure !== null);
  const secure = known?.secure ?? guessSecure(found.host);
  return { host: found.host, secure };
}

/**
 * Redirect used for both signInWithOAuth redirectTo and openAuthSessionAsync returnUrl.
 * - Expo Go (iOS and Android): <scheme>://<dev server host>/--/auth, scheme exps for an https dev
 *   server (tunnel) and exp for http (LAN). Built from the dev server host, never from the app
 *   scheme: Expo Go can't receive reallabel:// links (Supabase then falls back to its Site URL).
 *   Allow-listed in Supabase as exps://** and exp://**.
 * - Native builds (standalone / bare): reallabel://auth (registered by app.json "scheme").
 * - Expo Go with no host data at all: reallabel://auth with noHost set (the caller warns in dev).
 */
export function resolveNativeRedirect(env: RedirectEnv): RedirectChoice {
  if (!isExpoGo(env)) return { url: NATIVE_REDIRECT, expoGo: false, noHost: false };
  const server = devServerOf(env);
  if (!server) return { url: NATIVE_REDIRECT, expoGo: true, noHost: true };
  return { url: `${server.secure ? 'exps' : 'exp'}://${server.host}/--/auth`, expoGo: true, noHost: false };
}

export function buildNativeRedirect(env: RedirectEnv): string {
  return resolveNativeRedirect(env).url;
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
