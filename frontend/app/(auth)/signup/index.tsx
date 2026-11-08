import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Logo, PillButton, ScreenContainer, Text, TextField } from '@/components';
import type { Role } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { colors, continuous, MIN_HIT, radii, space } from '@/lib/theme';
import type { IconName } from '@/types';

const ROLE_OPTIONS = [
  {
    value: 'patient',
    label: 'Patient',
    description: 'Track sessions and view progress',
    icon: 'walk',
  },
  {
    value: 'clinician',
    label: 'Professional',
    description: 'Clinicians, researchers, and organizations',
    icon: 'people',
  },
] as const;

type RoleOptionProps = {
  value: Role;
  label: string;
  description: string;
  icon: IconName;
  selected: boolean;
  onPress: (value: Role) => void;
};

function RoleOption({ value, label, description, icon, selected, onPress }: RoleOptionProps) {
  return (
    <Pressable
      onPress={() => onPress(value)}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}. ${description}`}
      style={({ pressed }) => [
        styles.roleOption,
        selected && styles.roleOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.seagrass} />
      <View style={styles.roleCopy}>
        <Text variant="headline">{label}</Text>
        <Text variant="callout" muted>
          {description}
        </Text>
      </View>
      <View style={styles.checkSlot}>
        <View style={[styles.selectionRing, selected ? styles.selectionRingOn : styles.selectionRingOff]}>
          {selected ? <View style={styles.selectionDot} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function SignupScreen() {
  const [role, setRole] = useState<Role>('patient');
  const [fullName, setFullName] = useState('');
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
      options: { data: { role, full_name: fullName.trim() } },
    });
    setBusy(false);

    if (failure) {
      setError(failure.message);
      return;
    }
    // With email confirmation on, signUp returns no session: the account is not
    // usable until the link is clicked. With it off, we are already signed in.
    if (data.session) {
      router.replace('/');
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
              We sent a link to {email.trim()}. Open it, then sign in.
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
            Select how you'll use I'M U.
          </Text>
        </View>

        <View accessibilityRole="radiogroup" style={styles.roleGroup}>
          {ROLE_OPTIONS.map((option, index) => (
            <View key={option.value}>
              {index > 0 ? <View style={styles.separator} /> : null}
              <RoleOption
                {...option}
                selected={role === option.value}
                onPress={setRole}
              />
            </View>
          ))}
        </View>

        <View style={styles.fields}>
          <TextField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Optional"
            autoComplete="name"
            textContentType="name"
          />
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
  roleGroup: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    ...continuous,
  },
  roleOption: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  roleOptionSelected: {
    backgroundColor: colors.seagrassTint,
  },
  roleCopy: {
    flex: 1,
    gap: 2,
  },
  checkSlot: {
    width: 22,
    alignItems: 'center',
  },
  selectionRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionRingOn: {
    borderColor: colors.seagrass,
  },
  selectionRingOff: {
    borderColor: colors.border,
  },
  selectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.seagrass,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
    backgroundColor: colors.separator,
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
