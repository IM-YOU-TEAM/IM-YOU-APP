import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { colors } from '@/lib/theme';
import { applyWebStyles } from '@/lib/webStyles';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  // Text uses each platform's system UI font; only the icon glyph font needs loading.
  const [loaded, error] = useFonts({
    ...Ionicons.font,
  });
  const ready = loaded || !!error;

  useEffect(() => {
    applyWebStyles();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // Native: wait for the icon font so controls do not shift after first paint.
  if (!ready && Platform.OS !== 'web') return null;

  // Web: keep the Stack mounted so deep links like /patients/p1 keep their route,
  // and hide it behind a plain Honeydew cover until the fonts are ready.
  return (
    <>
      <StatusBar style="dark" />
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false, title: "I'M U", contentStyle: { backgroundColor: colors.honeydew } }} />
      </AuthProvider>
      {!ready && <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.honeydew }]} />}
    </>
  );
}
