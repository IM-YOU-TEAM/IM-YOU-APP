import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Card, PillButton, ScreenContainer, Text } from '@/components';
import { ChoiceCard } from '@/features/capture/ChoiceCard';
import { DemoClip } from '@/features/capture/DemoClip';
import { FlowHeader } from '@/features/capture/FlowHeader';
import { parseMotion } from '@/features/capture/params';
import { PROTOCOL_ORDER, PROTOCOLS } from '@/features/capture/protocols';
import { MOTION_ICONS, MOTION_LABELS } from '@/lib/data';
import { GAP, space, WIDE } from '@/lib/theme';
import type { MotionType } from '@/types';

// Step 1: the one movement we can show with a real clip.
export default function MotionTypeScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const params = useLocalSearchParams();
  const [motion, setMotion] = useState<MotionType | null>(parseMotion(params.motion) ?? 'chairStand');
  const clip = PROTOCOLS.chairStand.video;

  const next = () => {
    if (motion) router.push({ pathname: '/track/method', params: { motion } });
  };

  return (
    <ScreenContainer maxWidth={880} gap={space.xl}>
      <FlowHeader step={1} />
      <View style={{ gap: space.sm }}>
        <Text variant="display">What are you tracking?</Text>
        <Text muted>The CDC filmed this test. Press play to watch it, then continue.</Text>
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: GAP, alignItems: 'stretch' }}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Movement" style={{ flex: 1, gap: GAP }}>
          {PROTOCOL_ORDER.map((m) => (
            <ChoiceCard
              key={m}
              title={MOTION_LABELS[m]}
              description={PROTOCOLS[m].summary}
              source={PROTOCOLS[m].source}
              icon={MOTION_ICONS[m]}
              selected={motion === m}
              onPress={() => setMotion(m)}
            />
          ))}
        </View>
        <Card padding={space.sm} style={{ flex: 1.4, gap: space.sm, justifyContent: 'center' }}>
          <DemoClip webm={clip.webm} mov={clip.mov} label="CDC demonstration of the 30-second chair stand" />
          <Text variant="caption" muted>
            CDC STEADI demonstration
          </Text>
        </Card>
      </View>

      <PillButton
        label="Continue"
        icon="arrow-forward"
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
