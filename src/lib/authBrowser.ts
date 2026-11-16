/**
 * Options for WebBrowser.openAuthSessionAsync (Google sign-in). Pure, so it can be unit tested.
 *
 * Android: expo-web-browser 58 defaults to createTask: true + useProxyActivity: true. Each open
 * then starts BrowserProxyActivity with FLAG_ACTIVITY_NEW_TASK and the sign-in URL only in an
 * extra (CustomTabsActivitiesHelper.kt startCustomTabs). The proxy has no onNewIntent
 * (BrowserProxyActivity.kt), and nothing closes the Custom Tab after the exps:// return. So the
 * next tap brought back the old tab, frozen on the spent Google page, instead of loading the new
 * sign-in URL. With createTask: false the module calls tabsIntent.launchUrl(currentActivity, url)
 * instead: the URL is the intent's data and the tab opens in the app's own task. Every tap then
 * loads the new URL, and the return link brings the app's task forward over the tab.
 *
 * iOS / web: undefined, so the call is the same as before (no options).
 */
export type AuthBrowserOptions = { createTask: false };

export function authBrowserOptions(os: string): AuthBrowserOptions | undefined {
  return os === 'android' ? { createTask: false } : undefined;
}
