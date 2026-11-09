import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Text } from '@/components';
import { formatDuration } from '@/lib/format';
import { smoothPath, type Point } from '@/lib/smoothPath';
import { colors, radii, space } from '@/lib/theme';
import type { JointTrace } from '@/types';
import { displaySeries, JOINT_DISPLAY, seriesRange, traceSeconds } from './jointTrace';

type Props = {
  trace?: JointTrace | null;
  /** True when only one 2.5 s window was saved (sessions from before whole-session timelines). */
  excerpt?: boolean;
  caption?: string;
};

const CHART_H = 80;
const HEADER_H = 24;
const ROW_GAP = space.md;
const ROW_H = HEADER_H + CHART_H + ROW_GAP;
const AXIS_H = 18;
/** About 50 px per stride when walking, so each cycle stays readable. */
const PX_PER_S = 48;
/** Wider SVGs get slow on phones; very long sessions are compressed to fit this. */
const MAX_CONTENT_W = 12000;

type Plotted = { label: string; range: { min: number; max: number } | null; d: string; zeroY: number | null };

function plot(values: (number | null)[], width: number): Pick<Plotted, 'range' | 'd' | 'zeroY'> {
  const range = seriesRange(values);
  if (!range) return { range, d: '', zeroY: null };
  const span = range.max - range.min;
  const pad = span > 1 ? span * 0.12 : 6;
  const lo = range.min - pad;
  const hi = range.max + pad;
  const y = (v: number) => CHART_H - ((v - lo) / (hi - lo)) * CHART_H;
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  // A gap (paused or unscored) breaks the line instead of drawing across it.
  let d = '';
  let segment: Point[] = [];
  const flush = () => {
    if (segment.length > 1) d += `${smoothPath(segment, 0.15)} `;
    segment = [];
  };
  values.forEach((v, i) => {
    if (v == null) flush();
    else segment.push({ x: i * step, y: y(v) });
  });
  flush();
  return { range, d, zeroY: lo < 0 && hi > 0 ? y(0) : null };
}

function tickEvery(seconds: number): number {
  if (seconds <= 12) return 1;
  if (seconds <= 60) return 5;
  if (seconds <= 300) return 15;
  return 60;
}

function degrees(v: number): string {
  return `${Math.round(v)}°`;
}

/** Predicted hip, knee and ankle angles over the whole session, flexion positive. */
export function JointCurves({ trace, excerpt = false, caption }: Props) {
  const [frame, setFrame] = useState(0);
  const seconds = trace ? traceSeconds(trace) : 0;
  const ready = trace != null && seconds > 0 && frame > 0;
  const width = ready ? Math.max(frame, Math.min(seconds * PX_PER_S, MAX_CONTENT_W)) : 0;
  const scrolls = width > frame + 1;

  const rows: Plotted[] = ready
    ? JOINT_DISPLAY.map(({ joint, label }) => ({ label, ...plot(displaySeries(trace, joint), width) }))
    : [];

  const every = tickEvery(seconds);
  const ticks = ready ? Array.from({ length: Math.floor(seconds / every) + 1 }, (_, i) => i * every) : [];
  const start = trace?.startSec ?? 0;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        ready
          ? rows
              .map((r) => (r.range ? `${r.label} ${degrees(r.range.min)} to ${degrees(r.range.max)}` : `${r.label} not scored`))
              .join('. ')
          : caption
      }
      style={{ borderRadius: radii.card, backgroundColor: colors.graphite, padding: space.xl - 4, gap: space.lg }}
    >
      <View style={{ gap: 2 }}>
        <Text variant="headline" color={colors.onDark}>
          Joint angles
        </Text>
        <Text variant="caption" color={colors.onDarkMuted}>
          {trace
            ? excerpt
              ? '2.5 s sample · degrees · flexion is positive'
              : `Whole session, ${formatDuration(seconds)} · degrees · flexion is positive`
            : 'Degrees · flexion is positive'}
        </Text>
      </View>

      <View onLayout={(e) => setFrame(Math.floor(e.nativeEvent.layout.width))}>
        {trace == null ? (
          <Text variant="callout" color={colors.onDarkMuted} align="center">
            {caption ?? 'Loading joint angles…'}
          </Text>
        ) : ready ? (
          <View style={{ height: rows.length * ROW_H + AXIS_H }}>
            <ScrollView horizontal scrollEnabled={scrolls} showsHorizontalScrollIndicator={scrolls}>
              <View style={{ width }}>
                {rows.map((row) => (
                  <View key={row.label} style={{ height: ROW_H, paddingTop: HEADER_H }}>
                    <Svg width={width} height={CHART_H}>
                      <Line x1={0} x2={width} y1={CHART_H / 2} y2={CHART_H / 2} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                      {row.zeroY != null ? (
                        <Line x1={0} x2={width} y1={row.zeroY} y2={row.zeroY} stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="4 4" />
                      ) : null}
                      {ticks.map((t) => (
                        <Line key={t} x1={(t / seconds) * width} x2={(t / seconds) * width} y1={0} y2={CHART_H} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                      ))}
                      <Path d={row.d} stroke={colors.seagrass} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </View>
                ))}
                <View style={{ height: AXIS_H }}>
                  {ticks.map((t) => (
                    <Text
                      key={t}
                      variant="caption"
                      color={colors.onDarkMuted}
                      style={{
                        position: 'absolute',
                        left: Math.min(Math.max((t / seconds) * width - 18, 0), width - 36),
                        width: 36,
                        textAlign: t === 0 ? 'left' : 'center',
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {formatDuration(start + t)}
                    </Text>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Labels stay put while the curves scroll underneath. */}
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
              {rows.map((row) => (
                <View
                  key={row.label}
                  style={{ height: ROW_H, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}
                >
                  <Text variant="callout" weight={700} color={colors.onDark}>
                    {row.label}
                  </Text>
                  <Text variant="caption" color={colors.onDarkMuted} style={{ fontVariant: ['tabular-nums'] }}>
                    {row.range ? `${degrees(row.range.min)} to ${degrees(row.range.max)}` : 'Not scored'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {ready && scrolls ? (
        <Text variant="caption" color={colors.onDarkMuted}>
          Swipe sideways to see the whole session.
        </Text>
      ) : null}
    </View>
  );
}
