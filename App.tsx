import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { scanLabel } from './src/lib/api';
import { isConfigured, supabase } from './src/lib/supabase';
import { placeholderResults } from './src/placeholderResults';
import { CameraScreen } from './src/screens/CameraScreen';
import { ResultScreen, type ScanState } from './src/screens/ResultScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { colors } from './src/theme';
import type { ScanResult } from './src/types';

// Without Supabase settings in .env the app runs in demo mode: no sign-in, fake results.
const DEMO_TAGLINE = 'Demo mode · fake results';
let demoCount = 0;
const demoScan = () =>
  new Promise<ScanResult>((resolve) =>
    setTimeout(() => resolve(placeholderResults[demoCount++ % placeholderResults.length]), 1600),
  );

type Scan = { photoUri: string; state: ScanState };

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const [session, setSession] = useState<Session | null | undefined>(isConfigured ? undefined : null);
  const [scan, setScan] = useState<Scan | null>(null);
  const scanId = useRef(0);

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Signing out (or deleting the account) returns to the sign-in screen.
  useEffect(() => {
    if (session === null && isConfigured) setScan(null);
  }, [session]);

  const handleCapture = async (photoUri: string) => {
    const id = ++scanId.current;
    setScan({ photoUri, state: { status: 'reading' } });
    let state: ScanState;
    try {
      const result = isConfigured ? await scanLabel(photoUri) : await demoScan();
      state = { status: 'done', result };
    } catch (e) {
      state = { status: 'error', message: e instanceof Error ? e.message : "Couldn't read the label." };
    }
    // Ignore a result that arrives after the user already left this scan.
    if (id === scanId.current) setScan({ photoUri, state });
  };

  const handleScanAnother = () => {
    scanId.current++;
    setScan(null);
  };

  const tagline = isConfigured ? undefined : DEMO_TAGLINE;
  const ready = fontsLoaded && session !== undefined;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {ready &&
          (isConfigured && !session ? (
            <SignInScreen />
          ) : scan ? (
            <ResultScreen photoUri={scan.photoUri} state={scan.state} onScanAnother={handleScanAnother} tagline={tagline} />
          ) : (
            <CameraScreen onCapture={handleCapture} tagline={tagline} />
          ))}
      </View>
    </SafeAreaProvider>
  );
}
