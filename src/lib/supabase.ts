import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Both values are public by design: the publishable key only allows what the backend permits.
// Every real secret (Anthropic key, Supabase secret key) lives in Supabase secrets.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isConfigured = Boolean(url && publishableKey);

export const supabase = createClient(url ?? 'https://not-configured.supabase.co', publishableKey ?? 'missing', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Google sign-in returns with ?code=... (PKCE). On the web the client trades it for a session on load;
    // on phones api.ts trades it after the in-app browser closes.
    flowType: 'pkce',
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Only refresh the session while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
