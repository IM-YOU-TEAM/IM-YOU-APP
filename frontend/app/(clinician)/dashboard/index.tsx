import { router } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { Card, ListCard, ScreenContainer, Text } from '@/components';
import { useCareRoster } from '@/features/care/useCareRoster';
import { EmptyState } from '@/features/results/EmptyState';
import { space, WIDE } from '@/lib/theme';

export default function DashboardScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const { patients } = useCareRoster();

  return (
    <ScreenContainer gap={wide ? space.xl : space.lg}>
      <View style={{ gap: space.xs }}>
        <Text variant="display" accessibilityRole="header">
          Patients
        </Text>
        <Text variant="body" muted>
          Review assigned patients and watch a live sensor session.
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
            {patients.map((patient) => (
              <ListCard
                key={patient.id}
                title={patient.careCode}
                subtitle={patient.linked ? 'Linked · two-phone IMU ready' : 'Waiting to be claimed'}
                icon="person"
                trailing={patient.linked ? 'Live' : '—'}
                accessibilityLabel={`${patient.careCode}, ${patient.linked ? 'linked' : 'unclaimed'}`}
                onPress={() => router.push(`/patients/${patient.id}`)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="people"
            title="No patients assigned"
            line="Assigned patients will appear here with their activity and a live view."
            action={false}
          />
        )}
      </Card>
    </ScreenContainer>
  );
}
