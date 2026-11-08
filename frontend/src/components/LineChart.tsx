import { useId, useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors, radii, shadows } from '@/lib/theme';
import { smoothPath } from '@/lib/smoothPath';
import { Text } from './Text';

export type ChartPoint = { label: string; value: number };

type Props = {
  data: ChartPoint[];
  /** Total height including labels. Default 220. */
  height?: number;
  /** Tooltip / screen-reader text for a value. Default: the number. */
  formatValue?: (value: number) => string;
  /** Fixed y range. Default: fitted to the data with some headroom. */
  yDomain?: [number, number];
  /** Read by screen readers, e.g. "Gait score over the last 4 weeks". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const TOP = 48; // room for the tooltip bubble
const BOTTOM = 28; // room for x labels
const SIDE = 20;

/** Smooth line + soft area fill. Tap, hover or focus a point to see its value. Last point selected by default. */
export function LineChart({ data, height = 220, formatValue = String, yDomain, accessibilityLabel, style }: Props) {
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const gradientId = `area${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const n = data.length;
  const selected = picked !== null && picked < n ? picked : n - 1;

  const values = data.map((d) => d.value);
  const [lo, hi] = yDomain ?? [Math.min(...values) - 5, Math.max(...values) + 5];
  const plotH = height - TOP - BOTTOM;
  const stepX = n > 1 ? (width - SIDE * 2) / (n - 1) : 0;
  const pts = data.map((d, i) => ({
    x: n > 1 ? SIDE + i * stepX : width / 2,
    y: TOP + (1 - (d.value - lo) / (hi - lo || 1)) * plotH,
  }));
  const line = smoothPath(pts);
  const baseY = TOP + plotH;
  const area = n > 1 ? `${line} L ${pts[n - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z` : '';
  const labelEvery = Math.ceil(n / 7);
  const sel = pts[selected];
  const colW = n > 1 ? stepX : width;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel={accessibilityLabel}
      style={[{ height }, style]}
    >
      {width > 0 && n > 0 && (
        <>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.seagrass} stopOpacity={0.28} />
                <Stop offset="1" stopColor={colors.seagrass} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Line x1={SIDE} x2={width - SIDE} y1={baseY} y2={baseY} stroke={colors.border} strokeWidth={1} />
            {area !== '' && <Path d={area} fill={`url(#${gradientId})`} />}
            <Path d={line} stroke={colors.seagrass} strokeWidth={3} fill="none" strokeLinecap="round" />
            <Line x1={sel.x} x2={sel.x} y1={sel.y} y2={baseY} stroke={colors.seagrass} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 4" />
            <Circle cx={sel.x} cy={sel.y} r={7} fill={colors.white} stroke={colors.seagrass} strokeWidth={3} />
          </Svg>

          {/* Tooltip bubble */}
          <View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: sel.y - 46,
                left: Math.min(Math.max(sel.x - 44, 0), width - 88),
                width: 88,
                height: 34,
                borderRadius: radii.pill,
                backgroundColor: colors.graphite,
                alignItems: 'center',
                justifyContent: 'center',
              },
              shadows.raised,
            ]}
          >
            <Text variant="callout" weight={700} color={colors.onDark} numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
              {formatValue(data[selected].value)}
            </Text>
          </View>

          {/* X labels */}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <Text
                key={`l${i}`}
                variant="caption"
                weight={i === selected ? 700 : 500}
                muted={i !== selected}
                align="center"
                numberOfLines={1}
                style={{ position: 'absolute', bottom: 4, width: 56, left: pts[i].x - 28 }}
              >
                {d.label}
              </Text>
            ) : null,
          )}

          {/* Hit zones: one column per point (touch, hover, keyboard) */}
          {data.map((d, i) => (
            <Pressable
              key={`h${i}`}
              onPress={() => setPicked(i)}
              onHoverIn={() => setPicked(i)}
              onFocus={() => setPicked(i)}
              accessibilityRole="button"
              accessibilityLabel={`${d.label}: ${formatValue(d.value)}`}
              accessibilityState={{ selected: i === selected }}
              style={{ position: 'absolute', top: 0, bottom: 0, left: pts[i].x - colW / 2, width: colW }}
            />
          ))}
        </>
      )}
    </View>
  );
}
