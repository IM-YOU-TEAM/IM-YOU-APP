<<<<<<< HEAD
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { colors } from "@/lib/theme";
import { applyWebStyles } from "@/lib/webStyles";
=======
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { PillButton, Text } from '@/components';
import { signOut } from '@/features/auth/auth';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { useAuthGate } from '@/features/auth/useAuthGate';
import { colors, space } from '@/lib/theme';
import { applyWebStyles } from '@/lib/webStyles';
>>>>>>> origin/main

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

  return (
    <AuthProvider>
      <RootStack fontsReady={ready} />
    </AuthProvider>
  );
}

function RootStack({ fontsReady }: { fontsReady: boolean }) {
  const { status, refresh } = useAuth();
  useAuthGate();
  const settled = fontsReady && status !== 'loading';

  useEffect(() => {
    if (settled) SplashScreen.hideAsync().catch(() => undefined);
  }, [settled]);

  // Native: wait for the icon font so controls do not shift after first paint.
<<<<<<< HEAD
  if (!ready && Platform.OS !== "web") return null;
=======
  if (!fontsReady && Platform.OS !== 'web') return null;
>>>>>>> origin/main

  // Web: keep the Stack mounted so deep links like /patients/p1 keep their route,
  // and hide it behind a plain Honeydew cover until fonts and the session are ready.
  return (
    <>
      <StatusBar style="dark" />
<<<<<<< HEAD
      <Stack
        screenOptions={{
          headerShown: false,
          title: "I'M YOU",
          contentStyle: { backgroundColor: colors.honeydew },
        }}
      />
      {!ready && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.honeydew },
          ]}
        />
      )}
=======
      <Stack screenOptions={{ headerShown: false, title: "I'M YOU", contentStyle: { backgroundColor: colors.honeydew } }} />
      {status === 'error' ? (
        <View style={[StyleSheet.absoluteFill, styles.cover, styles.center]}>
          <Text variant="headline" align="center">
            We couldn't load your account
          </Text>
          <Text variant="callout" muted align="center" style={{ maxWidth: 300 }}>
            Check your connection, then try again.
          </Text>
          <View style={{ gap: space.sm, marginTop: space.md }}>
            <PillButton label="Try again" icon="refresh" onPress={refresh} />
            <PillButton label="Sign out" variant="ghost" onPress={() => signOut().catch(() => undefined)} />
          </View>
        </View>
      ) : !settled ? (
        <View style={[StyleSheet.absoluteFill, styles.cover]} />
      ) : null}
>>>>>>> origin/main
    </>
  );
}

const styles = StyleSheet.create({
  cover: { backgroundColor: colors.honeydew },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.xl },
});
