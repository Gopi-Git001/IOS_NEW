import {
  LibreFranklin_400Regular,
  LibreFranklin_500Medium,
  LibreFranklin_600SemiBold,
  LibreFranklin_700Bold,
  LibreFranklin_800ExtraBold,
  LibreFranklin_900Black,
  useFonts,
} from '@expo-google-fonts/libre-franklin';
import { Newsreader_400Regular_Italic, Newsreader_500Medium_Italic } from '@expo-google-fonts/newsreader';
import type { Session } from '@supabase/supabase-js';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { notify } from './src/lib/confirm';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { applyStrictMode } from './src/lib/display';
import { recordScan } from './src/lib/history';
import { getPrefs, usePrefs } from './src/lib/prefs';
import { runScan } from './src/lib/scan';
import { isConfigured, supabase } from './src/lib/supabase';
import { placeholderResults } from './src/placeholderResults';
import { CameraScreen } from './src/screens/CameraScreen';
import { ResultScreen, type ScanState } from './src/screens/ResultScreen';
import type { Sheet } from './src/components/Chrome';
import { syncProfile } from './src/lib/account';
import { MenuScreen } from './src/screens/MenuScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { colors } from './src/theme';
import type { ScanResult, Verdict } from './src/types';

// Without Supabase settings in .env the app runs in demo mode: no sign-in, fake results.
const DEMO_TAGLINE = 'Demo mode · fake results';
let demoCount = 0;
const demoScan = () =>
  new Promise<ScanResult>((resolve) =>
    setTimeout(() => resolve(placeholderResults[demoCount++ % placeholderResults.length]), 1600),
  );

type Scan = { photoUri: string; state: ScanState };

const verdictHaptic: Record<Verdict, Haptics.NotificationFeedbackType> = {
  CLEAN: Haptics.NotificationFeedbackType.Success,
  BAD: Haptics.NotificationFeedbackType.Warning,
  UGLY: Haptics.NotificationFeedbackType.Error,
};

export default function App() {
  const [fontsLoaded] = useFonts({
    LibreFranklin_400Regular,
    LibreFranklin_500Medium,
    LibreFranklin_600SemiBold,
    LibreFranklin_700Bold,
    LibreFranklin_800ExtraBold,
    LibreFranklin_900Black,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium_Italic,
  });
  const [session, setSession] = useState<Session | null | undefined>(isConfigured ? undefined : null);
  const [scan, setScan] = useState<Scan | null>(null);
  const scanId = useRef(0);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const prefs = usePrefs();

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Signing out (or deleting the account) returns to the sign-in screen.
  useEffect(() => {
    if (session === null && isConfigured) {
      setScan(null);
      setSheet(null);
    }
  }, [session]);

  // Signed in: load the name and settings from the profile (unsynced local changes are sent first).
  const userId = session?.user.id;
  useEffect(() => {
    if (userId) syncProfile();
  }, [userId]);

  const handleCapture = async (photoUri: string) => {
    const id = ++scanId.current;
    setScan({ photoUri, state: { status: 'reading' } });
    let buzzed = false;
    let recorded = false;
    // Ignore anything that arrives after the user already left this scan.
    const show = (state: ScanState) => {
      if (id !== scanId.current) return;
      setScan({ photoUri, state });
      if (state.status !== 'done') return;
      const { strict, haptics } = getPrefs();
      // Buzz when the first verdict appears; save to history once the ingredient lists are in.
      if (!buzzed && haptics) Haptics.notificationAsync(verdictHaptic[applyStrictMode(state.result, strict).verdict]).catch(() => {});
      buzzed = true;
      if (!recorded && !state.listsPending) {
        recorded = true;
        recordScan(state.result);
      }
    };
    try {
      if (!isConfigured) {
        show({ status: 'done', result: await demoScan() });
        return;
      }
      // Jev's verdict shows first; the ingredient lists fill in when Claude finishes.
      let shown = false;
      await runScan(photoUri, (u) => {
        shown = true;
        show(u);
      });
      if (!shown) show({ status: 'error', message: "Couldn't read the label. Try again." });
    } catch (e) {
      show({ status: 'error', message: e instanceof Error ? e.message : "Couldn't read the label." });
    }
  };

  const handleScanAnother = () => {
    scanId.current++;
    setScan(null);
  };

  const tagline = isConfigured ? undefined : DEMO_TAGLINE;
  const closeSheet = () => setSheet(null);
  // Phase 3 adds the change-phone flow; until then the row explains it's coming.
  const changePhone = () => notify('Change phone number', 'Changing your number is coming in the next update.');
  // Strict mode is applied on the device to the verdict shown; the server result is kept as is.
  const shownState: ScanState | undefined =
    scan?.state.status === 'done' ? { ...scan.state, result: applyStrictMode(scan.state.result, prefs.strict) } : scan?.state;
  const ready = fontsLoaded && session !== undefined;

  return (
    <SafeAreaProvider>
      <StatusBar style={isConfigured && !session ? 'dark' : 'light'} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {ready &&
          (isConfigured && !session ? (
            <SignInScreen />
          ) : scan ? (
            <ResultScreen
              photoUri={scan.photoUri}
              state={shownState ?? scan.state}
              onScanAnother={handleScanAnother}
              onOpenSheet={setSheet}
              gentle={prefs.gentle}
              tagline={tagline}
            />
          ) : (
            <CameraScreen onCapture={handleCapture} onOpenSheet={setSheet} tagline={tagline} />
          ))}
        {ready && (
          <>
            <ProfileScreen visible={sheet === 'profile'} onClose={closeSheet} phone={session?.user.phone} onChangePhone={changePhone} />
            <MenuScreen visible={sheet === 'menu'} onClose={closeSheet} />
          </>
        )}
      </View>
    </SafeAreaProvider>
  );
}
