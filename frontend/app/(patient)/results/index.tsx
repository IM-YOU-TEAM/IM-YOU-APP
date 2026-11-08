<<<<<<< HEAD
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import {
  BentoGrid,
  Card,
  LineChart,
  MetricRow,
  ScreenContainer,
  SegmentedToggle,
  Text,
  type Metric,
} from "@/components";
import {
  feedbackFor,
  getSession,
  METHOD_LABELS,
  MOTION_ICONS,
  MOTION_LABELS,
  sessionsFor,
  today,
} from "@/lib/data";
import { formatDate, formatDuration } from "@/lib/format";
import { colors, space, WIDE } from "@/lib/theme";
import { EmptyState } from "@/features/results/EmptyState";
import {
  gaitSeries,
  mySessions,
  sessionWhen,
  type Range,
} from "@/features/results/derive";
=======
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { BentoGrid, Card, LineChart, LoadState, MetricRow, ScreenContainer, SegmentedToggle, Text, type Metric } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchNotes, fetchSessions } from '@/features/results/api';
import { METHOD_LABELS, MOTION_ICONS, MOTION_LABELS, today } from '@/lib/data';
import { formatDate, formatDuration } from '@/lib/format';
import { colors, space, WIDE } from '@/lib/theme';
import { useLoader } from '@/lib/useLoader';
import type { SessionAssessmentMetric } from '@/types';
import { EmptyState } from '@/features/results/EmptyState';
import { gaitSeries, sessionWhen, type Range } from '@/features/results/derive';
>>>>>>> origin/main

const RANGES = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;

const CHART_HEIGHT = 240;

export default function ResultsScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const wide = useWindowDimensions().width >= WIDE;
<<<<<<< HEAD
  const [range, setRange] = useState<Range>("week");
=======
  const [range, setRange] = useState<Range>('week');
  const { patient } = useAuth();
  const patientId = patient?.id;
>>>>>>> origin/main

  const loaded = useLoader(async () => {
    const all = patientId ? await fetchSessions(patientId) : [];
    // A specific session from a link, otherwise the patient's latest one.
    const session = sessionId ? all.find((s) => s.id === sessionId) : all.at(-1);
    const notes = session ? await fetchNotes(session.id) : [];
    return { all, session, notes };
  }, [patientId, sessionId]);

  if (!loaded.data) {
    return (
      <ScreenContainer gap={wide ? 24 : 16}>
        <Text variant="display" accessibilityRole="header">
          Results
        </Text>
        <Card>
          <LoadState error={loaded.error} onRetry={loaded.reload} minHeight={240} />
        </Card>
      </ScreenContainer>
    );
  }

  const { all, session, notes } = loaded.data;

  if (!session) {
    return (
      <ScreenContainer gap={wide ? 24 : 16}>
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
<<<<<<< HEAD
                : "Track a session and your gait score, cadence and symmetry will show up here."
=======
                : 'Track a session and your movement score, cadence and symmetry will show up here.'
>>>>>>> origin/main
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
  const metrics: Metric[] = [
<<<<<<< HEAD
    { label: "Gait score", value: String(session.gaitScore) },
    { label: "Cadence", value: `${session.cadence}/min` },
    { label: "Symmetry", value: `${session.symmetry}%` },
    { label: "Duration", value: formatDuration(session.durationSec) },
=======
    { label: 'Movement score', value: movementNotVerified ? '—' : String(session.gaitScore) },
    { label: 'Cadence', value: `${session.cadence}/min` },
    { label: 'Symmetry', value: symmetryHidden ? '—' : `${session.symmetry}%` },
    { label: 'Duration', value: formatDuration(session.durationSec) },
>>>>>>> origin/main
  ];

  return (
    <ScreenContainer gap={wide ? 24 : 16}>
      {/* Header: motion + date */}
<<<<<<< HEAD
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.burntorangeTint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={MOTION_ICONS[session.motion]}
            size={26}
            color={colors.burntorange}
          />
=======
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.burntOrangeTint, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={MOTION_ICONS[session.motion]} size={26} color={colors.burntOrange} />
>>>>>>> origin/main
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
        {wide ? (
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
        verified={session.movementVerified}
        detectedMotion={session.detectedMotion}
        match={session.movementMatch}
        metrics={session.assessmentMetrics ?? []}
      />

      <BentoGrid weights={[2, 1]}>
        {/* Movement score over time */}
        <Card style={{ flex: 1, gap: space.lg }}>
<<<<<<< HEAD
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: space.md,
            }}
          >
            <Text variant="headline">Gait score over time</Text>
            <SegmentedToggle
              options={RANGES}
              value={range}
              onChange={setRange}
              accessibilityLabel="Chart range"
            />
=======
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
            <Text variant="headline">Movement score over time</Text>
            <SegmentedToggle options={RANGES} value={range} onChange={setRange} accessibilityLabel="Chart range" />
>>>>>>> origin/main
          </View>
          {series.length > 0 ? (
            <LineChart
              data={series}
              height={CHART_HEIGHT}
              yDomain={[0, 100]}
              formatValue={(v) => `${v} / 100`}
<<<<<<< HEAD
              accessibilityLabel={`Gait score over the last ${range === "week" ? "7" : "30"} days`}
            />
          ) : (
            <View
              style={{
                height: CHART_HEIGHT,
                alignItems: "center",
                justifyContent: "center",
                gap: space.sm,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.burntorangeTint,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="analytics" size={28} color={colors.burntorange} />
              </View>
              <Text variant="callout" muted align="center">
                No sessions in the last {range === "week" ? "7" : "30"} days.
=======
              accessibilityLabel={`Movement score over the last ${range === 'week' ? '7' : '30'} days`}
            />
          ) : (
            <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: space.sm }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.burntOrangeTint, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="analytics" size={28} color={colors.burntOrange} />
              </View>
              <Text variant="callout" muted align="center">
                No verified movement scores in the last {range === 'week' ? '7' : '30'} days.
>>>>>>> origin/main
              </Text>
            </View>
          )}
        </Card>

        {/* Clinician feedback (the screen's one Cherry Blossom highlight) */}
        <Card tone="accent" style={{ flex: 1, gap: space.md }}>
<<<<<<< HEAD
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.burntorangeTint,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={18}
                color={colors.burntorange}
              />
=======
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.burntOrangeTint, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.burntOrange} />
>>>>>>> origin/main
            </View>
            <Text variant="headline">Clinician feedback</Text>
          </View>
          {notes.length > 0 ? (
            notes.map((f) => (
              <View key={f.id} style={{ gap: space.xs }}>
                <Text variant="body">{f.text}</Text>
                <Text variant="caption" muted>
                  {f.clinicianName} · {formatDate(f.date)}
                </Text>
              </View>
            ))
          ) : (
            <Text variant="body" muted>
              Your clinician's notes will appear here.
            </Text>
          )}
        </Card>
      </BentoGrid>
    </ScreenContainer>
  );
}

function AssessmentDetails({
  motion,
  verified,
  detectedMotion,
  match,
  metrics,
}: {
  motion: keyof typeof MOTION_LABELS;
  verified?: boolean;
  detectedMotion?: keyof typeof MOTION_LABELS;
  match?: number;
  metrics: SessionAssessmentMetric[];
}) {
  const title =
    verified === true
      ? `${MOTION_LABELS[motion]} pattern matched`
      : verified === false
        ? `${MOTION_LABELS[motion]} was not confirmed`
        : 'Movement assessment unavailable';
  const detail =
    verified === true
      ? 'The recorded joint pattern matched the movement you selected.'
      : verified === false && detectedMotion && detectedMotion !== motion
        ? `The recording looked closer to ${MOTION_LABELS[detectedMotion].toLowerCase()}. Check the selected movement and camera position before recording again.`
        : verified === false && detectedMotion === motion
          ? 'The selected movement was visible, but the pattern match was not strong enough to confirm the session. Keep your whole body in frame and record again.'
        : verified === false
          ? 'Not enough complete movement cycles were visible. Record again with your whole body in frame.'
          : 'This session was recorded before movement verification was available.';

  return (
    <Card style={{ gap: space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
        <Ionicons name={verified === true ? 'checkmark-circle' : 'alert-circle'} size={26} color={verified === true ? colors.seagrass : colors.graphite} />
        <View style={{ flex: 1, gap: space.xs }}>
          <Text variant="headline">{title}</Text>
          <Text variant="callout" muted>
            {detail}
          </Text>
          {match != null ? (
            <Text variant="caption" muted>
              Pattern match {match}%
            </Text>
          ) : null}
        </View>
      </View>

      {metrics.length > 0 ? (
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
        Camera measurements describe this recording only. They are not a clinical diagnosis or a pass/fail result.
      </Text>
    </Card>
  );
}

function formatAssessmentMetric(metric: SessionAssessmentMetric): string {
  return `${metric.value}${metric.unit}`;
}
