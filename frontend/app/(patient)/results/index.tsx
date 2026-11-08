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

const RANGES = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;

const CHART_HEIGHT = 240;

export default function ResultsScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const wide = useWindowDimensions().width >= WIDE;
  const [range, setRange] = useState<Range>("week");

  // A specific session from a link, otherwise the patient's latest one.
  const session = sessionId ? getSession(sessionId) : mySessions().at(-1);

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
                : "Track a session and your gait score, cadence and symmetry will show up here."
            }
          />
        </Card>
      </ScreenContainer>
    );
  }

  const series = gaitSeries(sessionsFor(session.patientId), range, today());
  const notes = feedbackFor(session.id);
  const metrics: Metric[] = [
    { label: "Gait score", value: String(session.gaitScore) },
    { label: "Cadence", value: `${session.cadence}/min` },
    { label: "Symmetry", value: `${session.symmetry}%` },
    { label: "Duration", value: formatDuration(session.durationSec) },
  ];

  return (
    <ScreenContainer gap={wide ? 24 : 16}>
      {/* Header: motion + date */}
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
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="display" accessibilityRole="header">
            {MOTION_LABELS[session.motion]}
          </Text>
          <Text variant="body" muted>
            {sessionWhen(session)} · {METHOD_LABELS[session.method]}
          </Text>
        </View>
      </View>

      {/* Metrics: one row on wide screens, two rows of two on phones */}
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
        {/* Gait score over time */}
        <Card style={{ flex: 1, gap: space.lg }}>
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
          </View>
          {series.length > 0 ? (
            <LineChart
              data={series}
              height={CHART_HEIGHT}
              yDomain={[0, 100]}
              formatValue={(v) => `${v} / 100`}
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
              </Text>
            </View>
          )}
        </Card>

        {/* Clinician feedback (the screen's one Cherry Blossom highlight) */}
        <Card tone="accent" style={{ flex: 1, gap: space.md }}>
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
