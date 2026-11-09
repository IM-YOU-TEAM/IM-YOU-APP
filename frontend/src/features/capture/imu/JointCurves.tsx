import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, type ScrollViewInstance, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Text } from '@/components';
import { formatDuration } from '@/lib/format';
import { smoothPath, type Point } from '@/lib/smoothPath';
import { colors, radii, space } from '@/lib/theme';
import type { JointName, JointTrace } from '@/types';
import {
  displaySeries,
  seriesRange,
  sliderFromView,
  traceSeconds,
  viewBounds,
  viewFromSlider,
  visibleIndices,
} from './jointTrace';
import { ViewSlider } from './ViewSlider';

type Props = {
  trace?: JointTrace | null;
  /** True when only one 2.5 s window was saved (sessions from before whole-session timelines). */
  excerpt?: boolean;
  caption?: string;
};

const CHART_H = 96;
const PAD_Y = 6;
const HEADER_H = 24;
const ROW_GAP = space.md;
const ROW_H = HEADER_H + CHART_H + ROW_GAP;
const AXIS_H = 18;
const TIME_LABEL_H = 18;
const Y_AXIS_W = 44;
/** Below this the view is the whole recording, so the slider snaps there. */
const WHOLE_SNAP = 0.985;

/**
 * One steady degree scale per joint, the same for every session, so charts can be compared by eye.
 * Widened only if a value falls outside it.
 */
const JOINTS: { joint: JointName; label: string; up: string; down: string; lo: number; hi: number; step: number }[] = [
  { joint: 'hip_flexion_r', label: 'Hip', up: 'Flexion', down: 'Extension', lo: -20, hi: 60, step: 20 },
  { joint: 'knee_angle_r', label: 'Knee', up: 'Flexion', down: 'Extension', lo: -10, hi: 80, step: 20 },
  { joint: 'ankle_angle_r', label: 'Ankle', up: 'Dorsi', down: 'Plantar', lo: -30, hi: 30, step: 15 },
];

type Joint = { label: string; up: string; down: string; values: (number | null)[]; lo: number; hi: number; ticks: number[] };

function scaleOf(spec: (typeof JOINTS)[number], values: (number | null)[]): { lo: number; hi: number; ticks: number[] } {
  const range = seriesRange(values);
  const lo = Math.min(spec.lo, range ? Math.floor(range.min / spec.step) * spec.step : spec.lo);
  const hi = Math.max(spec.hi, range ? Math.ceil(range.max / spec.step) * spec.step : spec.hi);
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / spec.step) * spec.step; t <= hi; t += spec.step) ticks.push(t);
  return { lo, hi, ticks };
}

function tickEvery(seconds: number): number {
  if (seconds <= 6) return 1;
  if (seconds <= 30) return 5;
  if (seconds <= 120) return 15;
  if (seconds <= 600) return 60;
  return 300;
}

const formatTick = (value: number) => `${Math.round(value) < 0 ? '−' : ''}${Math.abs(Math.round(value))}°`;

function viewLabel(view: number, seconds: number): string {
  if (view >= seconds - 0.05) return `Whole session, ${formatDuration(seconds)}`;
  if (view < 10) return `${view.toFixed(1)} s`;
  if (view < 60) return `${Math.round(view)} s`;
  return formatDuration(view);
}

/** Predicted hip, knee and ankle angles over the session in degrees, flexion positive, with an adjustable view length. */
export function JointCurves({ trace, excerpt = false, caption }: Props) {
  const [frame, setFrame] = useState(0);
  const [requested, setRequested] = useState<number | null>(null);
  const [from, setFrom] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const pendingScroll = useRef<number | null>(null);

  const seconds = trace ? traceSeconds(trace) : 0;
  const bounds = viewBounds(seconds);
  const view = Math.min(Math.max(requested ?? seconds, bounds.min), bounds.max);
  const ready = trace != null && seconds > 0 && frame > 0;
  const pxPerSec = ready ? frame / view : 0;
  const start = Math.min(Math.max(from, 0), Math.max(seconds - view, 0));
  const zoomable = !excerpt && bounds.max - bounds.min > 1;

  const joints = useMemo<Joint[]>(() => {
    if (!trace) return [];
    return JOINTS.map((spec) => {
      const values = displaySeries(trace, spec.joint);
      return { label: spec.label, up: spec.up, down: spec.down, values, ...scaleOf(spec, values) };
    });
  }, [trace]);

  useEffect(() => {
    if (pendingScroll.current == null) return;
    scroller.current?.scrollTo({ x: pendingScroll.current, animated: false });
    pendingScroll.current = null;
  }, [view]);

  const changeView = (fraction: number) => {
    const next = fraction >= WHOLE_SNAP ? bounds.max : viewFromSlider(fraction, bounds);
    // Zoom around the middle of what is on screen now.
    const nextFrom = Math.min(Math.max(start + view / 2 - next / 2, 0), Math.max(seconds - next, 0));
    setRequested(next);
    setFrom(nextFrom);
    pendingScroll.current = (nextFrom * frame) / next;
  };

  const hz = trace?.sampleHz ?? 1;
  const rows = ready
    ? joints.map((j) => {
        const [first, last] = visibleIndices(j.values.length, hz, start, view);
        const shown = j.values.slice(first, last + 1);
        // A few pixels of room top and bottom so the edge labels are not cramped.
        const y = (v: number) => PAD_Y + (1 - (v - j.lo) / (j.hi - j.lo)) * (CHART_H - 2 * PAD_Y);
        // A gap (paused or unscored) breaks the line instead of drawing across it.
        let d = '';
        let segment: Point[] = [];
        const flush = () => {
          if (segment.length > 1) d += `${smoothPath(segment, 0.15)} `;
          segment = [];
        };
        shown.forEach((v, k) => {
          if (v == null) flush();
          else segment.push({ x: ((first + k) / hz - start) * pxPerSec, y: y(v) });
        });
        flush();
        const visible = seriesRange(
          j.values.slice(Math.max(0, Math.ceil(start * hz)), Math.floor((start + view) * hz) + 1),
        );
        return { label: j.label, up: j.up, down: j.down, d, range: visible, zeroY: j.lo < 0 && j.hi > 0 ? y(0) : null, ticks: j.ticks, y };
      })
    : [];

  const every = tickEvery(view);
  const ticks: number[] = [];
  if (ready) {
    for (let t = Math.ceil(start / every) * every; t <= start + view + 1e-6; t += every) ticks.push(t);
  }
  const xOf = (t: number) => (t - start) * pxPerSec;
  const offset = trace?.startSec ?? 0;
  const pans = ready && view < seconds - 0.05;
  const chartH = joints.length * ROW_H;

  return (
    <View
      style={{ borderRadius: radii.card, backgroundColor: colors.graphite, padding: space.xl - 4, gap: space.lg }}
    >
      <View style={{ gap: space.sm }}>
        <View style={{ gap: 2 }}>
          <Text variant="headline" color={colors.onDark}>
            Joint angles
          </Text>
          <Text variant="caption" color={colors.onDarkMuted}>
            {trace
              ? `${excerpt ? '2.5 s sample' : `${formatDuration(seconds)} recorded`} · right leg · degrees`
              : 'Right leg · degrees'}
          </Text>
        </View>
      </View>

      <View onLayout={(e) => setFrame(Math.max(0, Math.floor(e.nativeEvent.layout.width) - Y_AXIS_W))}>
        {trace == null ? (
          <Text variant="callout" color={colors.onDarkMuted} align="center">
            {caption ?? 'Loading joint angles…'}
          </Text>
        ) : ready ? (
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Joint angles in degrees. ${rows
              .map((r) => (r.range ? `${r.label} ${formatTick(r.range.min)} to ${formatTick(r.range.max)}` : `${r.label} not scored`))
              .join('. ')}`}
            style={{ height: chartH + AXIS_H + TIME_LABEL_H }}
          >
            {rows.map((row) => (
              <View key={row.label} pointerEvents="none" style={{ height: ROW_H }}>
                <View style={{ height: HEADER_H, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text variant="callout" weight={700} color={colors.onDark} numberOfLines={1} style={{ marginLeft: Y_AXIS_W, flexShrink: 1 }}>
                    {row.label}
                    <Text variant="caption" color={colors.onDarkMuted}>
                      {`  ${row.up} ↑  ${row.down} ↓`}
                    </Text>
                  </Text>
                  <Text variant="caption" color={colors.onDarkMuted} style={{ fontVariant: ['tabular-nums'] }}>
                    {row.range ? `${formatTick(row.range.min)} to ${formatTick(row.range.max)}` : 'Not scored'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', height: CHART_H }}>
                  <View style={{ width: Y_AXIS_W, height: CHART_H }}>
                    {row.ticks.map((tick) => (
                      <Text
                        key={tick}
                        variant="caption"
                        color={colors.onDarkMuted}
                        align="right"
                        style={{
                          position: 'absolute',
                          top: row.y(tick) - 9,
                          right: space.xs,
                          width: Y_AXIS_W - space.xs,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {formatTick(tick)}
                      </Text>
                    ))}
                  </View>
                  <Svg width={frame} height={CHART_H}>
                    <Line x1={0} x2={frame} y1={CHART_H / 2} y2={CHART_H / 2} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                    {row.zeroY != null ? (
                      <Line x1={0} x2={frame} y1={row.zeroY} y2={row.zeroY} stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="4 4" />
                    ) : null}
                    {ticks.map((t) => (
                      <Line key={t} x1={xOf(t)} x2={xOf(t)} y1={0} y2={CHART_H} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                    ))}
                    <Path d={row.d} stroke={colors.seagrass} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
              </View>
            ))}
            <View pointerEvents="none" style={{ height: AXIS_H, marginLeft: Y_AXIS_W }}>
              {ticks.map((t) => (
                <Text
                  key={t}
                  variant="caption"
                  color={colors.onDarkMuted}
                  style={{
                    position: 'absolute',
                    left: Math.min(Math.max(xOf(t) - 18, 0), Math.max(frame - 36, 0)),
                    width: 36,
                    textAlign: 'center',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatDuration(offset + t)}
                </Text>
              ))}
            </View>
            <Text variant="caption" color={colors.onDarkMuted} align="center" style={{ height: TIME_LABEL_H, marginLeft: Y_AXIS_W }}>
              Time into the session (min:s)
            </Text>

            {/* An empty strip as wide as the session at this zoom, so panning uses the platform's own scrolling. */}
            <ScrollView
              ref={scroller}
              horizontal
              scrollEnabled={pans}
              showsHorizontalScrollIndicator={pans}
              scrollEventThrottle={16}
              onScroll={(e) => setFrom(e.nativeEvent.contentOffset.x / pxPerSec)}
              style={{ position: 'absolute', top: 0, left: Y_AXIS_W, right: 0, bottom: TIME_LABEL_H }}
            >
              <View style={{ width: seconds * pxPerSec, height: chartH + AXIS_H }} />
            </ScrollView>
          </View>
        ) : null}
      </View>

      {ready && zoomable ? (
        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" weight={600} color={colors.onDark}>
              Time shown
            </Text>
            <Text variant="caption" color={colors.onDarkMuted} style={{ fontVariant: ['tabular-nums'] }}>
              {viewLabel(view, seconds)}
            </Text>
          </View>
          <ViewSlider
            value={sliderFromView(view, bounds)}
            onChange={changeView}
            label="Time shown"
            valueText={viewLabel(view, seconds)}
          />
          {pans ? (
            <Text variant="caption" color={colors.onDarkMuted}>
              Swipe the chart sideways to move through the session.
            </Text>
          ) : null}
        </View>
      ) : null}

      {ready && excerpt ? (
        <Text variant="caption" color={colors.onDarkMuted}>
          This session only saved a 2.5 s sample. Sessions recorded from now on save the whole recording.
        </Text>
      ) : null}
    </View>
  );
}
