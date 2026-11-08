import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GlassCard, Logo, PillButton, ScreenContainer, Text, TextField } from '@/components';
import { supabase } from '@/lib/supabase/client';
import { colors, MIN_HIT, radii, space } from '@/lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setError('');
    setBusy(true);
    const { error: failure } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (failure) {
      setError(failure.message);
      return;
    }
    // The index route reads the profile and sends patients and clinicians to
    // their own workspace, so sign-in does not need to know the role.
    router.replace('/');
  };

  const ready = email.trim().length > 0 && password.length > 0 && !busy;

  return (
    <ScreenContainer
      maxWidth={560}
      gap={0}
      contentStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <GlassCard
        padding={space.xxl}
        radius={radii.lg}
        intensity={55}
        style={{ width: '100%', maxWidth: 480 }}
      >
        <View style={{ width: '100%', alignItems: 'center', gap: space.xxl }}>
          <Logo size={56} />

          <Text variant="display" align="center" accessibilityRole="header">
            Welcome to I'M U
          </Text>

          <View style={{ width: '100%', gap: space.lg }}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              inputMode="email"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              secureTextEntry
              onSubmitEditing={() => {
                if (ready) void signIn();
              }}
              returnKeyType="go"
              error={error || undefined}
            />
          </View>

          <View style={{ width: '100%', alignItems: 'center', gap: space.sm }}>
            <PillButton
              label={busy ? 'Signing in…' : 'Sign in'}
              icon="arrow-forward"
              iconRight
              size="lg"
              fullWidth
              disabled={!ready}
              onPress={() => void signIn()}
            />

            <Pressable
              onPress={() => router.replace('/signup')}
              accessibilityRole="button"
              accessibilityLabel="Create an account"
              hitSlop={8}
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            >
              <Text variant="callout" weight={600} color={colors.seagrass}>
                Create an account
              </Text>
            </Pressable>
          </View>

          <Text variant="caption" muted align="center">
            For patients, clinicians, researchers, and organization teams
          </Text>
        </View>
      </GlassCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: MIN_HIT,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  pressed: {
    opacity: 0.65,
  },
});
