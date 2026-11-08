// Placeholder logo until the real one is provided. Hand-drawn SVG mark + text wordmark.
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/lib/theme';
import { Text } from './Text';

type Props = {
  /** Height of the mark in px. Default 36. */
  size?: number;
  /** 'full' = mark + "I'M U" wordmark, 'mark' = square mark only. Default 'full'. */
  variant?: 'full' | 'mark';
  /** Use on Seagrass or Graphite surfaces: white mark, white wordmark. */
  onDark?: boolean;
};

export function Logo({ size = 36, variant = 'full', onDark = false }: Props) {
  const tile = onDark ? colors.white : colors.seagrass;
  const ink = onDark ? colors.seagrass : colors.white;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="I'M U"
      style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }}
    >
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Rect x={0} y={0} width={40} height={40} rx={12} fill={tile} />
        {/* A motion arc: one stride, ending in a dot */}
        <Path
          d="M9 27 C 13 14, 21 12, 26 19"
          stroke={ink}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={30} cy={25} r={3.6} fill={ink} />
      </Svg>
      {variant === 'full' && (
        <Text
          weight={800}
          color={onDark ? colors.white : colors.graphite}
          style={{ fontSize: size * 0.62, lineHeight: size * 0.8, letterSpacing: -0.4 }}
        >
          I'M U
        </Text>
      )}
    </View>
  );
}
