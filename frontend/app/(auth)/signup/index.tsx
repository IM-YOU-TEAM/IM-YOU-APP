import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Logo, PillButton, ScreenContainer, Text, TextField } from '@/components';
import { supabase } from '@/lib/supabase/client';
import { colors, MIN_HIT, space } from '@/lib/theme';

// Account first, role second. profiles.role starts null and only
// complete_onboarding() can set it, which needs a session, so the role choice
// lives on /onboarding after the account exists.
export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const createAccount = async () => {
    setError('');
    setBusy(true);
    const { data, error: failure } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (failure) {
      setError(failure.message);
      return;
    }
    // With email confirmation on, signUp returns no session and the role has to
    // wait until the link is clicked. With it off, we can onboard right away.
    if (data.session) {
      router.replace('/onboarding');
      return;
    }
    setConfirmSent(true);
  };

  const ready = email.trim().length > 0 && password.length >= 6 && !busy;

  if (confirmSent) {
    return (
      <ScreenContainer
        maxWidth={400}
        gap={0}
        contentStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <View style={styles.content}>
          <Logo size={46} />
          <View style={styles.heading}>
            <Text variant="title" align="center" accessibilityRole="header">
              Confirm your email
            </Text>
            <Text variant="callout" muted align="center">
              We sent a link to {email.trim()}. Open it, then sign in to finish setting up.
            </Text>
          </View>
          <PillButton label="Back to sign in" fullWidth onPress={() => router.replace('/login')} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      maxWidth={400}
      gap={0}
      contentStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <View style={styles.content}>
        <Logo size={46} />

        <View style={styles.heading}>
          <Text variant="title" align="center" accessibilityRole="header">
            Create your account
          </Text>
          <Text variant="callout" muted align="center">
            You'll pick how you use I'M U next.
          </Text>
        </View>

        <View style={styles.fields}>
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
            placeholder="At least 6 characters"
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            secureTextEntry
            onSubmitEditing={() => {
              if (ready) void createAccount();
            }}
            returnKeyType="go"
            error={error || undefined}
          />
        </View>

        <View style={styles.actions}>
          <PillButton
            label={busy ? 'Creating account…' : 'Continue'}
            icon="arrow-forward"
            iconRight
            fullWidth
            disabled={!ready}
            onPress={() => void createAccount()}
          />

          <Pressable
            onPress={() => router.replace('/login')}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text variant="callout" weight={600} color={colors.seagrass}>
              Back
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: space.xxl,
  },
  heading: {
    alignItems: 'center',
    gap: space.xs,
  },
  fields: {
    width: '100%',
    gap: space.lg,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: space.sm,
  },
  backButton: {
    minHeight: MIN_HIT,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  pressed: {
    opacity: 0.65,
  },
});
