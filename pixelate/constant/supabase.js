// constant/supabase.js
import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// Detect native vs web
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// Only use SecureStore on native
const ExpoSecureStoreAdapter = isNative
  ? {
      getItem: (key) => {
        return SecureStore.getItemAsync(key);
      },
      setItem: (key, value) => {
        return SecureStore.setItemAsync(key, value);
      },
      removeItem: (key) => {
        return SecureStore.deleteItemAsync(key);
      },
    }
  : null;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars missing: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Only inject custom storage on native; on web/SSR, let Supabase use default storage
    ...(ExpoSecureStoreAdapter ? { storage: ExpoSecureStoreAdapter } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
