import { router } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Card, ListCard, LoadState, PillButton, ScreenContainer, Text } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { AddPatientCard } from '@/features/care/AddPatientCard';
import { fetchRoster, patientName } from '@/features/care/api';
import { EmptyState } from '@/features/results/EmptyState';
import { patientSummary } from '@/features/results/derive';
import { formatDate } from '@/lib/format';
import { space, WIDE } from '@/lib/theme';
import { useLoader } from '@/lib/useLoader';

export default function DashboardScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const { profile } = useAuth();
  const roster = useLoader(fetchRoster, []);
  const [adding, setAdding] = useState(false);
  const patients = roster.data ?? [];

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
          label="New patient"
          icon="person-add"
          size="lg"
          fullWidth={!wide}
          disabled={adding}
          onPress={() => setAdding(true)}
        />
      </View>

      {adding ? <AddPatientCard onAdded={roster.reload} onClose={() => setAdding(false)} /> : null}

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
              const name = patientName(patient);
              const summary = patientSummary(patient);
              const last = patient.latest ? formatDate(patient.latest.date) : undefined;
              return (
                <ListCard
                  key={patient.id}
                  title={name}
                  subtitle={summary}
                  icon={patient.status === 'waiting' ? 'hourglass' : 'person'}
                  trailing={last}
                  accessibilityLabel={`${name}, ${summary}${last ? `, last session ${last}` : ''}`}
                  onPress={() => router.push(`/patients/${patient.id}`)}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="people"
            title="No patients yet"
            line="Add a patient with their name and a username. They sign in with the login you give them."
            action={false}
          />
        )}
      </Card>
    </ScreenContainer>
  );
}
