import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { PillButton, ScreenContainer, Text } from '@/components';
import { ChoiceCard } from '@/features/capture/ChoiceCard';
import { FlowHeader } from '@/features/capture/FlowHeader';
import { parseMotion } from '@/features/capture/params';
import { MOTION_ICONS, MOTION_LABELS } from '@/lib/data';
import { GAP, space, WIDE } from '@/lib/theme';
import type { MotionType } from '@/types';

const MOTIONS: MotionType[] = ['walking', 'running', 'stairs', 'sitToStand'];

const DESCRIPTIONS: Record<MotionType, string> = {
  walking: 'Your everyday pace on flat ground',
  running: 'A steady jog or run',
  stairs: 'Up and down a flight of steps',
  sitToStand: 'Rising from a chair and sitting back down',
};

// Step 1: pick the movement to track.
export default function MotionTypeScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const params = useLocalSearchParams();
  const [motion, setMotion] = useState<MotionType | null>(parseMotion(params.motion));

  const next = () => {
    if (motion) router.push({ pathname: '/track/method', params: { motion } });
  };

  // 2 x 2 on wide screens, stacked on phones.
  const rows = wide ? [MOTIONS.slice(0, 2), MOTIONS.slice(2)] : MOTIONS.map((m) => [m]);

  return (
    <ScreenContainer maxWidth={880} gap={space.xl}>
      <FlowHeader step={1} />
      <View style={{ gap: space.sm }}>
        <Text variant="display">What are you tracking?</Text>
        <Text muted>Pick one movement for this session.</Text>
      </View>

      <View accessibilityRole="radiogroup" accessibilityLabel="Movement" style={{ gap: GAP }}>
        {rows.map((row) => (
          <View key={row.join()} style={{ flexDirection: 'row', gap: GAP }}>
            {row.map((m) => (
              <ChoiceCard
                key={m}
                title={MOTION_LABELS[m]}
                description={DESCRIPTIONS[m]}
                icon={MOTION_ICONS[m]}
                selected={motion === m}
                onPress={() => setMotion(m)}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        ))}
      </View>

      <PillButton
        label="Continue"
        icon="chevron-forward"
        iconRight
        size="lg"
        disabled={!motion}
        onPress={next}
        fullWidth={!wide}
        style={wide ? { alignSelf: 'flex-end' } : undefined}
      />
    </ScreenContainer>
  );
}
