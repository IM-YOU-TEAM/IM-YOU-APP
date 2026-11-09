import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Card, LineChart, LoadState, MetricRow, PillButton, ScreenContainer, SegmentedToggle, Text, type Metric } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { SessionJointCurves } from '@/features/capture/imu/SessionJointCurves';
import { fetchSessions } from '@/features/results/api';
import { METHOD_LABELS, MOTION_ICONS, MOTION_LABELS, today } from '@/lib/data';
import { formatDuration } from '@/lib/format';
import { colors, space, WIDE } from '@/lib/theme';
import { useLoader } from '@/lib/useLoader';
import type { CaptureMethod, SessionAssessmentMetric } from '@/types';
import { EmptyState } from '@/features/results/EmptyState';
import { gaitSeries, sessionWhen, type Range } from '@/features/results/derive';

const RANGES = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const;

const CHART_HEIGHT = 240;

export default function SessionResultsScreen() {
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const wide = useWindowDimensions().width >= WIDE;
  const [range, setRange] = useState<Range>('week');
  const { patient } = useAuth();
  const patientId = patient?.id;
  const back = <PillButton label="Results" icon="arrow-back" variant="ghost" onPress={() => router.replace('/results')} />;

  const loaded = useLoader(async () => {
    const all = patientId ? await fetchSessions(patientId) : [];
    const session = sessionId ? all.find((s) => s.id === sessionId) : undefined;
    return { all, session };
  }, [patientId, sessionId]);

  if (!loaded.data) {
    return (
      <ScreenContainer gap={wide ? 24 : 16}>
        {back}
        <Text variant="display" accessibilityRole="header">
          Results
        </Text>
        <Card>
          <LoadState error={loaded.error} onRetry={loaded.reload} minHeight={240} />
        </Card>
      </ScreenContainer>
    );
  }

  const { all, session } = loaded.data;

  if (!session) {
    return (
      <ScreenContainer gap={wide ? 24 : 16}>
        {back}
        <Text variant="display" accessibilityRole="header">
          Results
        </Text>
        <Card>
          <EmptyState
            icon="stats-chart"
            title="No results yet"
            line={
              sessionId
                ? "We couldn't find that session. Track a new one to see fresh results."
                : 'Track a session and the numbers we actually measured will show up here.'
            }
          />
        </Card>
      </ScreenContainer>
    );
  }

  const series = gaitSeries(all, range, today());
  const symmetryHidden = session.symmetryMeasured === false;
  const farLegHidden = session.farLegHidden === true;
  const movementNotVerified = session.movementVerified === false;
  const countBit = session.reps != null ? `${session.reps} reps` : session.stepCount != null ? `${session.stepCount} steps` : null;
  const sensorRanges = session.method === 'imu' ? (session.assessmentMetrics ?? []).slice(0, 3) : [];
  const metrics: Metric[] =
    session.method === 'imu'
      ? [
          { label: 'Duration', value: formatDuration(session.durationSec) },
          ...sensorRanges.map((metric) => ({ label: metric.label, value: `${metric.value}${metric.unit}` })),
        ]
      : [
          { label: 'Movement score', value: movementNotVerified ? '—' : String(session.gaitScore) },
          { label: 'Symmetry', value: symmetryHidden ? '—' : `${session.symmetry}%` },
          { label: 'Duration', value: formatDuration(session.durationSec) },
        ];

  return (
    <ScreenContainer gap={wide ? 24 : 16}>
      {back}
      {/* Header: motion + date */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.burntOrangeTint, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={MOTION_ICONS[session.motion]} size={26} color={colors.burntOrange} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="display" accessibilityRole="header">
            {MOTION_LABELS[session.motion]}
          </Text>
          <Text variant="body" muted>
            {sessionWhen(session)} · {METHOD_LABELS[session.method]}
            {countBit ? ` · ${countBit}` : ''}
          </Text>
        </View>
      </View>

      {/* Metrics: one row on wide screens, two rows of two on phones */}
      <Card style={{ gap: space.md }}>
        {wide || metrics.length <= 2 ? (
          <MetricRow items={metrics} />
        ) : (
          <View style={{ gap: space.lg }}>
            <MetricRow items={metrics.slice(0, 2)} />
            <View style={{ height: 1, backgroundColor: colors.divider }} />
            <MetricRow items={metrics.slice(2)} />
          </View>
        )}
        {farLegHidden ? (
          <Text variant="callout" muted>
            The far leg was not visible, so left and right were not compared.
          </Text>
        ) : null}
      </Card>

      <AssessmentDetails
        motion={session.motion}
        method={session.method}
        verified={session.movementVerified}
        detectedMotion={session.detectedMotion}
        match={session.movementMatch}
        metrics={session.assessmentMetrics ?? []}
      />

      {session.method === 'imu' ? <SessionJointCurves session={session} /> : null}

      {session.method === 'cv' ? (
        <Card style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
            <Text variant="headline">Movement score over time</Text>
            <SegmentedToggle options={RANGES} value={range} onChange={setRange} accessibilityLabel="Chart range" />
          </View>
          {series.length > 0 ? (
            <LineChart
              data={series}
              height={CHART_HEIGHT}
              yDomain={[0, 100]}
              formatValue={(v) => `${v} / 100`}
              accessibilityLabel={`Movement score over the last ${range === 'week' ? '7' : '30'} days`}
            />
          ) : (
            <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: space.sm }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.burntOrangeTint, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="analytics" size={28} color={colors.burntOrange} />
              </View>
              <Text variant="callout" muted align="center">
                No verified camera scores in the last {range === 'week' ? '7' : '30'} days.
              </Text>
            </View>
          )}
        </Card>
      ) : null}
    </ScreenContainer>
  );
}

function AssessmentDetails({
  motion,
  method,
  verified,
  detectedMotion,
  match,
  metrics,
}: {
  motion: keyof typeof MOTION_LABELS;
  method: CaptureMethod;
  verified?: boolean;
  detectedMotion?: keyof typeof MOTION_LABELS;
  match?: number;
  metrics: SessionAssessmentMetric[];
}) {
  const title =
    verified === true
      ? `${MOTION_LABELS[motion]} recorded`
      : verified === false
        ? `${MOTION_LABELS[motion]} was not confirmed`
        : 'Movement assessment unavailable';
  // A confirmed recording needs no explanation: the title says it.
  const detail =
    verified === true
      ? null
      : verified === false && detectedMotion && detectedMotion !== motion
        ? `This recording looked more like ${MOTION_LABELS[detectedMotion].toLowerCase()} than ${MOTION_LABELS[motion].toLowerCase()}. Record again if that was not what you meant to do.`
        : verified === false && detectedMotion === motion
          ? `The camera did see ${MOTION_LABELS[motion].toLowerCase()}, but the view was not clear enough to confirm the session. Keep your whole body in frame and try again.`
        : verified === false
          ? 'Not enough complete movement cycles were visible. Record again with your whole body in frame.'
          : 'This session was recorded before movement verification was available.';

  return (
    <Card style={{ gap: space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
        <Ionicons name={verified === true ? 'checkmark-circle' : 'alert-circle'} size={26} color={verified === true ? colors.seagrass : colors.graphite} />
        <View style={{ flex: 1, gap: space.xs }}>
          <Text variant="headline">{title}</Text>
          {detail ? (
            <Text variant="callout" muted>
              {detail}
            </Text>
          ) : null}
        </View>
      </View>

      {method === 'cv' && metrics.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xl }}>
          {metrics.map((metric) => (
            <View key={metric.key} style={{ minWidth: 130, flexGrow: 1, flexBasis: 0 }} accessible accessibilityLabel={`${metric.label}: ${formatAssessmentMetric(metric)}`}>
              <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
                {formatAssessmentMetric(metric)}
              </Text>
              <Text variant="caption" muted>
                {metric.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text variant="caption" muted>
        {method === 'imu'
          ? 'Joint angles are model predictions from your phone sensors. They are not a clinical diagnosis or a pass/fail result.'
          : 'Camera measurements describe this recording only. They are not a clinical diagnosis or a pass/fail result.'}
      </Text>
    </Card>
  );
}

function formatAssessmentMetric(metric: SessionAssessmentMetric): string {
  return `${metric.value}${metric.unit}`;
}
