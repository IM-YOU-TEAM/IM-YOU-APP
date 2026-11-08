import { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';
import { Text } from '@/components';
import { colors, radii, shadows, space } from '@/lib/theme';
import { useReduceMotion } from '@/lib/useReduceMotion';

type Props = { paused: boolean };

/** "Recording" pill with a pulsing Cherry Blossom dot (static under Reduce Motion or when paused). */
export function RecordingBadge({ paused }: Props) {
  const reduce = useReduceMotion();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (paused || reduce) {
      pulse.setValue(1);
      return;
    }
    const native = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: native }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [paused, reduce, pulse]);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={paused ? 'Paused' : 'Recording'}
      accessibilityLiveRegion="polite"
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: radii.pill, paddingVertical: space.sm, paddingHorizontal: space.lg },
        shadows.card,
      ]}
    >
      <Animated.View
        style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: paused ? colors.textMuted : colors.cherry, opacity: pulse }}
      />
      <Text variant="callout" weight={700}>
        {paused ? 'Paused' : 'Recording'}
      </Text>
    </View>
  );
}
