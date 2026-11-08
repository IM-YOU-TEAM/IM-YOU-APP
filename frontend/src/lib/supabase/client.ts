import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Copy frontend/.env.example to frontend/.env and fill both in.',
  );
}

/**
 * Two phones batch IMU samples every 80 ms, so a pair pushes ~25 messages a
 * second down one channel. The client default of 10 would throttle them.
 */
const EVENTS_PER_SECOND = 40;

export const supabase = createClient(url.replace(/\/+$/, ''), publishableKey, {
  auth: {
    // The browser persists to localStorage on its own; native has no default store.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Only the browser has a URL carrying a confirmation or recovery token.
    detectSessionInUrl: Platform.OS === 'web',
  },
  realtime: { params: { eventsPerSecond: EVENTS_PER_SECOND } },
});
