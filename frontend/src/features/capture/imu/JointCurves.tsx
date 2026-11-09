import { View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Text } from '@/components';
import { smoothPath } from '@/lib/smoothPath';
import { colors, radii, space } from '@/lib/theme';
import type { JointName } from './liveTypes';

type Props = {
  angles?: Record<JointName, number[]>;
  caption?: string;
};

const W = 320;
const H = 88;
const POINTS = 64;
const WINDOW_S = 2.5;

const JOINTS: { joint: JointName; label: string }[] = [
  { joint: 'hip_flexion_r', label: 'Hip' },
  { joint: 'knee_angle_r', label: 'Knee' },
  { joint: 'ankle_angle_r', label: 'Ankle' },
];

function thin(series: number[]): number[] {
  if (series.length <= POINTS) return series;
  const step = (series.length - 1) / (POINTS - 1);
  return Array.from({ length: POINTS }, (_, i) => series[Math.round(i * step)]);
}

function curve(series: number[]): { d: string; min: number; max: number } {
  const points = thin(series);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min;
  const pad = span > 1 ? span * 0.12 : 8;
  const lo = min - pad;
  const hi = max + pad;
  const d = smoothPath(
    points.map((value, i) => ({
      x: (i / (points.length - 1)) * W,
      y: H - ((value - lo) / (hi - lo || 1)) * H,
    })),
    0.18,
  );
  return { d, min, max };
}

/** Predicted joint curves: one window, time on X, degrees on Y, hip / knee / ankle stacked. */
export function JointCurves({ angles, caption }: Props) {
  const ready = angles != null && JOINTS.every((j) => (angles[j.joint]?.length ?? 0) > 1);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={ready ? 'Predicted hip, knee and ankle angles over 2.5 seconds' : caption}
      style={{
        borderRadius: radii.card,
        backgroundColor: colors.graphite,
        padding: space.xl - 4,
        gap: space.lg,
      }}
    >
      <View style={{ gap: 2 }}>
        <Text variant="headline" color={colors.onDark}>
          Joint angles
        </Text>
        <Text variant="caption" color={colors.onDarkMuted}>
          2.5 s window · degrees
        </Text>
      </View>

      {ready ? (
        JOINTS.map(({ joint, label }) => {
          const series = angles![joint];
          const { d, min, max } = curve(series);
          return (
            <View key={joint} style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text variant="callout" weight={700} color={colors.onDark}>
                  {label}
                </Text>
                <Text variant="caption" color={colors.onDarkMuted} style={{ fontVariant: ['tabular-nums'] }}>
                  {min.toFixed(0)}° to {max.toFixed(0)}°
                </Text>
              </View>
              <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                <Line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                <Path d={d} stroke={colors.seagrass} strokeWidth={2.4} fill="none" strokeLinecap="round" />
              </Svg>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" color={colors.onDarkMuted}>
                  0 s
                </Text>
                <Text variant="caption" color={colors.onDarkMuted}>
                  {WINDOW_S} s
                </Text>
              </View>
            </View>
          );
        })
      ) : (
        <Text variant="callout" color={colors.onDarkMuted} align="center">
          {caption ?? 'Waiting for a scored window…'}
        </Text>
      )}
    </View>
  );
}
