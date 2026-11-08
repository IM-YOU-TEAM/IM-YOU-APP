import { View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Text } from '@/components';
import { colors, radii, space } from '@/lib/theme';
import { TRACE_SAMPLES } from './motionTypes';
import type { ImuSample } from './protocol';

type Props = {
  samples: ImuSample[];
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

function tracePath(samples: ImuSample[], axis: Axis, range: number): string {
  const step = W / (TRACE_SAMPLES - 1);
  const offset = W - (samples.length - 1) * step;
  const half = H / 2 - PAD;
  let d = '';
  samples.forEach((sample, i) => {
    const value = Math.max(-1, Math.min(1, sample[axis] / range));
    const x = (offset + i * step).toFixed(1);
    const y = (H / 2 - value * half).toFixed(1);
    d += `${i === 0 ? 'M' : 'L'}${x} ${y}`;
  });
  return d;
}

function TracePanel({ panel, samples }: { panel: Panel; samples: ImuSample[] }) {
  return (
    <View style={{ flex: 1, gap: space.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="caption" weight={700} color={colors.onDark}>
          {panel.title}
        </Text>
        <Text variant="caption" color={colors.onDarkMuted} style={{ fontVariant: ['tabular-nums'] }}>
          ±{panel.range} {panel.unit}
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
              d={tracePath(samples, axis, panel.range)}
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

/** Live accelerometer and gyroscope from this phone. Joint angles belong on the clinician page. */
export function SensorTrace({ samples, caption }: Props) {
  const ready = samples.length > 8;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={ready ? 'Live accelerometer and gyroscope from this phone' : caption ?? 'Waiting for sensors'}
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
        <View style={{ flex: 1, gap: space.md }}>
          {PANELS.map((panel) => (
            <TracePanel key={panel.title} panel={panel} samples={samples} />
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
