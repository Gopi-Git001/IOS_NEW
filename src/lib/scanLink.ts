// Incoming app links on phones: https://app.sugardepth.com/scan (Universal Links / App Links) and
// reallabel://scan (the custom scheme the website uses in from-app mode). Both mean "open the scanner".
//
// The app has no router, so this just reports "the visitor asked for the scan screen" and App.tsx
// reacts. The web equivalent lives in src/config/scanRoute.ts; the URL matching itself is shared, so
// there is one definition of what counts as a scan link.
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { isScanLink } from '../lib/scanLinks';

/** The URL the app was launched with, if it was launched by a link. */
async function initialScanUrl(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const url = await Linking.getInitialURL();
    return isScanLink(url) ? (url as string) : null;
  } catch {
    return null;
  }
}

/**
 * True once an app link has asked for the scanner. Stays true: the scan screen is the app's home
 * screen, so arriving with a link and being sent to the camera anyway would be a surprise.
 * `onScanLink` runs on each link, so a second tap can close a browser that is still open.
 */
export function useScanLink(onScanLink?: () => void): boolean {
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;

    void initialScanUrl().then((url) => {
      if (active && url) setRequested(true);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!isScanLink(url)) return;
      // The website opens in the in-app browser; that session has to close before the app shows.
      if (Platform.OS === 'ios') WebBrowser.dismissBrowser().catch(() => {});
      setRequested(true);
      onScanLink?.();
    });

    return () => {
      active = false;
      subscription.remove();
    };
    // onScanLink is a fresh closure each render; re-subscribing on it would churn the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return requested;
}
