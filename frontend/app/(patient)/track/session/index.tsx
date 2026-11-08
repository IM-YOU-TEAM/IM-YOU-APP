import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Card, PillButton, ScreenContainer, Text } from '@/components';
import { LiveSkeleton } from '@/features/capture/cv/LiveSkeleton';
import { FlowHeader } from '@/features/capture/FlowHeader';
import { LiveWaveform } from '@/features/capture/imu/LiveWaveform';
import { MissingParams } from '@/features/capture/MissingParams';
import { parseMethod, parseMotion } from '@/features/capture/params';
import { RecordingBadge } from '@/features/capture/RecordingBadge';
import { PROTOCOLS } from '@/features/capture/protocols';
import { METHOD_LABELS, MOTION_LABELS } from '@/lib/data';
import { formatDuration } from '@/lib/format';
import { GAP, space, WIDE } from '@/lib/theme';
import { useReduceMotion } from '@/lib/useReduceMotion';

// Step 4: the live session. A mock view only: no camera or sensors are read and nothing is stored.
export default function SessionScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const reduce = useReduceMotion();
  const params = useLocalSearchParams();
  const motion = parseMotion(params.motion);
  const method = parseMethod(params.method);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused]);

  if (!motion || !method) return <MissingParams />;

  const animate = !paused && !reduce;
  const live = method === 'cv' ? <LiveSkeleton motion={motion} running={animate} /> : <LiveWaveform motion={motion} running={animate} />;

  const controls = (
    <Card style={{ gap: space.xl, flex: wide ? 1 : undefined, justifyContent: 'center' }}>
      <View
        accessible
        accessibilityLabel={`Elapsed time ${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds`}
        style={{ alignItems: 'center', gap: space.xs }}
      >
        <Text variant="display" align="center" style={{ fontSize: 64, lineHeight: 72, letterSpacing: -1.5, fontVariant: ['tabular-nums'] }}>
          {formatDuration(seconds)}
        </Text>
        <Text variant="callout" muted align="center">
          {paused ? 'Paused. Resume when you are ready.' : PROTOCOLS[motion].cue}
        </Text>
      </View>
      {/* Stacked so the labels never truncate in the narrow side card or on small phones. */}
      <View style={{ gap: space.md }}>
        <PillButton
          label={paused ? 'Resume' : 'Pause'}
          icon={paused ? 'play' : 'pause'}
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => setPaused((p) => !p)}
        />
        <PillButton label="Stop" icon="stop" size="lg" fullWidth onPress={() => router.replace('/results')} />
      </View>
    </Card>
  );

  return (
    <ScreenContainer maxWidth={1000} gap={space.xl}>
      <FlowHeader step={4} backTo={{ pathname: '/track/placement-guide', params: { motion, method } }} />
      <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'flex-end' : 'flex-start', justifyContent: 'space-between', gap: space.md }}>
        <View style={{ gap: space.sm }}>
          <Text variant="display">{MOTION_LABELS[motion]}</Text>
          <Text muted>Tracking with your {METHOD_LABELS[method].toLowerCase()}</Text>
        </View>
        <RecordingBadge paused={paused} />
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: GAP }}>
        <View style={{ flex: wide ? 2 : undefined, height: wide ? 440 : 320 }}>{live}</View>
        {controls}
      </View>
    </ScreenContainer>
  );
}
