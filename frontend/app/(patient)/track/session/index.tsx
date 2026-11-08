import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Card, PillButton, ScreenContainer, Text } from '@/components';
import { framingInstruction, type FramingStatus } from '@/features/capture/cv/framing';
import { movementInstruction, type MovementState } from '@/features/capture/cv/motionAssessment';
import { PoseCamera } from '@/features/capture/cv/PoseCamera';
import { savePoseLog } from '@/features/capture/cv/poseLog';
import type { CameraGate } from '@/features/capture/cv/poseTypes';
import { usePoseSession } from '@/features/capture/cv/usePoseSession';
import { FlowHeader } from '@/features/capture/FlowHeader';
import { LiveWaveform } from '@/features/capture/imu/LiveWaveform';
import { MissingParams } from '@/features/capture/MissingParams';
import { parseMethod, parseMotion } from '@/features/capture/params';
import { RecordingBadge } from '@/features/capture/RecordingBadge';
import { METHOD_LABELS, MOTION_LABELS, recordSession } from '@/lib/data';
import { formatDuration } from '@/lib/format';
import { GAP, space, WIDE } from '@/lib/theme';
import { useReduceMotion } from '@/lib/useReduceMotion';

// Step 4: the live session. Camera sessions record pose on the device. Sensor sessions are still a preview.
export default function SessionScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const reduce = useReduceMotion();
  const params = useLocalSearchParams();
  const motion = parseMotion(params.motion);
  const method = parseMethod(params.method);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const pose = usePoseSession(motion, paused);
  const [gate, setGate] = useState<CameraGate>('starting');

  const captureStarted = method === 'imu' || (method === 'cv' && pose.captureStarted);
  const clockOn = method === 'imu' || (method === 'cv' && gate === 'ready' && captureStarted);
  const cameraBlocked = method === 'cv' && (gate === 'denied' || gate === 'unavailable' || gate === 'model-error');
  const recordingStatus = cameraBlocked ? 'camera-blocked' : !captureStarted ? 'setting-up' : paused ? 'paused' : 'recording';

  useEffect(() => {
    if (paused || !clockOn) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused, clockOn]);

  if (!motion || !method) return <MissingParams />;

  const stop = () => {
    if (method === 'cv') {
      const done = pose.finish(seconds);
      if (done) {
        recordSession(done.session);
        savePoseLog(done.session.id, done.samples);
        router.replace({ pathname: '/results', params: { sessionId: done.session.id } });
        return;
      }
    }
    router.replace('/results');
  };

  const prompt = sessionPrompt(method, motion, paused, gate, pose.framing, pose.movementState, pose.detectedMotion);
  const live =
    method === 'cv' ? (
      <PoseCamera
        paused={paused}
        caption={paused ? undefined : prompt}
        countLabel={`${pose.count} ${pose.unit}`}
        onFrame={pose.onFrame}
        onGate={setGate}
      />
    ) : (
      <LiveWaveform motion={motion} running={!paused && !reduce} />
    );

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
        {method === 'cv' && gate === 'ready' ? (
          <Text variant="title" align="center" style={{ fontVariant: ['tabular-nums'] }}>
            {pose.count} {pose.unit}
          </Text>
        ) : null}
        <Text variant="callout" muted align="center">
          {prompt}
        </Text>
      </View>
      <View style={{ gap: space.md }}>
        <PillButton
          label={paused ? 'Resume' : 'Pause'}
          icon={paused ? 'play' : 'pause'}
          variant="secondary"
          size="lg"
          fullWidth
          disabled={!captureStarted}
          onPress={() => setPaused((p) => !p)}
        />
        <PillButton label="Stop" icon="stop" size="lg" fullWidth onPress={stop} />
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
        <RecordingBadge status={recordingStatus} />
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: GAP }}>
        <View style={{ flex: wide ? 2 : undefined, height: wide ? 440 : 320 }}>{live}</View>
        {controls}
      </View>
    </ScreenContainer>
  );
}

function sessionPrompt(
  method: 'cv' | 'imu',
  motion: 'walking' | 'running' | 'stairs' | 'sitToStand',
  paused: boolean,
  gate: CameraGate,
  framing: FramingStatus,
  movementState: MovementState,
  detectedMotion: 'walking' | 'running' | 'stairs' | 'sitToStand' | undefined,
): string {
  if (paused) return 'Paused. Resume when you are ready.';
  if (method === 'imu') return `Keep ${motion === 'sitToStand' ? 'going' : 'moving'} at your usual pace`;
  switch (gate) {
    case 'denied':
      return 'Allow the camera to measure this session.';
    case 'model-error':
      return 'The pose model did not load. Nothing was scored.';
    case 'unavailable':
      return 'No camera is available, so nothing was scored.';
    case 'starting':
      return 'Opening the camera…';
    case 'ready':
      if (framing !== 'ready') return framingInstruction(framing);
      return movementInstruction(movementState, motion, detectedMotion);
    default: {
      const unexpected: never = gate;
      return unexpected;
    }
  }
}
