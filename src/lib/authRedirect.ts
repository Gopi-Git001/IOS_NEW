/** Where Google sign-in sends people back on phones. Kept free of native imports so it can be unit tested. */
export const NATIVE_REDIRECT = 'reallabel://auth';

type ExpoConstants = {
  executionEnvironment?: string | null;
  appOwnership?: string | null;
  expoConfig?: { hostUri?: string | null } | null;
};

/**
 * Expo Go can't own the app's `reallabel://` scheme (an installed Sugar Depth build would catch it instead),
 * so testing in Expo Go returns to `exp://<dev server>/--/auth`. Dev and production builds keep `reallabel://auth`.
 */
export function nativeAuthRedirect(constants: ExpoConstants): string {
  const inExpoGo = constants.executionEnvironment === 'storeClient' || constants.appOwnership === 'expo';
  const host = constants.expoConfig?.hostUri?.replace(/\/+$/, '');
  return inExpoGo && host ? `exp://${host}/--/auth` : NATIVE_REDIRECT;
}

/** The PKCE `?code=` from a URL that came back to `redirect`, or null when the URL isn't ours or has no code. */
export function authCodeFrom(url: string | null | undefined, redirect: string): string | null {
  if (!url || !url.startsWith(redirect)) return null;
  try {
    return new URL(url).searchParams.get('code');
  } catch {
    return null;
  }
}
