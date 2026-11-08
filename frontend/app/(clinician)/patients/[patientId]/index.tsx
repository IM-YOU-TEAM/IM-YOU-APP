import { router, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { Card, ListCard, MetricRow, PillButton, ScreenContainer, Text, type Metric } from '@/components';
import { useCarePatient } from '@/features/care/useCareRoster';
import { EmptyState } from '@/features/results/EmptyState';
import { sessionRow } from '@/features/results/derive';
import { MOTION_ICONS, sessionsFor } from '@/lib/data';
import { space, WIDE } from '@/lib/theme';

export default function PatientDetailScreen() {
  const params = useLocalSearchParams<{ patientId?: string | string[] }>();
  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId;
  const { patient, ready } = useCarePatient(patientId);
  const wide = useWindowDimensions().width >= WIDE;

  if (!ready) return null;

  if (!patient) {
    return (
      <ScreenContainer gap={space.xl}>
        <View style={{ gap: space.xs }}>
          <Text variant="display" accessibilityRole="header">
            Patient not found
          </Text>
          <Text variant="body" muted>
            This patient may no longer be assigned to your care roster.
          </Text>
        </View>
        <Card style={{ gap: space.lg }}>
          <EmptyState
            icon="person-circle"
            title="We couldn't open this patient"
            line="Return to your patient list and choose another profile."
            action={false}
          />
          <PillButton
            label="Back to patients"
            icon="arrow-back"
            variant="secondary"
            fullWidth
            onPress={() => router.replace('/dashboard')}
          />
        </Card>
      </ScreenContainer>
    );
  }

  const patientSessions = sessionsFor(patient.id);
  const recent = [...patientSessions].reverse().slice(0, 5);
  const metrics: Metric[] = [
    { label: 'Care code', value: patient.careCode },
    { label: 'Link', value: patient.linked ? 'Linked' : 'Open' },
    { label: 'Sessions', value: String(patientSessions.length) },
  ];

  return (
    <ScreenContainer gap={wide ? space.xl : space.lg}>
      <PillButton label="Patients" icon="arrow-back" variant="ghost" onPress={() => router.replace('/dashboard')} />

      <View style={{ gap: space.xs }}>
        <Text variant="display" accessibilityRole="header">
          {patient.careCode}
        </Text>
        <Text variant="body" muted>
          {patient.linked
            ? 'This patient can stream two-phone sensors into the live joint-angle view.'
            : 'Waiting for the patient to claim this care code.'}
        </Text>
      </View>

      <Card>
        <MetricRow items={metrics} />
      </Card>

      {patient.linked ? (
        <PillButton
          label="Watch live joint angles"
          icon="pulse"
          size="lg"
          fullWidth={!wide}
          onPress={() => router.push(`/patients/${patient.id}/live`)}
        />
      ) : null}

      <Card style={{ gap: space.md }}>
        <Text variant="headline">Recent sessions</Text>
        {recent.length > 0 ? (
          <View style={{ gap: space.sm }}>
            {recent.map((session) => {
              const row = sessionRow(session);
              return (
                <ListCard
                  key={session.id}
                  title={row.title}
                  subtitle={row.subtitle}
                  icon={MOTION_ICONS[session.motion]}
                  trailing={session.movementVerified === false ? '—' : `${session.gaitScore}`}
                  chevron={false}
                  accessibilityLabel={`${row.title}, ${row.subtitle}`}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="analytics"
            title="No sessions yet"
            line="Completed sessions will appear here. Live IMU curves are on Watch live."
            action={false}
          />
        )}
      </Card>
    </ScreenContainer>
  );
}
