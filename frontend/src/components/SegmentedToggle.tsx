import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, MIN_HIT, radii, shadows, space } from '@/lib/theme';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { Text } from './Text';

export type SegmentOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Read by screen readers for the whole control, e.g. "Chart range". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

type Box = { x: number; width: number };
const PAD = 4;

/** Pill toggle (e.g. Week / Month). The selected option sits on a sliding Seagrass thumb. */
export function SegmentedToggle<T extends string>({ options, value, onChange, accessibilityLabel, style }: Props<T>) {
  const reduce = useReduceMotion();
  const [boxes, setBoxes] = useState<Record<number, Box>>({});
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const target = boxes[index];
  const left = useRef(new Animated.Value(0)).current;
  const width = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  useEffect(() => {
    if (!target) return;
    if (reduce || !placed.current) {
      left.setValue(target.x);
      width.setValue(target.width);
      placed.current = true;
      return;
    }
    const spring = { useNativeDriver: false, speed: 18, bounciness: 6 };
    Animated.parallel([
      Animated.spring(left, { ...spring, toValue: target.x }),
      Animated.spring(width, { ...spring, toValue: target.width }),
    ]).start();
  }, [target, reduce, left, width]);

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        { flexDirection: 'row', padding: PAD, borderRadius: radii.pill, backgroundColor: colors.white, alignSelf: 'flex-start' },
        shadows.card,
        style,
      ]}
    >
      {target && (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', top: PAD, bottom: PAD, left, width, borderRadius: radii.pill, backgroundColor: colors.seagrass }}
        />
      )}
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            onLayout={(e) => {
              const { x, width: w } = e.nativeEvent.layout;
              setBoxes((prev) => ({ ...prev, [i]: { x, width: w } }));
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            style={{ flexGrow: 1, minWidth: 72, minHeight: MIN_HIT, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text variant="callout" weight={700} color={selected ? colors.onSeagrass : colors.textMuted} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
