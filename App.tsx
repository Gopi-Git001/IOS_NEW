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
import { Platform, StyleSheet, Text, View } from 'react-native';
import { getGuestQuota, guestConfig, guestMode, guestTrialFlag, signInAsGuest } from './src/lib/api';
import { isGuestUser, type GuestQuota } from './src/lib/guestTrial';
import { GuestScanPrompt } from './src/components/GuestScanPrompt';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { applyStrictMode } from './src/lib/display';
import { recordScan } from './src/lib/history';
import { getPrefs, usePrefs } from './src/lib/prefs';
import { playHaptic } from './src/lib/haptics';
import { describeAuthEvent, describeGetSession, describeSessionSet, type SessionPath } from './src/lib/authFlow';
import { devLog } from './src/lib/devLog';
import type { Photo } from './src/lib/photo';
import { runScan } from './src/lib/scan';
import { finishScanTiming, markScanPainted, noteScan } from './src/lib/scanTiming';
import { isConfigured, supabase } from './src/lib/supabase';
import { appMode, DEMO_DELAY_MS, placeholderAt } from './src/placeholderResults';
import { CameraScreen } from './src/screens/CameraScreen';
import { ResultScreen, type ScanState } from './src/screens/ResultScreen';
import type { Sheet } from './src/components/Chrome';
import { syncProfile } from './src/lib/account';
import { MenuScreen } from './src/screens/MenuScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { colors, fonts } from './src/theme';
import type { ScanResult, Verdict } from './src/types';

// Without Supabase settings in .env, development (Expo Go) and web builds run in demo mode: no sign-in,
// fake results. A native (iOS/Android) release build without them shows a "not configured" screen instead.
const mode = appMode(__DEV__, isConfigured, Platform.OS);
const DEMO_TAGLINE = 'Demo mode · fake results';
let demoCount = 0;
const demoScan = () =>
  new Promise<ScanResult>((resolve) => setTimeout(() => resolve(placeholderAt(demoCount++)), DEMO_DELAY_MS));

function NotConfiguredScreen() {
  return (
    <View style={styles.notConfigured}>
      <Text style={styles.notConfiguredTitle}>Not configured</Text>
      <Text style={styles.notConfiguredBody}>
        This build has no server settings, so it can't check labels. Please update the app or try again later.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notConfigured: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.background },
  notConfiguredTitle: { fontFamily: fonts.black, fontSize: 28, color: '#FFFFFF', marginBottom: 12, textAlign: 'center' },
  notConfiguredBody: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
});

type Scan = { photoUri: string; state: ScanState };

const verdictHaptic: Record<Verdict, Haptics.NotificationFeedbackType> = {
  CLEAN: Haptics.NotificationFeedbackType.Success,
  OKAY: Haptics.NotificationFeedbackType.Warning,
  BAD: Haptics.NotificationFeedbackType.Error,
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
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [scan, setScan] = useState<Scan | null>(null);
  const scanId = useRef(0);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const prefs = usePrefs();
  const [trial, setTrial] = useState<GuestQuota | null | undefined>(guestTrialFlag ? undefined : null);
  const [quota, setQuota] = useState<GuestQuota | null>(null);
  const [trialUnavailable, setTrialUnavailable] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const capturing = useRef(false);
  const guest = isGuestUser(session?.user);
  const trialVisitor = Boolean(trial && (!session || guest));

  useEffect(() => {
    if (guestTrialFlag && isConfigured) void guestConfig().then(setTrial);
    else setTrial(null);
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    // Dev-only [auth] lines: presence (yes/no) and event names only, never tokens or ids.
    const setSessionFrom = (path: SessionPath, s: Session | null) => {
      devLog('auth', describeSessionSet(path, s));
      setSession(s);
    };
    supabase.auth.getSession().then(({ data, error }) => {
      devLog('auth', describeGetSession(data.session, error));
      setSessionFrom('initial-getSession', data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      devLog('auth', describeAuthEvent(event, s));
      setSessionFrom(`auth-event:${event}`, s);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let current = true;
    setQuota(null);
    if (session && !guest) {
      setPrompt(false);
      setSignInOpen(false);
      setTrialUnavailable(false);
    } else if (session && guest && trial) {
      void getGuestQuota().then((value) => {
        if (!current) return;
        setQuota(value);
        if (!value || value.remaining === 0) {
          setTrialUnavailable(!value);
          setPrompt(true);
        }
      });
    }
    return () => { current = false; };
  }, [session?.user.id, guest, trial]);

  // Signing out (or deleting the account) returns to the sign-in screen.
  // Testing builds start a guest session instead, so there is no Google sign-in step.
  const [guestFailed, setGuestFailed] = useState(false);
  useEffect(() => {
    if (session === null && isConfigured) {
      setScan(null);
      setSheet(null);
      if (guestMode && !guestTrialFlag && !guestFailed) signInAsGuest().then((err) => err && setGuestFailed(true));
    }
  }, [session, guestFailed]);

  // Signed in: load the name and settings from the profile (unsynced local changes are sent first).
  const userId = session?.user.id;
  useEffect(() => {
    if (userId) syncProfile();
  }, [userId]);

  const handleCapture = async (photo: Photo) => {
    if (capturing.current) return;
    if (trialVisitor && (trialUnavailable || quota?.remaining === 0)) { setPrompt(true); return; }
    capturing.current = true;
    const photoUri = photo.uri;
    const id = ++scanId.current;
    setScan({ photoUri, state: { status: 'reading' } });
    let buzzed = false;
    let recorded = false;
    // Also runs after user-initiated lists retries, which reserve another paid reader call.
    const refreshQuota = async () => {
      if (!trialVisitor) return;
      const value = await getGuestQuota();
      if (id !== scanId.current || (sessionRef.current && !isGuestUser(sessionRef.current.user))) return;
      setQuota(value);
      if (!value || value.remaining === 0) { setTrialUnavailable(!value); setPrompt(true); }
    };
    // Ignore anything that arrives after the user already left this scan.
    const show = (state: ScanState) => {
      if (id !== scanId.current) return;
      setScan({ photoUri, state });
      if (state.status === 'error') {
        noteScan({ error: state.message });
        markScanPainted('error_on_screen');
        void refreshQuota();
      }
      if (state.status !== 'done') return;
      noteScan({ shown_verdict: state.result.verdict });
      markScanPainted('verdict_on_screen');
      if (!state.listsPending) markScanPainted('lists_on_screen');
      if (!state.listsPending) void refreshQuota();
      const { strict, haptics } = getPrefs();
      // Buzz when the first verdict appears; save to history once the ingredient lists are in.
      // The camera is already closed here: the result screen replaced it when the scan started.
      if (!buzzed) playHaptic('verdict', { haptics }, () => Haptics.notificationAsync(verdictHaptic[applyStrictMode(state.result, strict).verdict]), undefined, 'App.tsx handleCapture show');
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
      // Create nothing on first open: only the first intentional scan starts a guest account.
      if (trialVisitor && !session) {
        const error = await signInAsGuest();
        if (error) {
          setTrialUnavailable(true);
          setPrompt(true);
          show({ status: 'error', message: error });
          return;
        }
      }
      // One verdict, shown once Jev and Claude have both answered (or Jev's wait has passed).
      let shown = false;
      await runScan(photo, (u) => {
        shown = true;
        show(u);
      });
      if (!shown) show({ status: 'error', message: "Couldn't read the label. Try again." });
    } catch (e) {
      show({ status: 'error', message: e instanceof Error ? e.message : "Couldn't read the label." });
    } finally {
      capturing.current = false;
      if (id === scanId.current) finishScanTiming();
    }
  };

  const handleScanAnother = () => {
    if (trialVisitor && (trialUnavailable || quota?.remaining === 0)) { setPrompt(true); return; }
    scanId.current++;
    setScan(null);
  };

  const tagline = isConfigured ? undefined : DEMO_TAGLINE;
  const closeSheet = () => setSheet(null);
  // Strict mode is applied on the device to the verdict shown; the server result is kept as is.
  const shownState: ScanState | undefined =
    scan?.state.status === 'done' ? { ...scan.state, result: applyStrictMode(scan.state.result, prefs.strict) } : scan?.state;
  const ready = fontsLoaded && session !== undefined && trial !== undefined && !(guestMode && !guestTrialFlag && session === null && isConfigured && !guestFailed);
  const mustSignIn = isConfigured && (signInOpen || (!session && !trial) || (guest && !trial && !guestMode));
  const openSheet = (next: Sheet) => {
    if (next === 'profile' && trialVisitor) setSignInOpen(true);
    else setSheet(next);
  };

  if (mode === 'not-configured') {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: colors.background }}>{fontsLoaded && <NotConfiguredScreen />}</View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {ready &&
          (mustSignIn ? (
            <SignInScreen onBack={trialVisitor ? () => setSignInOpen(false) : undefined} />
          ) : (
            <>
              {/* Stays mounted under the result so the camera stream survives "Scan another". */}
              <CameraScreen active={!scan && sheet === null && !prompt} onCapture={handleCapture} onOpenSheet={openSheet} tagline={tagline}
                freeScans={trialVisitor && !trialUnavailable ? (session ? quota?.remaining : trial?.remaining) : undefined}
                onSignIn={trialVisitor ? () => setSignInOpen(true) : undefined} />
              {scan && (
                <View style={StyleSheet.absoluteFill}>
                  <ResultScreen
                    photoUri={scan.photoUri}
                    state={shownState ?? scan.state}
                    onScanAnother={handleScanAnother}
                    onOpenSheet={openSheet}
                    gentle={prefs.gentle}
                    tagline={tagline}
                  />
                </View>
              )}
            </>
          ))}
        {ready && (
          <>
            <ProfileScreen visible={sheet === 'profile'} onClose={closeSheet} email={session?.user.email} />
            <MenuScreen visible={sheet === 'menu'} onClose={closeSheet} />
            <GuestScanPrompt visible={prompt && !mustSignIn} unavailable={trialUnavailable} onClose={() => setPrompt(false)} />
          </>
        )}
      </View>
    </SafeAreaProvider>
  );
}
