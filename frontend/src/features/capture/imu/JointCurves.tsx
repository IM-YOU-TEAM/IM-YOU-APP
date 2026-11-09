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
import { ViewSlider } from './ViewSlider';

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
/** Below this the view is the whole recording, so the slider snaps there. */
const WHOLE_SNAP = 0.985;

type Joint = { label: string; values: (number | null)[]; lo: number; hi: number };

/** One fixed vertical scale per joint for the whole session, so curves don't jump while panning. */
function scaleOf(values: (number | null)[]): { lo: number; hi: number } | null {
  const range = seriesRange(values);
  if (!range) return null;
  const span = range.max - range.min;
  const pad = span > 1 ? span * 0.12 : 6;
  return { lo: range.min - pad, hi: range.max + pad };
}

function tickEvery(seconds: number): number {
  if (seconds <= 6) return 1;
  if (seconds <= 30) return 5;
  if (seconds <= 120) return 15;
  if (seconds <= 600) return 60;
  return 300;
}

function degrees(v: number): string {
  return `${Math.round(v)}°`;
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
    return JOINT_DISPLAY.map(({ joint, label }) => {
      const values = displaySeries(trace, joint);
      const scale = scaleOf(values);
      return { label, values, lo: scale?.lo ?? 0, hi: scale?.hi ?? 0 };
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
        return { label: j.label, d, range: visible, zeroY: j.lo < 0 && j.hi > 0 ? y(0) : null };
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
      <View style={{ gap: 2 }}>
        <Text variant="headline" color={colors.onDark}>
          Joint angles
        </Text>
        <Text variant="caption" color={colors.onDarkMuted}>
          {trace
            ? `${excerpt ? '2.5 s sample' : `${formatDuration(seconds)} recorded`} · degrees · flexion is positive`
            : 'Degrees · flexion is positive'}
        </Text>
      </View>

      <View onLayout={(e) => setFrame(Math.floor(e.nativeEvent.layout.width))}>
        {trace == null ? (
          <Text variant="callout" color={colors.onDarkMuted} align="center">
            {caption ?? 'Loading joint angles…'}
          </Text>
        ) : ready ? (
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={rows
              .map((r) => (r.range ? `${r.label} ${degrees(r.range.min)} to ${degrees(r.range.max)}` : `${r.label} not scored`))
              .join('. ')}
            style={{ height: chartH + AXIS_H }}
          >
            {rows.map((row) => (
              <View key={row.label} pointerEvents="none" style={{ height: ROW_H }}>
                <View style={{ height: HEADER_H, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text variant="callout" weight={700} color={colors.onDark}>
                    {row.label}
                  </Text>
                  <Text variant="caption" color={colors.onDarkMuted} style={{ fontVariant: ['tabular-nums'] }}>
                    {row.range ? `${degrees(row.range.min)} to ${degrees(row.range.max)}` : 'Not scored'}
                  </Text>
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
            ))}
            <View pointerEvents="none" style={{ height: AXIS_H }}>
              {ticks.map((t) => (
                <Text
                  key={t}
                  variant="caption"
                  color={colors.onDarkMuted}
                  style={{
                    position: 'absolute',
                    left: Math.min(Math.max(xOf(t) - 18, 0), frame - 36),
                    width: 36,
                    textAlign: 'center',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatDuration(offset + t)}
                </Text>
              ))}
            </View>

            {/* An empty strip as wide as the session at this zoom, so panning uses the platform's own scrolling. */}
            <ScrollView
              ref={scroller}
              horizontal
              scrollEnabled={pans}
              showsHorizontalScrollIndicator={pans}
              scrollEventThrottle={16}
              onScroll={(e) => setFrom(e.nativeEvent.contentOffset.x / pxPerSec)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
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
