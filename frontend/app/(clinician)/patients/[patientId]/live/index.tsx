import { router, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { Card, LoadState, MetricRow, PillButton, ScreenContainer, Text, type Metric } from '@/components';
import { fetchRosterPatient } from '@/features/care/api';
import { JointCurves } from '@/features/capture/imu/JointCurves';
import { DEVICE_ID, SITE_LABELS, SITES } from '@/features/capture/imu/protocol';
import { useLiveWatch, type LiveWatch } from '@/features/capture/imu/useLiveWatch';
import { EmptyState } from '@/features/results/EmptyState';
import { space, WIDE } from '@/lib/theme';
import { useLoader } from '@/lib/useLoader';

/** Live hip, knee and ankle curves for one patient while they stream from two phones. */
export default function PatientLiveScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const params = useLocalSearchParams<{ patientId?: string | string[] }>();
  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId;
  const loaded = useLoader(async () => (patientId ? fetchRosterPatient(patientId) : null), [patientId]);
  const live = useLiveWatch(patientId);

  const back = (
    <PillButton
      label={loaded.data ? loaded.data.careCode : 'Patients'}
      icon="arrow-back"
      variant="ghost"
      onPress={() => router.replace(patientId && loaded.data ? `/patients/${patientId}` : '/dashboard')}
    />
  );

  if (loaded.data === undefined) {
    return (
      <ScreenContainer gap={wide ? space.xl : space.lg}>
        {back}
        <Card>
          <LoadState error={loaded.error} onRetry={loaded.reload} minHeight={240} />
        </Card>
      </ScreenContainer>
    );
  }

  if (!loaded.data) {
    return (
      <ScreenContainer gap={space.xl}>
        {back}
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

  const metrics: Metric[] = [
    { label: 'Activity', value: live.lowMotion ? 'Quiet' : (live.activity ?? '—') },
    { label: 'Confidence', value: live.confidence > 0 ? `${Math.round(live.confidence * 100)}%` : '—' },
    { label: 'Phones', value: `${live.sites.length}/${SITES.length}` },
  ];

  return (
    <ScreenContainer maxWidth={1000} gap={wide ? space.xl : space.lg}>
      {back}

      <View style={{ gap: space.xs }}>
        <Text variant="display" accessibilityRole="header">
          Live joint angles
        </Text>
        <Text variant="body" muted accessibilityLiveRegion="polite">
          {watchPrompt(live)}
        </Text>
      </View>

      <Card>
        <MetricRow items={metrics} />
      </Card>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: space.lg }}>
        <View style={{ flex: wide ? 2 : undefined }}>
          <JointCurves angles={live.angles} caption={watchPrompt(live)} />
        </View>
        <Card style={{ flex: wide ? 1 : undefined, gap: space.lg, justifyContent: 'center' }}>
          {SITES.map((site) => {
            const hz = live.observedHz[DEVICE_ID[site]];
            return (
              <View key={site} style={{ gap: space.xs }}>
                <Text variant="headline">{SITE_LABELS[site]}</Text>
                <Text variant="callout" muted>
                  {live.sites.includes(site) ? 'Streaming' : 'Not connected yet'}
                  {hz ? ` · ${hz.toFixed(0)} Hz` : ''}
                </Text>
              </View>
            );
          })}
          <Text variant="caption" muted>
            Hip, knee and ankle are BioMAT predictions for the last 2.5 s. They are not a motion-capture measurement.
          </Text>
        </Card>
      </View>
    </ScreenContainer>
  );
}

function watchPrompt(live: LiveWatch): string {
  switch (live.gate) {
    case 'connecting':
      return 'Connecting to this patient’s stream…';
    case 'forbidden':
      return 'This stream is not on your care roster.';
    case 'waiting-for-phones':
      return 'Waiting for both phones. The patient signs in on each one and picks thigh or shin.';
    case 'waiting-for-model':
      return live.modelConnected
        ? 'Both phones are in. The patient taps Start on either phone to score a window.'
        : 'Both phones can stream, but the model service is not reachable, so the curves will wait.';
    case 'live':
      if (live.lowMotion) return live.reason ?? 'Not enough movement in this window.';
      return live.activity ? `Latest window: ${live.activity}.` : 'Reading the latest window.';
    default: {
      const unexpected: never = live.gate;
      return unexpected;
    }
  }
}
