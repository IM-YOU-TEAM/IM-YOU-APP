import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';
import { applyWebStyles } from '@/lib/webStyles';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  // Brand font. To swap it, change these imports and `fonts` in src/lib/theme.ts.
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    ...Ionicons.font, // icons ready on first paint
  });
  const ready = loaded || !!error;

  useEffect(() => {
    applyWebStyles();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // Native: wait for fonts, or text is measured with the fallback font and gets cut off.
  if (!ready && Platform.OS !== 'web') return null;

  // Web: keep the Stack mounted so deep links like /patients/p1 keep their route,
  // and hide it behind a plain Honeydew cover until the fonts are ready.
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, title: "I'M U", contentStyle: { backgroundColor: colors.honeydew } }} />
      {!ready && <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.honeydew }]} />}
    </>
  );
}
