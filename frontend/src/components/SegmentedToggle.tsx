import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, shadows, space } from '@/lib/theme';
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
const PAD = 3;

/** iOS segmented control (e.g. Week / Month): neutral track, white thumb that slides to the selection. */
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
    const spring = { useNativeDriver: false, speed: 20, bounciness: 4 };
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
        { flexDirection: 'row', padding: PAD, borderRadius: radii.pill, backgroundColor: colors.fill, alignSelf: 'flex-start' },
        style,
      ]}
    >
      {target && (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: PAD, bottom: PAD, left, width, borderRadius: radii.pill, backgroundColor: colors.white },
            shadows.raised,
          ]}
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
            hitSlop={{ top: 4, bottom: 4 }}
            style={{ flexGrow: 1, minWidth: 72, minHeight: 36, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text variant="callout" weight={selected ? 600 : 500} muted={!selected} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
