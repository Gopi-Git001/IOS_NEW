// App links: the shared values, plus the phone-only identifiers that come from build-time env vars.
//
// The URL values live in brand/app-links.json (read by src/lib/scanLinks.ts) so the marketing site and
// the app cannot drift. The identifiers below can only be filled in once the app exists in the stores,
// so they are env vars: the generated /.well-known/ files are simply not emitted while they are
// missing, and every link falls back to the plain web URL. See docs/app-links.md.
import shared from '../../brand/app-links.json';
export {
  APP_WEB_ORIGIN,
  SCAN_PATH,
  APP_SCHEME,
  SCAN_URL,
  SCAN_DEEP_LINK,
  isScanLink,
  isScanPath,
} from '../lib/scanLinks';

export const SITE_ORIGIN: string = shared.siteOrigin;
export const FROM_APP_PARAM: string = shared.fromAppParam;
export const FROM_APP_VALUE: string = shared.fromAppValue;

/** The website opened from the app, flagged so its Scan links come back into the app. */
export const WEBSITE_FROM_APP = `${SITE_ORIGIN}/?${FROM_APP_PARAM}=${FROM_APP_VALUE}`;

// ---------- phone-only identifiers (env at build time, never committed) ----------

/** Apple Developer > Membership > Team ID. Without it the iOS association file is not emitted. */
export const APPLE_TEAM_ID = process.env.EXPO_PUBLIC_APPLE_TEAM_ID || '';

/** Must match ios.bundleIdentifier in app.json. */
export const IOS_BUNDLE_ID: string = process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || '';

/** Must match android.package in app.json. */
export const ANDROID_PACKAGE: string = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || '';

/**
 * One or more SHA-256 signing-certificate fingerprints, comma separated. Use BOTH the Play App Signing
 * fingerprint and the local/EAS upload key fingerprint, or App Links fail after the first Play upload.
 */
export const ANDROID_SHA256: string[] = (process.env.EXPO_PUBLIC_ANDROID_SHA256 || '')
  .split(',')
  .map((v: string) => v.trim())
  .filter(Boolean);

/** `<TeamID>.<bundleId>`, or null when either half is missing. */
export const IOS_APP_ID: string | null =
  APPLE_TEAM_ID && IOS_BUNDLE_ID ? `${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}` : null;

/** True only when both halves of the Apple association are known. */
export const hasIosAppId = IOS_APP_ID !== null;

/** True only when the Android package and at least one fingerprint are known. */
export const hasAndroidTarget = Boolean(ANDROID_PACKAGE && ANDROID_SHA256.length);
