import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Text } from '@/components';
import { colors, radii, space, WIDE } from '@/lib/theme';
import { TRACE_SECONDS, type SiteTrace } from './motionTypes';
import { SITE_LABELS, type ImuSample } from './protocol';
import { UnitToggle } from './UnitToggle';

type Props = {
  /** One per leg. Empty until there is something to draw, which shows `caption` instead. */
  traces: SiteTrace[];
  caption?: string;
};

type Axis = Exclude<keyof ImuSample, 't'>;
type AccelUnit = 'ms2' | 'g';
type GyroUnit = 'dps' | 'radps';

type Panel = {
  title: string;
  kind: 'accel' | 'gyro';
  nativeRange: number;
  axes: [Axis, Axis, Axis];
};

const W = 320;
const H = 88;
const PAD = 4;
const G = 9.81;
const DEG_TO_RAD = Math.PI / 180;
/** Fewer points than this is a trace still filling in, not a signal. */
const MIN_POINTS = 8;
const X_TICKS = [3, 2, 1, 0];

const AXIS_STYLE = [
  { label: 'X', color: colors.seagrass, opacity: 1 },
  { label: 'Y', color: colors.cherry, opacity: 1 },
  { label: 'Z', color: colors.white, opacity: 0.7 },
];

const PANELS: Panel[] = [
  // Gravity alone is 9.8, and a brisk step on the shin peaks near 2 g.
  { title: 'Accelerometer', kind: 'accel', nativeRange: 20, axes: ['ax', 'ay', 'az'] },
  // Thigh swing peaks around 250 °/s when walking, the shin near 450.
  { title: 'Gyroscope', kind: 'gyro', nativeRange: 500, axes: ['gx', 'gy', 'gz'] },
];

const ACCEL_UNITS: { value: AccelUnit; label: string }[] = [
  { value: 'ms2', label: 'm/s²' },
  { value: 'g', label: 'g' },
];

const GYRO_UNITS: { value: GyroUnit; label: string }[] = [
  { value: 'dps', label: '°/s' },
  { value: 'radps', label: 'rad/s' },
];

function convert(value: number, kind: Panel['kind'], accelUnit: AccelUnit, gyroUnit: GyroUnit): number {
  if (kind === 'accel') return accelUnit === 'g' ? value / G : value;
  return gyroUnit === 'radps' ? value * DEG_TO_RAD : value;
}

function unitLabel(kind: Panel['kind'], accelUnit: AccelUnit, gyroUnit: GyroUnit): string {
  if (kind === 'accel') return accelUnit === 'g' ? 'g' : 'm/s²';
  return gyroUnit === 'radps' ? 'rad/s' : '°/s';
}

function rangeOf(panel: Panel, accelUnit: AccelUnit, gyroUnit: GyroUnit): number {
  return convert(panel.nativeRange, panel.kind, accelUnit, gyroUnit);
}

function formatBound(range: number, unit: string): string {
  if (unit === 'g' || unit === 'rad/s') return `${range.toFixed(1)}`;
  return `${Math.round(range)}`;
}

/** Time runs right to left from `end`, so a phone sending fewer or uneven samples still lines up. */
function tracePath(
  samples: ImuSample[],
  end: number,
  axis: Axis,
  range: number,
  kind: Panel['kind'],
  accelUnit: AccelUnit,
  gyroUnit: GyroUnit,
): string {
  const half = H / 2 - PAD;
  let d = '';
  samples.forEach((sample, i) => {
    const value = Math.max(-1, Math.min(1, convert(sample[axis], kind, accelUnit, gyroUnit) / range));
    const x = (W - ((end - sample.t) / TRACE_SECONDS) * W).toFixed(1);
    const y = (H / 2 - value * half).toFixed(1);
    d += `${i === 0 ? 'M' : 'L'}${x} ${y}`;
  });
  return d;
}

function TracePanel({
  panel,
  trace,
  accelUnit,
  gyroUnit,
}: {
  panel: Panel;
  trace: SiteTrace;
  accelUnit: AccelUnit;
  gyroUnit: GyroUnit;
}) {
  const unit = unitLabel(panel.kind, accelUnit, gyroUnit);
  const range = rangeOf(panel, accelUnit, gyroUnit);
  const bound = formatBound(range, unit);

  return (
    <View style={{ flex: 1, gap: space.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="caption" color={colors.onDarkMuted}>
          {panel.title}
        </Text>
        <Text variant="caption" color={colors.onDarkMuted} style={{ fontVariant: ['tabular-nums'] }}>
          ±{bound} {unit}
        </Text>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', gap: space.xs }}>
        <View style={{ width: 36, justifyContent: 'space-between' }}>
          <Text variant="caption" color={colors.onDarkMuted} align="right" style={{ fontVariant: ['tabular-nums'] }}>
            {bound}
          </Text>
          <Text variant="caption" color={colors.onDarkMuted} align="right" style={{ fontVariant: ['tabular-nums'] }}>
            0
          </Text>
          <Text variant="caption" color={colors.onDarkMuted} align="right" style={{ fontVariant: ['tabular-nums'] }}>
            −{bound}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flex: 1 }}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
              <Line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="rgba(255,255,255,0.18)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              {[H / 4, (H * 3) / 4].map((y) => (
                <Line key={y} x1={0} x2={W} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              {panel.axes.map((axis, i) => (
                <Path
                  key={axis}
                  d={tracePath(trace.samples, trace.end, axis, range, panel.kind, accelUnit, gyroUnit)}
                  stroke={AXIS_STYLE[i].color}
                  strokeOpacity={AXIS_STYLE[i].opacity}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </Svg>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {X_TICKS.map((seconds) => (
              <Text key={seconds} variant="caption" color={colors.onDarkMuted} style={{ fontVariant: ['tabular-nums'] }}>
                {seconds === 0 ? 'now' : `−${seconds}s`}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function SiteSection({
  trace,
  accelUnit,
  gyroUnit,
}: {
  trace: SiteTrace;
  accelUnit: AccelUnit;
  gyroUnit: GyroUnit;
}) {
  const label = SITE_LABELS[trace.site];
  return (
    <View style={{ flex: 1, gap: space.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="callout" weight={700} color={colors.onDark}>
          {label}
        </Text>
        <Text variant="caption" color={colors.onDarkMuted}>
          {trace.mine ? 'This phone' : 'Second phone'}
        </Text>
      </View>
      {trace.samples.length > MIN_POINTS ? (
        <View style={{ flex: 1, gap: space.sm }}>
          {PANELS.map((panel) => (
            <TracePanel key={panel.title} panel={panel} trace={trace} accelUnit={accelUnit} gyroUnit={gyroUnit} />
          ))}
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text variant="caption" color={colors.onDarkMuted} align="center">
            Waiting for the {label.toLowerCase()}…
          </Text>
        </View>
      )}
    </View>
  );
}

/** Live accelerometer and gyroscope from both legs. Joint angles belong on the clinician page. */
export function SensorTrace({ traces, caption }: Props) {
  const wide = useWindowDimensions().width >= WIDE;
  const [accelUnit, setAccelUnit] = useState<AccelUnit>('ms2');
  const [gyroUnit, setGyroUnit] = useState<GyroUnit>('dps');

  return (
    <View
      style={{
        flex: 1,
        minHeight: 300,
        borderRadius: radii.card,
        backgroundColor: colors.graphite,
        padding: space.xl - 4,
        gap: space.md,
      }}
    >
      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, alignItems: 'center' }}>
          {AXIS_STYLE.map((axis) => (
            <View key={axis.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
              <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: axis.color, opacity: axis.opacity }} />
              <Text variant="caption" color={colors.onDarkMuted}>
                {axis.label}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, alignItems: 'center' }}>
          <UnitToggle options={ACCEL_UNITS} value={accelUnit} onChange={setAccelUnit} accessibilityLabel="Accelerometer units" />
          <UnitToggle options={GYRO_UNITS} value={gyroUnit} onChange={setGyroUnit} accessibilityLabel="Gyroscope units" />
        </View>
        <Text variant="caption" color={colors.onDarkMuted}>
          Vertical axis is the chosen unit. Horizontal axis is time in seconds, with now on the right.
        </Text>
      </View>

      {traces.length > 0 ? (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Live accelerometer in ${unitLabel('accel', accelUnit, gyroUnit)} and gyroscope in ${unitLabel('gyro', accelUnit, gyroUnit)} from the right thigh and right shin. Time in seconds, zero is now.`}
          style={{ flex: 1, flexDirection: wide ? 'row' : 'column', gap: space.lg }}
        >
          {traces.map((trace) => (
            <SiteSection key={trace.site} trace={trace} accelUnit={accelUnit} gyroUnit={gyroUnit} />
          ))}
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text variant="callout" color={colors.onDarkMuted} align="center">
            {caption ?? 'Waiting for both phones…'}
          </Text>
        </View>
      )}
    </View>
  );
}
