import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '@/lib/theme';
import { Text } from './Text';
import type { ChartPoint } from './LineChart';

type Props = {
  data: ChartPoint[];
  /** The one bar drawn in Burnt Orange (e.g. today). Counts as the screen's single highlight. */
  highlightIndex?: number;
  /** Total height including labels. Default 180. */
  height?: number;
  /** Top of the scale. Default: largest value. */
  maxValue?: number;
  /** Text for the value shown above the highlighted bar. Default: the number. */
  formatValue?: (value: number) => string;
  /** Read by screen readers, e.g. "Sessions per day this week". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const TOP = 26; // room for the highlight value
const BOTTOM = 26; // room for labels

/** Rounded pill bars on pale tracks. One optional highlighted bar. */
export function BarChart({ data, highlightIndex, height = 180, maxValue, formatValue = String, accessibilityLabel, style }: Props) {
  const [width, setWidth] = useState(0);
  const n = data.length;
  const max = maxValue ?? Math.max(1, ...data.map((d) => d.value));
  const plotH = height - TOP - BOTTOM;
  const slot = n > 0 ? width / n : 0;
  const barW = Math.min(30, slot * 0.56);
  const summary = data.map((d) => `${d.label} ${formatValue(d.value)}`).join(', ');

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${accessibilityLabel ? `${accessibilityLabel}. ` : ''}${summary}`}
      style={[{ height }, style]}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          {data.map((d, i) => {
            const x = i * slot + (slot - barW) / 2;
            const h = d.value > 0 ? Math.max(barW, (d.value / max) * plotH) : 0;
            const hi = i === highlightIndex;
            return [
              <Rect key={`t${i}`} x={x} y={TOP} width={barW} height={plotH} rx={barW / 2} fill={colors.honeydewLight} />,
              h > 0 ? (
                <Rect key={`b${i}`} x={x} y={TOP + plotH - h} width={barW} height={h} rx={barW / 2} fill={hi ? colors.burntOrange : colors.seagrass} />
              ) : null,
            ];
          })}
        </Svg>
      )}
      {width > 0 &&
        data.map((d, i) => {
          const hi = i === highlightIndex;
          return (
            <View key={i} pointerEvents="none" style={{ position: 'absolute', left: i * slot, width: slot, top: 0, bottom: 0 }}>
              {hi && (
                <Text
                  variant="caption"
                  weight={800}
                  align="center"
                  style={{ position: 'absolute', left: 0, right: 0, top: TOP + plotH - Math.max(barW, (d.value / max) * plotH) - 20 }}
                >
                  {formatValue(d.value)}
                </Text>
              )}
              <Text
                variant="caption"
                weight={hi ? 800 : 600}
                muted={!hi}
                align="center"
                numberOfLines={1}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 2 }}
              >
                {d.label}
              </Text>
            </View>
          );
        })}
    </View>
  );
}
