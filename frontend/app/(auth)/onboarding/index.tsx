import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Logo, PillButton, ScreenContainer, Text, TextField } from '@/components';
import { homeFor, useAuth, type Role } from '@/features/auth/AuthProvider';
import { completeOnboarding } from '@/features/auth/onboarding';
import { RolePicker } from '@/features/auth/RolePicker';
import { space } from '@/lib/theme';

// Step after the first sign-in: profiles.role starts null, and only
// complete_onboarding() may set it. Patients also get their pseudonymous
// patient record here, either fresh or claimed from a clinician's care code.
export default function OnboardingScreen() {
  const { session, role: existingRole, ready, roleReady, refreshRole } = useAuth();
  const [role, setRole] = useState<Role>('patient');
  const [displayName, setDisplayName] = useState('');
  const [careCode, setCareCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    const message = await completeOnboarding({ role, displayName, careCode });

    if (message) {
      setBusy(false);
      setError(message);
      return;
    }
    // Setting the role is an RPC, not a session change, so pull it before
    // routing or the index route would send us right back here.
    await refreshRole();
    setBusy(false);
    router.replace('/');
  };

  if (!ready) return null;
  if (!session) return <Redirect href="/login" />;
  // Already onboarded: never let this screen try to set a second role.
  if (roleReady && existingRole != null) return <Redirect href={homeFor(existingRole)} />;

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
            How will you use I'M U?
          </Text>
          <Text variant="callout" muted align="center">
            This sets up your account and cannot be changed later.
          </Text>
        </View>

        <RolePicker role={role} onChange={setRole} />

        {role === 'clinician' ? (
          <TextField
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Dr. Rivera"
            autoComplete="name"
            textContentType="name"
            error={error || undefined}
          />
        ) : (
          <TextField
            label="Care code (optional)"
            value={careCode}
            onChangeText={setCareCode}
            placeholder="ABCD-2345"
            autoCapitalize="characters"
            autoCorrect={false}
            error={error || undefined}
          />
        )}

        <Text variant="caption" muted align="center">
          {role === 'clinician'
            ? 'Linked patients see this name on your notes.'
            : 'Have a code from your clinician? Enter it to share your sessions with them. You can skip this.'}
        </Text>

        <PillButton
          label={busy ? 'Setting up…' : 'Continue'}
          icon="arrow-forward"
          iconRight
          fullWidth
          disabled={busy}
          onPress={() => void submit()}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: space.xl,
  },
  heading: {
    alignItems: 'center',
    gap: space.xs,
  },
});
