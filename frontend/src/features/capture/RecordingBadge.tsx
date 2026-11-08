import { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';
import { Text } from '@/components';
import { colors, radii, shadows, space } from '@/lib/theme';
import { useReduceMotion } from '@/lib/useReduceMotion';

type RecordingStatus = 'setting-up' | 'recording' | 'paused' | 'camera-blocked';
type Props = { status: RecordingStatus };

/** Capture-state pill; only the active recording state pulses. */
export function RecordingBadge({ status }: Props) {
  const reduce = useReduceMotion();
  const pulse = useRef(new Animated.Value(1)).current;
  const recording = status === 'recording';

  useEffect(() => {
    if (!recording || reduce) {
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
  }, [recording, reduce, pulse]);

  const label = statusLabel(status);
  const dot = statusColor(status);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: radii.pill, paddingVertical: space.sm, paddingHorizontal: space.lg },
        shadows.card,
      ]}
    >
      <Animated.View
        style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dot, opacity: pulse }}
      />
      <Text variant="callout" weight={700}>
        {label}
      </Text>
    </View>
  );
}

function statusLabel(status: RecordingStatus): string {
  switch (status) {
    case 'setting-up':
      return 'Setting up';
    case 'recording':
      return 'Recording';
    case 'paused':
      return 'Paused';
    case 'camera-blocked':
      return 'Camera unavailable';
    default: {
      const unexpected: never = status;
      return unexpected;
    }
  }
}

function statusColor(status: RecordingStatus): string {
  switch (status) {
    case 'setting-up':
      return colors.seagrass;
    case 'recording':
      return colors.cherry;
    case 'paused':
      return colors.textMuted;
    case 'camera-blocked':
      return colors.graphite;
    default: {
      const unexpected: never = status;
      return unexpected;
    }
  }
}
