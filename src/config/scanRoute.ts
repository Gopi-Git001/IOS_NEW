// The /scan entry point on the web build, and the "open the scan screen" intent shared by web and phone.
//
// There is no router in this app (it is a single-screen state machine in App.tsx), so /scan is handled by
// reading the path once on load. A visitor who reaches https://app.sugardepth.com/scan wants the scanner:
// if they are signed out they get sign-in first, and come back to /scan afterwards (the redirect target
// survives via sessionStorage, because Google strips the path from the return URL).
import { Platform } from 'react-native';
import { SCAN_PATH, isScanPath } from '../lib/scanLinks';

export { isScanPath };

const SCAN_INTENT_KEY = 'sd-scan-intent';

/** True when the browser is on /scan right now. Always false off the web. */
export function wantsScanOnLoad(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return isScanPath(window.location.pathname);
}

/**
 * Remember that the visitor asked for the scanner, so a sign-in round trip can return them to it.
 * Safe to call anywhere; does nothing off the web.
 */
export function rememberScanIntent(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SCAN_INTENT_KEY, '1');
  } catch {
    /* private mode: the intent is lost, which only costs one extra tap */
  }
}

/** Forget the scan intent (after it has been honoured). */
export function clearScanIntent(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SCAN_INTENT_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Did this tab ask for the scanner before signing in? */
export function hasScanIntent(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(SCAN_INTENT_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Put /scan in the address bar (without reloading) when the app is about to show the scanner, and take
 * it out when it is not, so a copied URL and a reload do what the visitor expects.
 */
export function syncScanPath(scanning: boolean): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const { pathname, search, hash } = window.location;
  const onScan = isScanPath(pathname);
  try {
    if (scanning && !onScan) window.history.replaceState(null, '', `${SCAN_PATH}${search}${hash}`);
    else if (!scanning && onScan) window.history.replaceState(null, '', `/${search}${hash}`);
  } catch {
    /* history is unavailable in some in-app browsers; the screen still works */
  }
}
