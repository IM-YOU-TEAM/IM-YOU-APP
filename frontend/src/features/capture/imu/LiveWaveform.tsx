import { View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Text } from '@/components';
import { smoothPath } from '@/lib/smoothPath';
import { colors, radii, space } from '@/lib/theme';
import type { MotionType } from '@/types';
import { usePhase } from '../usePhase';

type Props = {
  motion: MotionType;
  /** False when paused or when Reduce Motion is on: the lines hold still. */
  running: boolean;
};

// Mock live sensor trace (not data): three axes drawn from simple sine waves.
const W = 320;
const H = 200;
const POINTS = 48;

/** Steps (or reps) per second, so the trace roughly matches the movement. */
const RATE: Record<MotionType, number> = { chairStand: 0.45 };

const AXES = [
  { label: 'X', color: colors.seagrass, amp: 26, harmonic: 1, shift: 0 },
  { label: 'Y', color: colors.white, amp: 34, harmonic: 2, shift: 1.1 },
  { label: 'Z', color: colors.honeydew, amp: 18, harmonic: 1, shift: 2.2, opacity: 0.55 },
];

function axisPath(rate: number, t: number, i: number): string {
  const a = AXES[i];
  const mid = (H / (AXES.length + 1)) * (i + 1);
  const pts = Array.from({ length: POINTS }, (_, k) => {
    const x = (k / (POINTS - 1)) * W;
    const phase = 2 * Math.PI * (rate * (t - k / 30)) + a.shift; // ~1.6 s of history across the panel
    const y = mid + a.amp * (0.75 * Math.sin(a.harmonic * phase) + 0.25 * Math.sin(3 * phase + i));
    return { x, y };
  });
  return smoothPath(pts, 0.18);
}

/** Mock motion-sensor view: a dark panel with three scrolling axis lines. */
export function LiveWaveform({ motion, running }: Props) {
  const t = usePhase(running);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Live motion sensor trace for three axes"
      style={{ flex: 1, minHeight: 300, borderRadius: radii.card, backgroundColor: colors.graphite, padding: space.xl - 4, gap: space.md }}
    >
      <View style={{ flexDirection: 'row', gap: space.lg }}>
        {AXES.map((a) => (
          <View key={a.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
            <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: a.color, opacity: a.opacity ?? 1 }} />
            <Text variant="caption" color={colors.onDarkMuted}>
              {a.label}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {[1, 2, 3].map((i) => (
            <Line key={i} x1={0} x2={W} y1={(H / 4) * i} y2={(H / 4) * i} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          ))}
          {AXES.map((a, i) => (
            <Path
              key={a.label}
              d={axisPath(RATE[motion], t, i)}
              stroke={a.color}
              strokeOpacity={a.opacity ?? 1}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}
