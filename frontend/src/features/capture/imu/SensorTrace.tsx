import { View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Text } from '@/components';
import { smoothPath } from '@/lib/smoothPath';
import { colors, radii, space } from '@/lib/theme';
import type { ImuSample } from './protocol';

type Props = {
  samples: ImuSample[];
  caption?: string;
};

const W = 320;
const H = 200;
const POINTS = 64;

const TRACES: { key: 'ax' | 'ay' | 'az'; label: string; color: string; opacity?: number }[] = [
  { key: 'ax', label: 'Ax', color: colors.seagrass },
  { key: 'ay', label: 'Ay', color: colors.white },
  { key: 'az', label: 'Az', color: colors.honeydew, opacity: 0.55 },
];

function thin(series: number[]): number[] {
  if (series.length <= POINTS) return series;
  const step = (series.length - 1) / (POINTS - 1);
  return Array.from({ length: POINTS }, (_, i) => series[Math.round(i * step)]);
}

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

/** Live accelerometer from this phone. Joint angles belong on the clinician page. */
export function SensorTrace({ samples, caption }: Props) {
  const ready = samples.length > 8;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={ready ? 'Live accelerometer from this phone' : caption ?? 'Waiting for sensors'}
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
        {TRACES.map((trace) => (
          <View key={trace.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
            <View
              style={{
                width: 14,
                height: 4,
                borderRadius: 2,
                backgroundColor: trace.color,
                opacity: trace.opacity ?? 1,
              }}
            />
            <Text variant="caption" color={colors.onDarkMuted}>
              {trace.label}
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
            {TRACES.map((trace, i) => (
              <Path
                key={trace.label}
                d={tracePath(
                  samples.map((sample) => sample[trace.key]),
                  i,
                  TRACES.length,
                )}
                stroke={trace.color}
                strokeOpacity={trace.opacity ?? 1}
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
