// App-link values for the marketing site, read from the same brand/app-links.json the app uses,
// so the site and the scanner cannot drift. Keep in step with src/config/appLinks.ts (the app copy).
import shared from '../../../../brand/app-links.json';

export const APP_WEB_ORIGIN: string = shared.appWebOrigin;
export const SCAN_PATH: string = shared.scanPath;
export const APP_SCHEME: string = shared.appScheme;
export const FROM_APP_PARAM: string = shared.fromAppParam;
export const FROM_APP_VALUE: string = shared.fromAppValue;

/** Where a "Scan a label" link goes on a normal visit. */
export const SCAN_URL = `${APP_WEB_ORIGIN}${SCAN_PATH}`;

/** Where it goes when the page was opened from the app (see the from-app script in Base.astro). */
export const SCAN_DEEP_LINK = `${APP_SCHEME}://scan`;

/** sessionStorage key holding "this tab came from the app". */
export const FROM_APP_STORAGE_KEY = 'sd-from-app';

/**
 * The href to render in the HTML for a "Scan a label" button. Always the https scan URL: without
 * JavaScript that is what a visitor gets, which is the safe default. The from-app script in
 * Base.astro rewrites these anchors to SCAN_DEEP_LINK in the browser when the tab came from the app.
 */
export const scanHref = () => SCAN_URL;
