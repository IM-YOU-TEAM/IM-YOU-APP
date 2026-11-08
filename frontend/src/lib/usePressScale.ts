import { useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { useReduceMotion } from './useReduceMotion';

/**
 * Gentle spring "squish" for pressables. Spread the handlers on a Pressable and
 * put `transform: [{ scale }]` on an Animated.View. No-op when Reduce Motion is on.
 */
export function usePressScale(pressedScale = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduce = useReduceMotion();
  const useNativeDriver = Platform.OS !== 'web';

  const pressIn = () => {
    if (reduce) return;
    scale.stopAnimation();
    Animated.timing(scale, {
      toValue: pressedScale,
      duration: 95,
      easing: Easing.out(Easing.quad),
      useNativeDriver,
    }).start();
  };

  const pressOut = () => {
    if (reduce) return;
    scale.stopAnimation();
    Animated.spring(scale, {
      toValue: 1,
      stiffness: 360,
      damping: 22,
      mass: 0.72,
      useNativeDriver,
    }).start();
  };

  return {
    scale,
    onPressIn: pressIn,
    onPressOut: pressOut,
  };
}
