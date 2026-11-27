// Pure helpers for app links: no React Native or DOM imports, so they run under Node tests and can be
// used by both the app and (in spirit) the site. The URL values themselves live in
// brand/app-links.json; src/config/appLinks.ts re-exports those plus the env-driven identifiers.
import shared from '../../brand/app-links.json';

export const APP_WEB_ORIGIN: string = shared.appWebOrigin;
export const SCAN_PATH: string = shared.scanPath;
export const APP_SCHEME: string = shared.appScheme;

/** The scan screen on the web app. */
export const SCAN_URL = `${APP_WEB_ORIGIN}${SCAN_PATH}`;

/** The scan screen inside the installed app. */
export const SCAN_DEEP_LINK = `${APP_SCHEME}://scan`;

/**
 * Does an incoming URL ask for the scan screen? Accepts the https link (with or without a query or
 * fragment) and the custom scheme. Anything else, including other app URLs, is not a scan request.
 */
export function isScanLink(url: string | null | undefined): boolean {
  if (!url) return false;
  const value = String(url).trim();
  if (!value) return false;
  // Custom scheme: reallabel://scan, reallabel:///scan, reallabel://scan?...
  const schemePrefix = `${APP_SCHEME}://`;
  if (value.toLowerCase().startsWith(schemePrefix.toLowerCase())) {
    const rest = value.slice(schemePrefix.length).replace(/^\/+/, '');
    return /^scan(?:[/?#]|$)/i.test(rest);
  }
  // https link: only app.sugardepth.com/scan.
  const prefix = `${APP_WEB_ORIGIN}${SCAN_PATH}`;
  if (!value.toLowerCase().startsWith(prefix.toLowerCase())) return false;
  const rest = value.slice(prefix.length);
  return rest === '' || /^[/?#]/.test(rest);
}

/** Is this path the scan screen? Used by the web build, which has no router. */
export function isScanPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const value = String(pathname).trim();
  return value === SCAN_PATH || value.startsWith(`${SCAN_PATH}/`) || value.startsWith(`${SCAN_PATH}?`);
}
