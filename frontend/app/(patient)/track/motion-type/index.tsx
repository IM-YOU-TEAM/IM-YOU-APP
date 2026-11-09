import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { PillButton, ScreenContainer, Text } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { ChoiceCard } from '@/features/capture/ChoiceCard';
import { FlowHeader } from '@/features/capture/FlowHeader';
import { parseMotion } from '@/features/capture/params';
import { EmptyState } from '@/features/results/EmptyState';
import { ALL_MOTIONS, MOTION_ICONS, MOTION_LABELS } from '@/lib/data';
import { GAP, space, WIDE } from '@/lib/theme';
import type { MotionType } from '@/types';

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
  const { patient } = useAuth();
  const assigned = patient ? patient.tasks.map((task) => task.motion) : ALL_MOTIONS;
  const picked = parseMotion(params.motion);
  const [motion, setMotion] = useState<MotionType | null>(picked && assigned.includes(picked) ? picked : null);

  const next = () => {
    if (motion) router.push({ pathname: '/track/method', params: { motion } });
  };

  const rows = wide && assigned.length > 1 ? [assigned.slice(0, 2), assigned.slice(2)].filter((row) => row.length > 0) : assigned.map((m) => [m]);

  return (
    <ScreenContainer maxWidth={880} gap={space.xl}>
      <FlowHeader step={1} />
      <View style={{ gap: space.sm }}>
        <Text variant="display">What are you tracking?</Text>
        <Text muted>Pick one movement for this session.</Text>
      </View>

      {assigned.length === 0 ? (
        <EmptyState
          icon="body"
          title="Nothing assigned"
          line="Your doctor has not assigned a movement yet. Check back after they pick one."
          action={false}
        />
      ) : (
        <>
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
        </>
      )}
    </ScreenContainer>
  );
}
