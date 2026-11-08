import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { PillButton, ScreenContainer, Text } from '@/components';
import { ChoiceCard } from '@/features/capture/ChoiceCard';
import { FlowHeader } from '@/features/capture/FlowHeader';
import { MissingParams } from '@/features/capture/MissingParams';
import { parseMethod, parseMotion } from '@/features/capture/params';
import { METHOD_ICONS, METHOD_LABELS, MOTION_LABELS } from '@/lib/data';
import { GAP, space, WIDE } from '@/lib/theme';
import type { CaptureMethod } from '@/types';

const METHODS: CaptureMethod[] = ['cv', 'imu'];

const DESCRIPTIONS: Record<CaptureMethod, string> = {
  cv: 'Prop your phone up and let the camera watch your movement',
  imu: 'Two phones, same account: one on the right thigh, one on the right shin',
};

// Step 2: camera (computer vision) or phone sensors (IMU).
export default function MethodScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const params = useLocalSearchParams();
  const motion = parseMotion(params.motion);
  const [method, setMethod] = useState<CaptureMethod | null>(parseMethod(params.method));

  if (!motion) return <MissingParams />;

  const next = () => {
    if (method) router.push({ pathname: '/track/placement-guide', params: { motion, method } });
  };

  return (
    <ScreenContainer maxWidth={880} gap={space.xl}>
      <FlowHeader step={2} backTo={{ pathname: '/track/motion-type', params: { motion } }} />
      <View style={{ gap: space.sm }}>
        <Text variant="display">How should we track it?</Text>
        <Text muted>{MOTION_LABELS[motion]}: choose what does the measuring.</Text>
      </View>

      <View accessibilityRole="radiogroup" accessibilityLabel="Tracking method" style={{ flexDirection: wide ? 'row' : 'column', gap: GAP }}>
        {METHODS.map((m) => (
          <ChoiceCard
            key={m}
            title={METHOD_LABELS[m]}
            description={DESCRIPTIONS[m]}
            icon={METHOD_ICONS[m]}
            selected={method === m}
            onPress={() => setMethod(m)}
            style={wide ? { flex: 1 } : undefined}
          />
        ))}
      </View>

      <PillButton
        label="Continue"
        icon="chevron-forward"
        iconRight
        size="lg"
        disabled={!method}
        onPress={next}
        fullWidth={!wide}
        style={wide ? { alignSelf: 'flex-end' } : undefined}
      />
    </ScreenContainer>
  );
}
