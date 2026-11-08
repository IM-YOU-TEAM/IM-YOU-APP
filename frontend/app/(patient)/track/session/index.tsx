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
import { ChoiceCard } from '@/features/capture/ChoiceCard';
import { FlowHeader } from '@/features/capture/FlowHeader';
import { SensorTrace } from '@/features/capture/imu/SensorTrace';
import { SITE_LABELS, SITES, type Site } from '@/features/capture/imu/protocol';
import { useImuSession, type ImuGate } from '@/features/capture/imu/useImuSession';
import { MissingParams } from '@/features/capture/MissingParams';
import { parseMethod, parseMotion } from '@/features/capture/params';
import { RecordingBadge } from '@/features/capture/RecordingBadge';
import { METHOD_LABELS, MOTION_LABELS, recordSession } from '@/lib/data';
import { formatDuration } from '@/lib/format';
import { GAP, space, WIDE } from '@/lib/theme';
import type { MotionType } from '@/types';

const SITE_COPY: Record<Site, { description: string; icon: 'body' | 'walk' }> = {
  thigh: { description: 'Outer right thigh, screen facing your leg', icon: 'body' },
  shank: { description: 'Right shin, below the knee', icon: 'walk' },
};

// Step 4: the live session. Camera records pose on the device. Sensors stream IMU to the model.
export default function SessionScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const params = useLocalSearchParams();
  const motion = parseMotion(params.motion);
  const method = parseMethod(params.method);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const pose = usePoseSession(motion, paused);
  const imu = useImuSession(method === 'imu' ? motion : null, paused);
  const [gate, setGate] = useState<CameraGate>('starting');

  const captureStarted = method === 'imu' ? imu.recording : pose.captureStarted;
  const clockOn = method === 'imu' ? imu.recording && !paused : gate === 'ready' && captureStarted;
  const blocked =
    method === 'cv'
      ? gate === 'denied' || gate === 'unavailable' || gate === 'model-error'
      : imu.gate === 'unreachable' ||
        imu.gate === 'unsupported-motion' ||
        imu.gate === 'not-a-patient' ||
        imu.gate === 'unavailable-sensors';
  const recordingStatus = blocked ? 'camera-blocked' : !captureStarted ? 'setting-up' : paused ? 'paused' : 'recording';

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
    } else {
      const session = imu.finish(seconds);
      if (session) {
        recordSession(session);
        router.replace({ pathname: '/results', params: { sessionId: session.id } });
        return;
      }
    }
    router.replace('/results');
  };

  const prompt = method === 'cv' ? cameraPrompt(motion, paused, gate, pose.framing, pose.movementState, pose.detectedMotion) : sensorPrompt(motion, paused, imu);
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
      <SensorTrace samples={paused ? [] : imu.samples} caption={prompt} />
    );

  const imuSetup =
    method === 'imu' && imu.gate === 'choose-site' ? (
      <View accessibilityRole="radiogroup" accessibilityLabel="Where is this phone" style={{ gap: space.md }}>
        {SITES.map((site) => (
          <ChoiceCard
            key={site}
            title={SITE_LABELS[site]}
            description={SITE_COPY[site].description}
            icon={SITE_COPY[site].icon}
            selected={false}
            onPress={() => {
              if (imu.freeSites.includes(site)) void imu.claim(site);
            }}
          />
        ))}
      </View>
    ) : null;

  const controls = (
    <Card style={{ gap: space.xl, flex: wide ? 1 : undefined, justifyContent: 'center' }}>
      <View
        accessible
        accessibilityLabel={`Elapsed time ${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds`}
        style={{ alignItems: 'center', gap: space.xs }}
      >
        <Text
          variant="display"
          align="center"
          style={{ fontSize: 64, lineHeight: 72, letterSpacing: -1.5, fontVariant: ['tabular-nums'] }}
        >
          {formatDuration(seconds)}
        </Text>
        {method === 'cv' && gate === 'ready' ? (
          <Text variant="title" align="center" style={{ fontVariant: ['tabular-nums'] }}>
            {pose.count} {pose.unit}
          </Text>
        ) : null}
        {method === 'imu' && imu.mySite ? (
          <Text variant="title" align="center">
            {SITE_LABELS[imu.mySite]}
            {imu.hz > 0 ? ` · ${imu.hz.toFixed(0)} Hz` : ''}
          </Text>
        ) : null}
        <Text variant="callout" muted align="center">
          {prompt}
        </Text>
      </View>
      <View style={{ gap: space.md }}>
        {method === 'imu' && imu.gate === 'need-permission' ? (
          <PillButton label="Allow motion sensors" icon="phone-portrait" size="lg" fullWidth onPress={() => void imu.requestSensors()} />
        ) : null}
        {method === 'imu' && imu.gate === 'ready' && !imu.recording ? (
          <PillButton label="Start" icon="play" size="lg" fullWidth onPress={imu.start} />
        ) : (
          <PillButton
            label={paused ? 'Resume' : 'Pause'}
            icon={paused ? 'play' : 'pause'}
            variant="secondary"
            size="lg"
            fullWidth
            disabled={!captureStarted}
            onPress={() => setPaused((p) => !p)}
          />
        )}
        <PillButton label="Stop" icon="stop" size="lg" fullWidth onPress={stop} />
      </View>
    </Card>
  );

  return (
    <ScreenContainer maxWidth={1000} gap={space.xl}>
      <FlowHeader step={4} backTo={{ pathname: '/track/placement-guide', params: { motion, method } }} />
      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          alignItems: wide ? 'flex-end' : 'flex-start',
          justifyContent: 'space-between',
          gap: space.md,
        }}
      >
        <View style={{ gap: space.sm }}>
          <Text variant="display">{MOTION_LABELS[motion]}</Text>
          <Text muted>Tracking with your {METHOD_LABELS[method].toLowerCase()}</Text>
        </View>
        <RecordingBadge status={recordingStatus} />
      </View>

      {imuSetup}

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: GAP }}>
        <View style={{ flex: wide ? 2 : undefined, height: wide ? 440 : 320 }}>{live}</View>
        {controls}
      </View>
    </ScreenContainer>
  );
}

function sensorPrompt(
  motion: MotionType,
  paused: boolean,
  imu: {
    gate: ImuGate;
    lowMotion: boolean;
    recording: boolean;
    modelConnected: boolean;
    hz: number;
  },
): string {
  if (paused) return 'Paused. Resume when you are ready.';
  switch (imu.gate) {
    case 'unsupported-motion':
      return `${MOTION_LABELS[motion]} cannot be measured by the phone sensors yet. Use the camera instead.`;
    case 'not-a-patient':
      return 'This account is not a patient profile, so the two phones have nowhere to meet.';
    case 'connecting':
      return 'Finding the other phone on this account…';
    case 'unreachable':
      return 'Could not join the live channel. Check the network and try again.';
    case 'choose-site':
      return 'This phone first. Is it on the right thigh or the right shin?';
    case 'need-permission':
      return 'Safari will ask to use Motion & Orientation. Keep this page open.';
    case 'unavailable-sensors':
      return 'Open this page in Safari on the iPhone. Desktop browsers and the native install cannot stream these sensors.';
    case 'waiting-for-phones':
      return 'This phone is ready. Sign in on the second phone and pick the other spot.';
    case 'ready':
      if (!imu.recording) {
        return imu.modelConnected
          ? 'Both phones are in. Start when you are ready to walk.'
          : 'Both phones are in. Joint angles need the model service; sensors will still stream.';
      }
      if (imu.lowMotion) return 'Not enough movement to measure. Keep going at your usual pace.';
      return 'Keep moving at your usual pace. Your clinician sees the joint curves.';
    default: {
      const unexpected: never = imu.gate;
      return unexpected;
    }
  }
}

function cameraPrompt(
  motion: MotionType,
  paused: boolean,
  gate: CameraGate,
  framing: FramingStatus,
  movementState: MovementState,
  detectedMotion: MotionType | undefined,
): string {
  if (paused) return 'Paused. Resume when you are ready.';
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
