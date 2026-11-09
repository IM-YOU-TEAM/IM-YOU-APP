import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, type ScrollViewInstance, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { Card, SegmentedToggle, Text } from '@/components';
import { formatDuration } from '@/lib/format';
import { smoothPath, type Point } from '@/lib/smoothPath';
import { colors, space } from '@/lib/theme';
import type { JointName, JointTrace, MotionType } from '@/types';
import { CYCLE_POINTS, gaitCycle, typicalCycle, typicalRange, type GaitCycle } from './gaitCycle';
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
  /** Typical walking bands are only drawn for walking. */
  motion?: MotionType;
};

type Mode = 'stride' | 'session';

const MODES = [
  { value: 'stride', label: 'Average stride' },
  { value: 'session', label: 'Whole session' },
] as const;

/**
 * Fixed clinical scales, the same for every patient and session, so charts can be compared by eye
 * and against a printed report. Widened only if a value falls outside.
 */
const JOINTS: { joint: JointName; name: string; up: string; down: string; lo: number; hi: number; step: number }[] = [
  { joint: 'hip_flexion_r', name: 'Hip', up: 'Flex', down: 'Ext', lo: -20, hi: 60, step: 20 },
  { joint: 'knee_angle_r', name: 'Knee', up: 'Flex', down: 'Ext', lo: -10, hi: 80, step: 20 },
  { joint: 'ankle_angle_r', name: 'Ankle', up: 'Dorsi', down: 'Plantar', lo: -30, hi: 30, step: 15 },
];

const CHART_H = 128;
const SESSION_CHART_H = 88;
const Y_AXIS_W = 40;
const X_AXIS_H = 18;
/** Room above the top tick and below the bottom one, so their labels are not cramped. */
const PAD_Y = 8;

/** Vertical position of a value in a chart of this height. */
const yIn = (height: number, { lo, hi }: Scale) => (v: number) =>
  PAD_Y + (1 - (v - lo) / (hi - lo)) * (height - 2 * PAD_Y);
const CYCLE_TICKS = [0, 20, 40, 60, 80, 100];
/** Past this the slider shows the whole recording. */
const WHOLE_SNAP = 0.985;

const BAND_TYPICAL = 'rgba(60, 55, 68, 0.11)';
const BAND_SPREAD = 'rgba(38, 159, 134, 0.24)';

type Scale = { lo: number; hi: number; ticks: number[] };

function scaleFor(spec: (typeof JOINTS)[number], values: number[]): Scale {
  const finite = values.filter(Number.isFinite);
  const min = finite.length ? Math.min(...finite) : spec.lo;
  const max = finite.length ? Math.max(...finite) : spec.hi;
  const lo = Math.min(spec.lo, Math.floor(min / spec.step) * spec.step);
  const hi = Math.max(spec.hi, Math.ceil(max / spec.step) * spec.step);
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / spec.step) * spec.step; t <= hi; t += spec.step) ticks.push(t);
  return { lo, hi, ticks };
}

const deg = (v: number) => `${Math.round(v) < 0 ? '−' : ''}${Math.abs(Math.round(v))}°`;

function tickEvery(seconds: number): number {
  if (seconds <= 6) return 1;
  if (seconds <= 30) return 5;
  if (seconds <= 120) return 15;
  if (seconds <= 600) return 60;
  return 300;
}

function viewLabel(view: number, seconds: number): string {
  if (view >= seconds - 0.05) return `Whole session, ${formatDuration(seconds)}`;
  if (view < 10) return `${view.toFixed(1)} s`;
  if (view < 60) return `${Math.round(view)} s`;
  return formatDuration(view);
}

/** Degree labels down the left of one joint's chart. */
function YAxis({ scale, height, y }: { scale: Scale; height: number; y: (v: number) => number }) {
  return (
    <View style={{ width: Y_AXIS_W, height }}>
      {scale.ticks.map((tick) => (
        <Text
          key={tick}
          variant="caption"
          muted
          align="right"
          style={{
            position: 'absolute',
            top: y(tick) - 7,
            right: space.sm,
            fontSize: 11,
            lineHeight: 14,
            fontVariant: ['tabular-nums'],
          }}
        >
          {deg(tick)}
        </Text>
      ))}
    </View>
  );
}

function JointHeader({ spec, right }: { spec: (typeof JOINTS)[number]; right?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm, marginLeft: Y_AXIS_W }}>
      <Text variant="callout" style={{ flexShrink: 1 }} numberOfLines={1}>
        <Text variant="callout" weight={700}>
          {spec.name}
        </Text>
        <Text variant="caption" muted>
          {`  ${spec.up} ↑  ${spec.down} ↓`}
        </Text>
      </Text>
      {right ? (
        <Text variant="caption" weight={600} muted numberOfLines={1} style={{ flexShrink: 0, fontVariant: ['tabular-nums'] }}>
          {right}
        </Text>
      ) : null}
    </View>
  );
}

function Swatch({ kind }: { kind: 'line' | 'spread' | 'typical' }) {
  return (
    <Svg width={22} height={12}>
      {kind === 'line' ? (
        <Line x1={1} x2={21} y1={6} y2={6} stroke={colors.seagrass} strokeWidth={2.5} strokeLinecap="round" />
      ) : (
        <Rect x={0} y={1} width={22} height={10} rx={3} fill={kind === 'spread' ? BAND_SPREAD : BAND_TYPICAL} />
      )}
    </Svg>
  );
}

function LegendItem({ kind, label }: { kind: 'line' | 'spread' | 'typical'; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <Swatch kind={kind} />
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}

/** Upper edge forward, lower edge back: a filled band between two curves. */
function bandPath(upper: Point[], lower: Point[]): string {
  if (upper.length < 2) return '';
  const forward = upper.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const back = [...lower].reverse().map((p) => `L ${p.x} ${p.y}`).join(' ');
  return `${forward} ${back} Z`;
}

/** The averaged stride per joint, over a typical walking band, plus the numbers a clinician reads off it. */
function StrideView({ cycle, width, walking }: { cycle: GaitCycle; width: number; walking: boolean }) {
  const xOf = (k: number) => (k / (CYCLE_POINTS - 1)) * width;
  return (
    <View style={{ gap: space.lg }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs }}>
        <LegendItem kind="line" label="Patient average" />
        <LegendItem kind="spread" label="Stride-to-stride spread (±1 SD)" />
        {walking ? <LegendItem kind="typical" label="Typical adult walking" /> : null}
      </View>

      {JOINTS.map((spec) => {
        const data = cycle.joints[spec.joint];
        const typical = walking ? typicalCycle(spec.joint) : null;
        const scale = scaleFor(spec, [
          ...data.mean.map((m, k) => m + data.sd[k]),
          ...data.mean.map((m, k) => m - data.sd[k]),
        ]);
        const y = yIn(CHART_H, scale);
        const pts = (values: number[]) => values.map((v, k) => ({ x: xOf(k), y: y(v) }));
        const typicalBand = typical
          ? bandPath(pts(typical.mean.map((m) => m + typical.band)), pts(typical.mean.map((m) => m - typical.band)))
          : '';
        const spread = bandPath(pts(data.mean.map((m, k) => m + data.sd[k])), pts(data.mean.map((m, k) => m - data.sd[k])));
        return (
          <View
            key={spec.joint}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${spec.name} over an average stride: peak ${deg(data.peak)}, lowest ${deg(data.low)}, range ${deg(data.range)}${
              walking ? `, typical walking range about ${typicalRange(spec.joint)}°` : ''
            }.`}
            style={{ gap: space.xs }}
          >
            <JointHeader spec={spec} right={`Range ${deg(data.range)}`} />
            <View style={{ flexDirection: 'row' }} pointerEvents="none">
              <YAxis scale={scale} height={CHART_H} y={y} />
              <Svg width={width} height={CHART_H}>
                {scale.ticks.map((t) => (
                  <Line
                    key={t}
                    x1={0}
                    x2={width}
                    y1={y(t)}
                    y2={y(t)}
                    stroke={t === 0 ? colors.separator : colors.divider}
                    strokeWidth={t === 0 ? 1.5 : 1}
                  />
                ))}
                {CYCLE_TICKS.map((t) => (
                  <Line key={t} x1={(t / 100) * width} x2={(t / 100) * width} y1={0} y2={CHART_H} stroke={colors.divider} strokeWidth={1} />
                ))}
                {typicalBand ? <Path d={typicalBand} fill={BAND_TYPICAL} /> : null}
                <Path d={spread} fill={BAND_SPREAD} />
                <Path d={smoothPath(pts(data.mean), 0.15)} stroke={colors.seagrass} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          </View>
        );
      })}

      <View style={{ marginLeft: Y_AXIS_W, gap: 2 }}>
        <View style={{ height: X_AXIS_H }}>
          {CYCLE_TICKS.map((t) => (
            <Text
              key={t}
              variant="caption"
              muted
              style={{
                position: 'absolute',
                left: Math.min(Math.max((t / 100) * width - 18, 0), Math.max(width - 36, 0)),
                width: 36,
                textAlign: t === 0 ? 'left' : t === 100 ? 'right' : 'center',
                fontSize: 11,
                fontVariant: ['tabular-nums'],
              }}
            >
              {`${t}%`}
            </Text>
          ))}
        </View>
        <Text variant="caption" muted align="center">
          % of stride from heel strike (estimated)
        </Text>
      </View>

      <KeyNumbers cycle={cycle} walking={walking} />
    </View>
  );
}

function Cell({ children, first, strong }: { children: string; first?: boolean; strong?: boolean }) {
  return (
    <Text
      variant={first ? 'callout' : 'caption'}
      weight={strong || first ? 700 : 500}
      muted={!first && !strong}
      align={first ? 'left' : 'right'}
      numberOfLines={1}
      style={{ flex: first ? 1.1 : 1, fontVariant: ['tabular-nums'] }}
    >
      {children}
    </Text>
  );
}

/** Per-joint peaks and range of motion, averaged over strides, beside typical walking. */
function KeyNumbers({ cycle, walking }: { cycle: GaitCycle; walking: boolean }) {
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {[
          { label: 'Strides analysed', value: String(cycle.strides) },
          { label: 'Stride time', value: `${cycle.strideSec.toFixed(2)} s` },
          { label: 'Cadence, steps/min', value: String(cycle.cadence) },
        ].map((stat) => (
          <View
            key={stat.label}
            style={{ flexGrow: 1, flexBasis: 90, backgroundColor: colors.honeydewLight, borderRadius: 12, paddingVertical: space.sm, paddingHorizontal: space.md }}
          >
            <Text variant="callout" weight={700} style={{ fontVariant: ['tabular-nums'] }}>
              {stat.value}
            </Text>
            <Text variant="caption" muted>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      <View accessibilityRole="summary" style={{ gap: space.xs }}>
        <View style={{ flexDirection: 'row', gap: space.sm, paddingBottom: space.xs, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
          <Cell first>Joint</Cell>
          <Cell>Peak</Cell>
          <Cell>Lowest</Cell>
          <Cell>Range</Cell>
          {walking ? <Cell>Typical</Cell> : null}
        </View>
        {JOINTS.map((spec) => {
          const data = cycle.joints[spec.joint];
          return (
            <View key={spec.joint} style={{ flexDirection: 'row', gap: space.sm, paddingVertical: 2 }}>
              <Cell first>{spec.name}</Cell>
              <Cell>{deg(data.peak)}</Cell>
              <Cell>{deg(data.low)}</Cell>
              <Cell strong>{deg(data.range)}</Cell>
              {walking ? <Cell>{`~${typicalRange(spec.joint)}°`}</Cell> : null}
            </View>
          );
        })}
        <Text variant="caption" muted style={{ marginTop: space.xs }}>
          Positive is flexion (hip, knee) or dorsiflexion (ankle). Peak and lowest are averaged over strides.
        </Text>
      </View>
    </View>
  );
}

/** The whole recording against time, same clinical scales, with an adjustable time window. */
function SessionView({ trace, width, excerpt }: { trace: JointTrace; width: number; excerpt: boolean }) {
  const [requested, setRequested] = useState<number | null>(null);
  const [from, setFrom] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const pendingScroll = useRef<number | null>(null);

  const seconds = traceSeconds(trace);
  const bounds = viewBounds(seconds);
  const view = Math.min(Math.max(requested ?? seconds, bounds.min), bounds.max);
  const pxPerSec = width / view;
  const start = Math.min(Math.max(from, 0), Math.max(seconds - view, 0));
  const zoomable = !excerpt && bounds.max - bounds.min > 1;
  const hz = trace.sampleHz;

  const joints = useMemo(
    () =>
      JOINTS.map((spec) => {
        const values = displaySeries(trace, spec.joint);
        return { spec, values, scale: scaleFor(spec, values.filter((v): v is number => v != null)) };
      }),
    [trace],
  );

  useEffect(() => {
    if (pendingScroll.current == null) return;
    scroller.current?.scrollTo({ x: pendingScroll.current, animated: false });
    pendingScroll.current = null;
  }, [view]);

  const changeView = (fraction: number) => {
    const next = fraction >= WHOLE_SNAP ? bounds.max : viewFromSlider(fraction, bounds);
    const nextFrom = Math.min(Math.max(start + view / 2 - next / 2, 0), Math.max(seconds - next, 0));
    setRequested(next);
    setFrom(nextFrom);
    pendingScroll.current = (nextFrom * width) / next;
  };

  const every = tickEvery(view);
  const ticks: number[] = [];
  for (let t = Math.ceil(start / every) * every; t <= start + view + 1e-6; t += every) ticks.push(t);
  const xOf = (t: number) => (t - start) * pxPerSec;
  const pans = view < seconds - 0.05;
  const rowH = SESSION_CHART_H + 26;

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ height: JOINTS.length * rowH + X_AXIS_H + 18 }}>
        {joints.map(({ spec, values, scale }) => {
          const y = yIn(SESSION_CHART_H, scale);
          const [first, last] = visibleIndices(values.length, hz, start, view);
          // A gap (paused or unscored) breaks the line instead of drawing across it.
          let d = '';
          let segment: Point[] = [];
          const flush = () => {
            if (segment.length > 1) d += `${smoothPath(segment, 0.15)} `;
            segment = [];
          };
          values.slice(first, last + 1).forEach((v, k) => {
            if (v == null) flush();
            else segment.push({ x: ((first + k) / hz - start) * pxPerSec, y: y(v) });
          });
          flush();
          const shown = seriesRange(values.slice(Math.max(0, Math.ceil(start * hz)), Math.floor((start + view) * hz) + 1));
          return (
            <View
              key={spec.joint}
              accessible
              accessibilityRole="image"
              accessibilityLabel={shown ? `${spec.name} from ${deg(shown.min)} to ${deg(shown.max)}` : `${spec.name} not scored`}
              style={{ height: rowH, gap: space.xs }}
              pointerEvents="none"
            >
              <JointHeader spec={spec} right={shown ? `${deg(shown.min)} to ${deg(shown.max)}` : 'Not scored'} />
              <View style={{ flexDirection: 'row' }}>
                <YAxis scale={scale} height={SESSION_CHART_H} y={y} />
                <Svg width={width} height={SESSION_CHART_H}>
                  {scale.ticks.map((t) => (
                    <Line
                      key={t}
                      x1={0}
                      x2={width}
                      y1={y(t)}
                      y2={y(t)}
                      stroke={t === 0 ? colors.separator : colors.divider}
                      strokeWidth={t === 0 ? 1.5 : 1}
                    />
                  ))}
                  {ticks.map((t) => (
                    <Line key={t} x1={xOf(t)} x2={xOf(t)} y1={0} y2={SESSION_CHART_H} stroke={colors.divider} strokeWidth={1} />
                  ))}
                  <Path d={d} stroke={colors.seagrass} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
            </View>
          );
        })}
        <View pointerEvents="none" style={{ height: X_AXIS_H, marginLeft: Y_AXIS_W }}>
          {ticks.map((t) => (
            <Text
              key={t}
              variant="caption"
              muted
              style={{
                position: 'absolute',
                left: Math.min(Math.max(xOf(t) - 18, 0), Math.max(width - 36, 0)),
                width: 36,
                textAlign: 'center',
                fontSize: 11,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatDuration(trace.startSec + t)}
            </Text>
          ))}
        </View>
        <Text variant="caption" muted align="center" style={{ marginLeft: Y_AXIS_W }}>
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
          style={{ position: 'absolute', top: 0, left: Y_AXIS_W, right: 0, bottom: 18 }}
        >
          <View style={{ width: seconds * pxPerSec, height: JOINTS.length * rowH + X_AXIS_H }} />
        </ScrollView>
      </View>

      {zoomable ? (
        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" weight={600}>
              Time shown
            </Text>
            <Text variant="caption" muted style={{ fontVariant: ['tabular-nums'] }}>
              {viewLabel(view, seconds)}
            </Text>
          </View>
          <ViewSlider value={sliderFromView(view, bounds)} onChange={changeView} label="Time shown" valueText={viewLabel(view, seconds)} />
          {pans ? (
            <Text variant="caption" muted>
              Swipe the chart sideways to move through the session.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Predicted right-leg hip, knee and ankle angles. Opens on the averaged stride (0-100 % of the gait
 * cycle, with a typical walking band and key numbers), as a gait report shows it; the whole session
 * against time is one tap away.
 */
export function JointCurves({ trace, excerpt = false, caption, motion }: Props) {
  const [frame, setFrame] = useState(0);
  const cycle = useMemo(() => (trace && !excerpt ? gaitCycle(trace) : null), [trace, excerpt]);
  const [picked, setPicked] = useState<Mode>('stride');
  const mode: Mode = cycle ? picked : 'session';
  const walking = motion == null || motion === 'walking';
  const seconds = trace ? traceSeconds(trace) : 0;

  const subtitle = !trace
    ? 'Right leg · degrees'
    : mode === 'stride' && cycle
      ? `Average of ${cycle.strides} strides · right leg · degrees`
      : `${excerpt ? '2.5 s sample' : `${formatDuration(seconds)} recorded`} · right leg · degrees`;

  return (
    <Card style={{ gap: space.lg }}>
      <View style={{ gap: space.md }}>
        <View style={{ gap: 2 }}>
          <Text variant="headline">Joint angles</Text>
          <Text variant="caption" muted>
            {subtitle}
          </Text>
        </View>
        {cycle ? (
          <SegmentedToggle options={MODES} value={mode} onChange={setPicked} accessibilityLabel="Joint angle view" />
        ) : null}
      </View>

      <View onLayout={(e) => setFrame(Math.max(0, Math.floor(e.nativeEvent.layout.width) - Y_AXIS_W))}>
        {trace == null ? (
          <Text variant="callout" muted align="center">
            {caption ?? 'Loading joint angles…'}
          </Text>
        ) : frame <= 0 || seconds <= 0 ? null : mode === 'stride' && cycle ? (
          <StrideView cycle={cycle} width={frame} walking={walking} />
        ) : (
          <SessionView trace={trace} width={frame} excerpt={excerpt} />
        )}
      </View>

      {trace && !cycle && !excerpt && seconds > 0 ? (
        <Text variant="caption" muted>
          Not enough steady strides to average. Walk at your usual pace for at least 20 seconds to see the average stride.
        </Text>
      ) : null}
      {trace && excerpt ? (
        <Text variant="caption" muted>
          This session only saved a 2.5 s sample. Sessions recorded from now on save the whole recording.
        </Text>
      ) : null}
    </Card>
  );
}
