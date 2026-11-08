import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Card, ListCard, LoadState, PillButton, ScreenContainer, Text } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { friendlyError } from '@/features/auth/errors';
import { Notice } from '@/features/auth/Notice';
import { createPatientProfile, fetchRoster } from '@/features/care/api';
import { EmptyState } from '@/features/results/EmptyState';
import { patientSummary } from '@/features/results/derive';
import { colors, space, WIDE } from '@/lib/theme';
import { useLoader } from '@/lib/useLoader';

export default function DashboardScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const { profile } = useAuth();
  const roster = useLoader(fetchRoster, []);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const patients = roster.data ?? [];

  const addPatient = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createPatientProfile();
      setNewCode(created.careCode);
      roster.reload();
    } catch (e) {
      setCreateError(friendlyError(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScreenContainer gap={wide ? space.xl : space.lg}>
      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          alignItems: wide ? 'flex-end' : 'stretch',
          justifyContent: 'space-between',
          gap: space.lg,
        }}
      >
        <View style={{ gap: space.xs, flexShrink: 1 }}>
          <Text variant="display" accessibilityRole="header">
            Patients
          </Text>
          <Text variant="body" muted>
            {profile?.displayName
              ? `${profile.displayName}, review your patients and their latest activity.`
              : 'Review your patients and their latest activity.'}
          </Text>
        </View>
        <PillButton
          label={creating ? 'Creating…' : 'New patient'}
          icon="person-add"
          size="lg"
          fullWidth={!wide}
          disabled={creating}
          onPress={addPatient}
        />
      </View>

      {createError ? <Notice tone="error" text={createError} /> : null}

      {newCode ? (
        // The screen's one Cherry Blossom highlight: the code the clinician has to pass on.
        <Card tone="accent" style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="key" size={18} color={colors.graphite} />
            </View>
            <Text variant="headline">New patient care code</Text>
          </View>
          <Text
            selectable
            accessibilityLabel={`Care code ${newCode.split('').join(' ')}`}
            style={{ fontSize: 40, lineHeight: 48, fontWeight: '800', letterSpacing: 3, fontVariant: ['tabular-nums'] }}
          >
            {newCode}
          </Text>
          <Text variant="callout">
            Share this code with your patient. They can enter it while creating their account to connect with your care
            team.
          </Text>
          <PillButton label="Done" variant="secondary" onPress={() => setNewCode(null)} />
        </Card>
      ) : null}

      <Card style={{ gap: space.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: space.md,
          }}
        >
          <Text variant="headline">Care roster</Text>
          {roster.data ? (
            <Text variant="callout" weight={700} muted>
              {patients.length === 1 ? '1 patient' : `${patients.length} patients`}
            </Text>
          ) : null}
        </View>

        {roster.data === undefined ? (
          <LoadState error={roster.error} onRetry={roster.reload} />
        ) : patients.length > 0 ? (
          <View style={{ gap: space.sm }}>
            {patients.map((patient) => {
              const summary = patientSummary(patient);
              const score = patient.latest ? String(patient.latest.gaitScore) : undefined;
              return (
                <ListCard
                  key={patient.id}
                  title={patient.careCode}
                  subtitle={summary}
                  icon={patient.status === 'waiting' ? 'hourglass' : 'person'}
                  trailing={score}
                  accessibilityLabel={`Patient ${patient.careCode}, ${summary}${score ? `, latest gait score ${score}` : ''}`}
                  onPress={() => router.push(`/patients/${patient.id}`)}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="people"
            title="No patients yet"
            line="Create a patient profile to get a care code. Your patient enters it when they sign up."
            action={false}
          />
        )}
      </Card>
    </ScreenContainer>
  );
}
