import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Avatar, Card, PillButton, Text } from '@/components';
import { AuthField } from '@/features/auth/AuthField';
import { useAuth } from '@/features/auth/AuthProvider';
import { friendlyError } from '@/features/auth/errors';
import { MOTION_LABELS } from '@/lib/data';
import { colors, space } from '@/lib/theme';
import { claimCareCode } from './api';

/** Home tile: the patient's doctor, what they assigned, and Start tracking. */
export function CareTeamCard() {
  const { patient, refresh } = useAuth();
  const [code, setCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const doctorName = patient?.clinicianName;
  const linked = patient?.clinicianId != null;
  const assigned = patient?.assignedMotions ?? [];
  const assignedLine =
    assigned.length === 0
      ? 'No movement assigned yet.'
      : assigned.map((motion) => MOTION_LABELS[motion]).join(', ');

  const link = async () => {
    if (!code.trim()) {
      setError('Enter the care code from your clinician.');
      return;
    }
    setLinking(true);
    setError(null);
    try {
      await claimCareCode(code);
      setCode('');
      await refresh();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLinking(false);
    }
  };

  const startTracking = () => {
    const motion = assigned.length === 1 ? assigned[0] : undefined;
    router.push(motion ? { pathname: '/track/motion-type', params: { motion } } : '/track/motion-type');
  };

  return (
    <Card style={{ flex: 1, gap: space.md, minHeight: 160, justifyContent: 'center' }}>
      {linked ? (
        <View style={{ gap: space.md }}>
          <View
            accessible
            accessibilityLabel={`${doctorName ?? 'Your doctor'}, your doctor. Assigned: ${assignedLine}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}
          >
            <Avatar name={doctorName ?? 'Doctor'} size="lg" />
            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <Text variant="headline" numberOfLines={2}>
                {doctorName ?? 'Your doctor'}
              </Text>
              <Text variant="callout" muted>
                Assigned
              </Text>
              <Text variant="callout" weight={700} numberOfLines={3}>
                {assignedLine}
              </Text>
            </View>
          </View>
          {assigned.length > 0 ? (
            <PillButton label="Start tracking" icon="play" fullWidth onPress={startTracking} />
          ) : null}
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <View style={{ gap: space.xs }}>
            <Text variant="headline">Your doctor</Text>
            <Text variant="callout" muted>
              Enter the care code they gave you to share your sessions.
            </Text>
          </View>
          <AuthField
            label="Care code"
            placeholder="Care code, e.g. K7QM-4XPR"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={9}
            returnKeyType="done"
            onSubmitEditing={link}
          />
          {error ? (
            <Text variant="callout" weight={700} color={colors.cherry}>
              {error}
            </Text>
          ) : null}
          <PillButton
            label={linking ? 'Linking…' : 'Link doctor'}
            icon="link"
            variant="secondary"
            fullWidth
            disabled={linking}
            onPress={link}
          />
        </View>
      )}
    </Card>
  );
}
