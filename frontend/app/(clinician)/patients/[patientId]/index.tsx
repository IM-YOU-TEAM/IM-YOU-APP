import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import {
  Avatar,
  BentoGrid,
  Card,
  ListCard,
  MetricRow,
  PillButton,
  ScreenContainer,
  Text,
  type Metric,
} from '@/components';
import { EmptyState } from '@/features/results/EmptyState';
import { sessionRow } from '@/features/results/derive';
import { getPatient, MOTION_ICONS, sessionsFor } from '@/lib/data';
import { colors, space, WIDE } from '@/lib/theme';

export default function PatientDetailScreen() {
  const params = useLocalSearchParams<{ patientId?: string | string[] }>();
  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId;
  const patient = patientId ? getPatient(patientId) : undefined;
  const wide = useWindowDimensions().width >= WIDE;

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
  const latest = patientSessions.at(-1);
  const recent = [...patientSessions].reverse().slice(0, 5);
  const metrics: Metric[] = [
    { label: 'Age', value: String(patient.age) },
    { label: 'Adherence', value: `${patient.adherence}%` },
    { label: 'Sessions', value: String(patientSessions.length) },
    { label: 'Gait score', value: latest ? String(latest.gaitScore) : '—' },
  ];

  return (
    <ScreenContainer gap={wide ? space.xl : space.lg}>
      <PillButton
        label="Patients"
        icon="arrow-back"
        variant="ghost"
        onPress={() => router.replace('/dashboard')}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.lg,
          flexWrap: 'wrap',
        }}
      >
        <Avatar name={patient.name} size="lg" />
        <View style={{ flex: 1, minWidth: 220, gap: space.xs }}>
          <Text variant="display" accessibilityRole="header">
            {patient.name}
          </Text>
          <Text variant="body" muted>
            {patient.condition}
          </Text>
        </View>
      </View>

      <Card>
        {wide ? (
          <MetricRow items={metrics} />
        ) : (
          <View style={{ gap: space.lg }}>
            <MetricRow items={metrics.slice(0, 2)} />
            <View style={{ height: 1, backgroundColor: colors.divider }} />
            <MetricRow items={metrics.slice(2)} />
          </View>
        )}
      </Card>

      <BentoGrid weights={[2, 1]}>
        <Card style={{ flex: 1, gap: space.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: space.sm,
            }}
          >
            <Text variant="headline">Recent sessions</Text>
            <Text variant="callout" weight={700} muted>
              {patientSessions.length === 0 ? 'None yet' : `${patientSessions.length} total`}
            </Text>
          </View>

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
                    trailing={`${session.gaitScore}`}
                    chevron={false}
                    accessibilityLabel={`${row.title}, ${row.subtitle}, gait score ${session.gaitScore}`}
                  />
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="analytics"
              title="No sessions yet"
              line="This patient's completed sessions will appear here."
              action={false}
            />
          )}
        </Card>

        <Card tone="accent" style={{ flex: 1, gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.white,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="clipboard" size={19} color={colors.graphite} />
            </View>
            <Text variant="headline">Care plan</Text>
          </View>

          {patient.exercises.length > 0 ? (
            <View style={{ gap: space.lg }}>
              {patient.exercises.map((exercise, index) => (
                <View key={exercise.id} style={{ gap: space.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Ionicons name={exercise.icon} size={19} color={colors.graphite} />
                    <Text variant="headline" style={{ flex: 1 }}>
                      {exercise.name}
                    </Text>
                  </View>
                  <Text variant="callout" muted>
                    {exercise.dosage}
                  </Text>
                  {index < patient.exercises.length - 1 ? (
                    <View style={{ height: 1, backgroundColor: colors.border, marginTop: space.md }} />
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Text variant="body" muted>
              No exercises have been added to this care plan.
            </Text>
          )}
        </Card>
      </BentoGrid>
    </ScreenContainer>
  );
}
