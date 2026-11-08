import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Card, Logo, PillButton, ScreenContainer, SegmentedToggle, Text } from '@/components';
import { space } from '@/lib/theme';

type Role = 'patient' | 'clinician';

const ROLE_OPTIONS = [
  { value: 'patient', label: 'Patient' },
  { value: 'clinician', label: 'Clinician' },
] as const;

export default function SignupScreen() {
  const [role, setRole] = useState<Role>('patient');
  const roleCopy =
    role === 'patient'
      ? 'Track guided movement sessions and review your progress.'
      : 'Review assigned patients and follow their recent progress.';

  const continueToPreview = () => {
    router.replace(role === 'patient' ? '/home' : '/dashboard');
  };

  return (
    <ScreenContainer maxWidth={480} contentStyle={{ flex: 1, justifyContent: 'center' }}>
      <Card style={{ gap: space.xxl, padding: space.xxl }}>
        <View style={{ gap: space.lg }}>
          <Logo size={52} />
          <View style={{ gap: space.sm }}>
            <Text variant="display" accessibilityRole="header">
              Preview your workspace
            </Text>
            <Text variant="body" muted>
              Pick a role to explore the experience before account setup is available.
            </Text>
          </View>
        </View>

        <View style={{ gap: space.md }}>
          <SegmentedToggle
            options={ROLE_OPTIONS}
            value={role}
            onChange={setRole}
            accessibilityLabel="Preview role"
            style={{ alignSelf: 'stretch' }}
          />
          <Text variant="callout" muted accessibilityLiveRegion="polite">
            {roleCopy}
          </Text>
        </View>

        <View style={{ gap: space.md }}>
          <PillButton
            label={`Continue as ${role}`}
            icon={role === 'patient' ? 'walk' : 'medkit'}
            size="lg"
            fullWidth
            onPress={continueToPreview}
          />
          <PillButton
            label="Back"
            icon="arrow-back"
            variant="ghost"
            fullWidth
            onPress={() => router.replace('/login')}
          />
        </View>

        <Text variant="caption" muted align="center">
          Preview activity stays on this device and is not saved.
        </Text>
      </Card>
    </ScreenContainer>
  );
}
