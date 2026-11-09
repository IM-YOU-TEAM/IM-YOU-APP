import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, type ScrollViewInstance, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Text } from '@/components';
import { formatDuration } from '@/lib/format';
import { smoothPath, type Point } from '@/lib/smoothPath';
import { colors, radii, space } from '@/lib/theme';
import type { JointTrace } from '@/types';
import {
  displaySeries,
  JOINT_DISPLAY,
  seriesRange,
  sliderFromView,
  traceSeconds,
  viewBounds,
  viewFromSlider,
  visibleIndices,
} from './jointTrace';
import { UnitToggle } from './UnitToggle';
import { ViewSlider } from './ViewSlider';

type Props = {
  trace?: JointTrace | null;
  /** True when only one 2.5 s window was saved (sessions from before whole-session timelines). */
  excerpt?: boolean;
  caption?: string;
};

type AngleUnit = 'deg' | 'rad' | 'radps';

const CHART_H = 80;
const HEADER_H = 24;
const ROW_GAP = space.md;
const ROW_H = HEADER_H + CHART_H + ROW_GAP;
const AXIS_H = 18;
const TIME_LABEL_H = 18;
const Y_AXIS_W = 44;
const DEG_TO_RAD = Math.PI / 180;
/** Below this the view is the whole recording, so the slider snaps there. */
const WHOLE_SNAP = 0.985;

const ANGLE_UNITS: { value: AngleUnit; label: string }[] = [
  { value: 'deg', label: 'degrees' },
  { value: 'rad', label: 'radians' },
  { value: 'radps', label: 'rad/s' },
];

type Joint = { label: string; values: (number | null)[]; lo: number; hi: number; ticks: number[] };

/** One fixed vertical scale per joint for the whole session, so curves don't jump while panning. */
function scaleOf(values: (number | null)[]): { lo: number; hi: number } | null {
  const range = seriesRange(values);
  if (!range) return null;
  const span = range.max - range.min;
  const pad = span > 0.02 ? span * 0.12 : 0.2;
  return { lo: range.min - pad, hi: range.max + pad };
}

function tickEvery(seconds: number): number {
  if (seconds <= 6) return 1;
  if (seconds <= 30) return 5;
  if (seconds <= 120) return 15;
  if (seconds <= 600) return 60;
  return 300;
}

function niceTicks(lo: number, hi: number, target = 4): number[] {
  if (!(hi > lo)) return [lo];
  const span = hi - lo;
  const raw = span / Math.max(target - 1, 1);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const err = raw / pow;
  const step = (err >= 5 ? 10 : err >= 2 ? 5 : err >= 1 ? 2 : 1) * pow;
  const start = Math.ceil(lo / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= hi + step * 1e-9; t += step) ticks.push(Number(t.toFixed(10)));
  return ticks.length > 0 ? ticks : [lo, hi];
}

function formatTick(value: number, unit: AngleUnit): string {
  switch (unit) {
    case 'deg':
      return `${Math.round(value)}°`;
    case 'rad':
      return value.toFixed(2);
    case 'radps':
      return value.toFixed(2);
    default: {
      const unexpected: never = unit;
      return unexpected;
    }
  }
}

function yAxisTitle(unit: AngleUnit): string {
  switch (unit) {
    case 'deg':
      return 'Angle (°)';
    case 'rad':
      return 'Angle (rad)';
    case 'radps':
      return 'Angular velocity (rad/s)';
    default: {
      const unexpected: never = unit;
      return unexpected;
    }
  }
}

function unitCaption(unit: AngleUnit): string {
  switch (unit) {
    case 'deg':
      return 'degrees · flexion is positive';
    case 'rad':
      return 'radians · flexion is positive';
    case 'radps':
      return 'rad/s · positive is increasing flexion';
    default: {
      const unexpected: never = unit;
      return unexpected;
    }
  }
}

function toUnit(values: (number | null)[], unit: AngleUnit, hz: number): (number | null)[] {
  switch (unit) {
    case 'deg':
      return values;
    case 'rad':
      return values.map((v) => (v == null ? null : v * DEG_TO_RAD));
    case 'radps':
      return angularVelocity(values, hz);
    default: {
      const unexpected: never = unit;
      return unexpected;
    }
  }
}

/** Central difference of the degree series, converted to rad/s. Gaps stay gaps. */
function angularVelocity(values: (number | null)[], hz: number): (number | null)[] {
  const rad = values.map((v) => (v == null ? null : v * DEG_TO_RAD));
  return rad.map((v, i) => {
    const prev = rad[i - 1];
    const next = rad[i + 1];
    if (v == null) return null;
    if (prev != null && next != null) return ((next - prev) * hz) / 2;
    if (next != null) return (next - v) * hz;
    if (prev != null) return (v - prev) * hz;
    return 0;
  });
}

function viewLabel(view: number, seconds: number): string {
  if (view >= seconds - 0.05) return `Whole session, ${formatDuration(seconds)}`;
  if (view < 10) return `${view.toFixed(1)} s`;
  if (view < 60) return `${Math.round(view)} s`;
  return formatDuration(view);
}

/** Predicted hip, knee and ankle angles over the session, flexion positive, with an adjustable view length. */
export function JointCurves({ trace, excerpt = false, caption }: Props) {
  const [frame, setFrame] = useState(0);
  const [requested, setRequested] = useState<number | null>(null);
  const [from, setFrom] = useState(0);
  const [unit, setUnit] = useState<AngleUnit>('deg');
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
    const hz = trace.sampleHz;
    return JOINT_DISPLAY.map(({ joint, label }) => {
      const values = toUnit(displaySeries(trace, joint), unit, hz);
      const scale = scaleOf(values);
      const lo = scale?.lo ?? 0;
      const hi = scale?.hi ?? 0;
      return { label, values, lo, hi, ticks: scale ? niceTicks(lo, hi) : [] };
    });
  }, [trace, unit]);

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
        const y = (v: number) => (j.hi > j.lo ? CHART_H - ((v - j.lo) / (j.hi - j.lo)) * CHART_H : CHART_H / 2);
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
        return { label: j.label, d, range: visible, zeroY: j.lo < 0 && j.hi > 0 ? y(0) : null, ticks: j.ticks, y };
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
  const yTitle = yAxisTitle(unit);

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
              ? `${excerpt ? '2.5 s sample' : `${formatDuration(seconds)} recorded`} · ${unitCaption(unit)}`
              : unitCaption(unit)}
          </Text>
        </View>
        <UnitToggle options={ANGLE_UNITS} value={unit} onChange={setUnit} accessibilityLabel="Joint angle units" />
        <Text variant="caption" color={colors.onDarkMuted}>
          Vertical axis is {yTitle.toLowerCase()}. Horizontal axis is time in seconds.
        </Text>
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
            accessibilityLabel={`${yTitle}. ${rows
              .map((r) =>
                r.range ? `${r.label} ${formatTick(r.range.min, unit)} to ${formatTick(r.range.max, unit)}` : `${r.label} not scored`,
              )
              .join('. ')}`}
            style={{ height: chartH + AXIS_H + TIME_LABEL_H }}
          >
            {rows.map((row) => (
              <View key={row.label} pointerEvents="none" style={{ height: ROW_H }}>
                <View style={{ height: HEADER_H, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text variant="callout" weight={700} color={colors.onDark} style={{ marginLeft: Y_AXIS_W }}>
                    {row.label}
                  </Text>
                  <Text variant="caption" color={colors.onDarkMuted} style={{ fontVariant: ['tabular-nums'] }}>
                    {row.range ? `${formatTick(row.range.min, unit)} to ${formatTick(row.range.max, unit)}` : 'Not scored'}
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
                          top: Math.min(Math.max(row.y(tick) - 9, 0), CHART_H - 18),
                          right: space.xs,
                          width: Y_AXIS_W - space.xs,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {formatTick(tick, unit)}
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
              Time (s)
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
