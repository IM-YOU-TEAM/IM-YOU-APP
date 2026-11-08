import { useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { useReduceMotion } from './useReduceMotion';

/**
 * Gentle spring "squish" for pressables. Spread the handlers on a Pressable and
 * put `transform: [{ scale }]` on an Animated.View. No-op when Reduce Motion is on.
 */
export function usePressScale(pressedScale = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduce = useReduceMotion();

  const to = (value: number) => {
    if (reduce) return;
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: Platform.OS !== 'web',
      speed: 40,
      bounciness: 6,
    }).start();
  };

  return {
    scale,
    onPressIn: () => to(pressedScale),
    onPressOut: () => to(1),
  };
}
