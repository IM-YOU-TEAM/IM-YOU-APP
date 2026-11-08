import { router, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { Card, MetricRow, PillButton, ScreenContainer, Text } from '@/components';
import { useCarePatient } from '@/features/care/useCareRoster';
import { JointCurves } from '@/features/capture/imu/JointCurves';
import { DEVICE_ID, SITE_LABELS, SITES } from '@/features/capture/imu/protocol';
import { useLiveWatch } from '@/features/capture/imu/useLiveWatch';
import { EmptyState } from '@/features/results/EmptyState';
import { space, WIDE } from '@/lib/theme';

export default function PatientLiveScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const params = useLocalSearchParams<{ patientId?: string | string[] }>();
  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId;
  const { patient, ready } = useCarePatient(patientId);
  const live = useLiveWatch(patientId);

  if (!ready) return null;

  if (!patient) {
    return (
      <ScreenContainer gap={space.xl}>
        <PillButton label="Patients" icon="arrow-back" variant="ghost" onPress={() => router.replace('/dashboard')} />
        <Card>
          <EmptyState
            icon="person-circle"
            title="We couldn't open this patient"
            line="Return to your patient list and choose another profile."
            action={false}
          />
        </Card>
      </ScreenContainer>
    );
  }

  const metrics = [
    { label: 'Activity', value: live.lowMotion ? 'Quiet' : (live.activity ?? '—') },
    { label: 'Confidence', value: live.confidence > 0 ? `${Math.round(live.confidence * 100)}%` : '—' },
    {
      label: 'Phones',
      value: `${live.sites.length}/${SITES.length}`,
    },
  ];

  return (
    <ScreenContainer maxWidth={1000} gap={wide ? space.xl : space.lg}>
      <PillButton
        label={patient.careCode}
        icon="arrow-back"
        variant="ghost"
        onPress={() => router.replace(`/patients/${patient.id}`)}
      />

      <View style={{ gap: space.xs }}>
        <Text variant="caption" weight={700} style={{ letterSpacing: 1.6 }}>
          MOTION LAB / CAMARGO
        </Text>
        <Text variant="display" accessibilityRole="header">
          Live joint angles
        </Text>
        <Text variant="body" muted>
          {watchPrompt(live)}
        </Text>
      </View>

      <Card>
        <MetricRow items={metrics} />
      </Card>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: space.lg }}>
        <View style={{ flex: 2 }}>
          <JointCurves angles={live.angles} caption={watchPrompt(live)} />
        </View>
        <Card style={{ flex: 1, gap: space.lg, justifyContent: 'center' }}>
          {SITES.map((site) => (
            <View key={site} style={{ gap: space.xs }}>
              <Text variant="headline">{SITE_LABELS[site]}</Text>
              <Text variant="callout" muted>
                {live.sites.includes(site) ? 'Streaming' : 'Not on the channel yet'}
                {live.observedHz[DEVICE_ID[site]] ? ` · ${live.observedHz[DEVICE_ID[site]].toFixed(0)} Hz` : ''}
              </Text>
            </View>
          ))}
          <Text variant="caption" muted>
            Hip, knee and ankle are BioMAT predictions on the last 2.5 s. They are not a motion-capture measurement.
          </Text>
        </Card>
      </View>
    </ScreenContainer>
  );
}

function watchPrompt(live: ReturnType<typeof useLiveWatch>): string {
  switch (live.gate) {
    case 'connecting':
      return 'Connecting to this patient’s stream…';
    case 'forbidden':
      return 'This stream is not on your care roster.';
    case 'waiting-for-phones':
      return 'Waiting for both phones. The patient signs in on each one and picks thigh or shin.';
    case 'waiting-for-model':
      return live.modelConnected
        ? 'Both phones are in. Start the session on either phone to score a window.'
        : 'Both phones can stream. The model service is not reachable, so joint curves will wait.';
    case 'live':
      if (live.lowMotion) return live.reason ?? 'Not enough movement in this window.';
      return live.activity ? `Latest window: ${live.activity}.` : 'Reading the latest window.';
    default: {
      const unexpected: never = live.gate;
      return unexpected;
    }
  }
}
