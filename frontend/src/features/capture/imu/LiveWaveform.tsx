import { View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Text } from '@/components';
import { smoothPath } from '@/lib/smoothPath';
import { colors, radii, space } from '@/lib/theme';
import type { JointName } from './liveTypes';

type Props = {
  /** Newest window of predicted joint angles, or undefined before the first one. */
  angles?: Record<JointName, number[]>;
  /** Shown instead of the trace when there is nothing to draw. */
  caption?: string;
};

const W = 320;
const H = 200;
/** Enough detail to see the gait cycle without drawing all 250 points. */
const POINTS = 64;

const TRACES: { joint: JointName; label: string; color: string; opacity?: number }[] = [
  { joint: 'hip_flexion_r', label: 'Hip', color: colors.seagrass },
  { joint: 'knee_angle_r', label: 'Knee', color: colors.white },
  { joint: 'ankle_angle_r', label: 'Ankle', color: colors.honeydew, opacity: 0.55 },
];

/** Thin a series to POINTS evenly spaced samples. */
function thin(series: number[]): number[] {
  if (series.length <= POINTS) return series;
  const step = (series.length - 1) / (POINTS - 1);
  return Array.from({ length: POINTS }, (_, i) => series[Math.round(i * step)]);
}

/**
 * One trace scaled into its own horizontal band, so three joints with different
 * ranges stay readable together. A flat line means the angle did not change.
 */
function tracePath(series: number[], index: number, total: number): string {
  const points = thin(series);
  const band = H / total;
  const mid = band * (index + 0.5);
  const low = Math.min(...points);
  const high = Math.max(...points);
  const span = high - low;
  const scale = span > 1 ? (band * 0.72) / span : 0;

  return smoothPath(
    points.map((value, i) => ({
      x: (i / (points.length - 1)) * W,
      y: mid - (value - (low + high) / 2) * scale,
    })),
    0.18,
  );
}

/** Live view of the model's predicted joint angles for the last window. */
export function LiveWaveform({ angles, caption }: Props) {
  const ready = angles != null && TRACES.every((t) => (angles[t.joint]?.length ?? 0) > 1);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        ready ? 'Live predicted hip, knee and ankle angles' : caption ?? 'Waiting for sensor data'
      }
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
        {TRACES.map((t) => (
          <View key={t.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
            <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: t.color, opacity: t.opacity ?? 1 }} />
            <Text variant="caption" color={colors.onDarkMuted}>
              {t.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        {ready ? (
          <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            {[1, 2].map((i) => (
              <Line
                key={i}
                x1={0}
                x2={W}
                y1={(H / 3) * i}
                y2={(H / 3) * i}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
            ))}
            {TRACES.map((t, i) => (
              <Path
                key={t.label}
                d={tracePath(angles![t.joint], i, TRACES.length)}
                stroke={t.color}
                strokeOpacity={t.opacity ?? 1}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </Svg>
        ) : (
          <Text variant="callout" color={colors.onDarkMuted} align="center">
            {caption ?? 'Waiting for both phones…'}
          </Text>
        )}
      </View>
    </View>
  );
}
