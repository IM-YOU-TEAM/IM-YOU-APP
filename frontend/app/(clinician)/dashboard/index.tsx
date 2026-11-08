import { router } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { Card, ListCard, ScreenContainer, Text } from '@/components';
import { EmptyState } from '@/features/results/EmptyState';
import { clinician, patients, sessionsFor } from '@/lib/data';
import { space, WIDE } from '@/lib/theme';

export default function DashboardScreen() {
  const wide = useWindowDimensions().width >= WIDE;

  return (
    <ScreenContainer gap={wide ? space.xl : space.lg}>
      <View style={{ gap: space.xs }}>
        <Text variant="display" accessibilityRole="header">
          Patients
        </Text>
        <Text variant="body" muted>
          {clinician
            ? `${clinician.name}, review your assigned patients and their latest activity.`
            : 'Review assigned patients and their latest activity.'}
        </Text>
      </View>

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
          <Text variant="callout" weight={700} muted>
            {patients.length === 1 ? '1 patient' : `${patients.length} patients`}
          </Text>
        </View>

        {patients.length > 0 ? (
          <View style={{ gap: space.sm }}>
            {patients.map((patient) => {
              const sessionCount = sessionsFor(patient.id).length;
              const sessionLabel = sessionCount === 1 ? '1 session' : `${sessionCount} sessions`;

              return (
                <ListCard
                  key={patient.id}
                  title={patient.name}
                  subtitle={`${patient.condition} · ${sessionLabel}`}
                  icon="person"
                  trailing={`${patient.adherence}%`}
                  accessibilityLabel={`${patient.name}, ${patient.condition}, ${sessionLabel}, ${patient.adherence}% adherence`}
                  onPress={() => router.push(`/patients/${patient.id}`)}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="people"
            title="No patients assigned"
            line="Assigned patients will appear here with their activity and adherence."
            action={false}
          />
        )}
      </Card>
    </ScreenContainer>
  );
}
