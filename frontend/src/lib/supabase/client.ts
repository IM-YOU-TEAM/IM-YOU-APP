import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy frontend/.env.example to frontend/.env.');
}

export const SUPABASE_URL = url;
export const SUPABASE_PUBLISHABLE_KEY = publishableKey;

const isWeb = Platform.OS === 'web';
// Static web export renders once without a window; there is no session to read then.
const isServer = isWeb && typeof window === 'undefined';

/** The app's single Supabase client. Sessions persist in localStorage (web) or AsyncStorage (native). */
export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    storage: isWeb ? undefined : AsyncStorage,
    persistSession: !isServer,
    autoRefreshToken: !isServer,
    // Web OAuth and email links return to the app with ?code=; native hands the URL over itself.
    detectSessionInUrl: isWeb && !isServer,
    flowType: 'pkce',
  },
});

// Native apps only refresh tokens while in the foreground.
if (!isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
