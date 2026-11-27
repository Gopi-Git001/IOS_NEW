// Incoming app links on phones: https://app.sugardepth.com/scan (Universal Links / App Links) and
// reallabel://scan (the custom scheme the website uses in from-app mode). Both mean "open the scanner".
//
// The app has no router, so this reports "a scan link arrived" and App.tsx reacts. It returns a
// COUNTER, not a boolean: every accepted link is a new event, so tapping Scan from the mascot website
// while a result or a sheet is open resets the screen again, instead of the second tap being ignored
// because the flag was already true.
//
// The web equivalent lives in src/config/scanRoute.ts; the URL matching itself is shared, so there is
// one definition of what counts as a scan link.
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { isScanLink } from './scanLinks';

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
 * How many scan links have arrived, including the one the app was launched with (0 if none).
 * App.tsx watches the number, so each link — including a repeat tap — resets to the scanner once.
 */
export function useScanLink(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;

    void initialScanUrl().then((url) => {
      if (active && url) setCount((n) => n + 1);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!isScanLink(url)) return;
      // The website opens in the in-app browser; that session has to close before the app shows.
      if (Platform.OS === 'ios') WebBrowser.dismissBrowser().catch(() => {});
      setCount((n) => n + 1);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return count;
}
