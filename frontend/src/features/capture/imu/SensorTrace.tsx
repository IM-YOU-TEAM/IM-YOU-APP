import { useWindowDimensions, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Text } from '@/components';
import { colors, radii, space, WIDE } from '@/lib/theme';
import { TRACE_SECONDS, type SiteTrace } from './motionTypes';
import { SITE_LABELS, type ImuSample } from './protocol';

type Props = {
  /** One per leg. Empty until there is something to draw, which shows `caption` instead. */
  traces: SiteTrace[];
  caption?: string;
};

type Axis = Exclude<keyof ImuSample, 't'>;

type Panel = {
  title: string;
  unit: string;
  /** Fixed half-height. A scale that follows the data jumps every time a peak scrolls past. */
  range: number;
  axes: [Axis, Axis, Axis];
};

const W = 320;
const H = 100;
const PAD = 4;
/** Fewer points than this is a trace still filling in, not a signal. */
const MIN_POINTS = 8;

const AXIS_STYLE = [
  { label: 'X', color: colors.seagrass, opacity: 1 },
  { label: 'Y', color: colors.cherry, opacity: 1 },
  { label: 'Z', color: colors.white, opacity: 0.7 },
];

const PANELS: Panel[] = [
  // Gravity alone is 9.8, and a brisk step on the shin peaks near 2 g.
  { title: 'Accelerometer', unit: 'm/s²', range: 20, axes: ['ax', 'ay', 'az'] },
  // Thigh swing peaks around 250 °/s when walking, the shin near 450.
  { title: 'Gyroscope', unit: '°/s', range: 500, axes: ['gx', 'gy', 'gz'] },
];

/** Time runs right to left from `end`, so a phone sending fewer or uneven samples still lines up. */
function tracePath(samples: ImuSample[], end: number, axis: Axis, range: number): string {
  const half = H / 2 - PAD;
  let d = '';
  samples.forEach((sample, i) => {
    const value = Math.max(-1, Math.min(1, sample[axis] / range));
    const x = (W - ((end - sample.t) / TRACE_SECONDS) * W).toFixed(1);
    const y = (H / 2 - value * half).toFixed(1);
    d += `${i === 0 ? 'M' : 'L'}${x} ${y}`;
  });
  return d;
}

function TracePanel({ panel, trace }: { panel: Panel; trace: SiteTrace }) {
  return (
    <View style={{ flex: 1, gap: space.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="caption" color={colors.onDarkMuted}>
          {panel.title}
        </Text>
        <Text variant="caption" color={colors.onDarkMuted} style={{ fontVariant: ['tabular-nums'] }}>
          {panel.unit}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <Line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="rgba(255,255,255,0.18)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          {[H / 4, (H * 3) / 4].map((y) => (
            <Line key={y} x1={0} x2={W} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {panel.axes.map((axis, i) => (
            <Path
              key={axis}
              d={tracePath(trace.samples, trace.end, axis, panel.range)}
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
    </View>
  );
}

function SiteSection({ trace }: { trace: SiteTrace }) {
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
            <TracePanel key={panel.title} panel={panel} trace={trace} />
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
  const ready = traces.some((trace) => trace.samples.length > MIN_POINTS);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={ready ? 'Live accelerometer and gyroscope from the right thigh and right shin' : caption ?? 'Waiting for sensors'}
      style={{
        flex: 1,
        minHeight: 300,
        borderRadius: radii.card,
        backgroundColor: colors.graphite,
        padding: space.xl - 4,
        gap: space.md,
      }}
    >
      <View style={{ flexDirection: 'row', gap: space.lg }}>
        {AXIS_STYLE.map((axis) => (
          <View key={axis.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
            <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: axis.color, opacity: axis.opacity }} />
            <Text variant="caption" color={colors.onDarkMuted}>
              {axis.label}
            </Text>
          </View>
        ))}
      </View>

      {ready ? (
        <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', gap: space.lg }}>
          {traces.map((trace) => (
            <SiteSection key={trace.site} trace={trace} />
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
