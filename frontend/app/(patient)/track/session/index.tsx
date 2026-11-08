import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Card, PillButton, ScreenContainer, Text } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { framingInstruction, type FramingStatus } from '@/features/capture/cv/framing';
import type { FormCue, RecordedSession } from '@/features/capture/cv/metrics';
import { movementInstruction, type MovementState } from '@/features/capture/cv/motionAssessment';
import { PoseCamera } from '@/features/capture/cv/PoseCamera';
import { savePoseLog } from '@/features/capture/cv/poseLog';
import type { CameraGate } from '@/features/capture/cv/poseTypes';
import { usePoseSession } from '@/features/capture/cv/usePoseSession';
import { ChoiceCard } from '@/features/capture/ChoiceCard';
import { FlowHeader } from '@/features/capture/FlowHeader';
import { SITE_LABELS, SITES, type Site } from '@/features/capture/imu/protocol';
import { SensorTrace } from '@/features/capture/imu/SensorTrace';
import { useImuSession, type ImuGate } from '@/features/capture/imu/useImuSession';
import { MissingParams } from '@/features/capture/MissingParams';
import { parseMethod, parseMotion } from '@/features/capture/params';
import { RecordingBadge } from '@/features/capture/RecordingBadge';
import { saveSession } from '@/features/results/api';
import { METHOD_LABELS, MOTION_LABELS } from '@/lib/data';
import { formatDuration } from '@/lib/format';
import { colors, GAP, space, WIDE } from '@/lib/theme';
import { useReduceMotion } from '@/lib/useReduceMotion';
import type { IconName, MotionType, Session } from '@/types';

const SITE_COPY: Record<Site, { description: string; icon: IconName }> = {
  thigh: { description: 'Outer right thigh, screen facing your leg', icon: 'body' },
  shank: { description: 'Right shin, just below the knee', icon: 'walk' },
};

// Step 4: the live session. Camera records pose on the device. Sensors stream both phones to the live model.
export default function SessionScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const reduce = useReduceMotion();
  const params = useLocalSearchParams();
  const motion = parseMotion(params.motion);
  const method = parseMethod(params.method);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const pose = usePoseSession(motion, paused);
  const imu = useImuSession(method === 'imu' ? motion : null, paused, setPaused);
  const [gate, setGate] = useState<CameraGate>('starting');
  const { patient } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Kept after a failed save so "Try again" re-sends the same numbers instead of re-scoring.
  const finishedPose = useRef<RecordedSession | null>(null);
  const finishedImu = useRef<Session | null>(null);

  const captureStarted = method === 'imu' ? imu.captureStarted : pose.captureStarted;
  const captureFinished = method === 'imu' ? finishedImu.current != null : finishedPose.current != null;
  const clockOn =
    !saving && !captureFinished && (method === 'imu' ? imu.recording : gate === 'ready' && captureStarted);
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

  const stop = async () => {
    if (method === 'imu' && imu.stoppedElsewhere) {
      router.replace('/results');
      return;
    }
    if (method === 'cv') finishedPose.current ??= pose.finish(seconds);
    else finishedImu.current ??= imu.finish(seconds);

    const session = method === 'cv' ? finishedPose.current?.session : finishedImu.current;
    if (session && patient) {
      setSaving(true);
      setSaveError(null);
      try {
        const saved = await saveSession(session, patient.id);
        if (method === 'cv' && finishedPose.current) savePoseLog(saved.id, finishedPose.current.samples);
        router.replace({ pathname: '/results', params: { sessionId: saved.id } });
      } catch {
        setSaveError("This session didn't save. Check your connection and try again.");
        setSaving(false);
      }
      return;
    }
    router.replace('/results');
  };

  const prompt =
    method === 'cv'
      ? cameraPrompt(motion, paused, gate, pose.framing, pose.movementState, pose.detectedMotion, pose.cue)
      : sensorPrompt(motion, paused, imu);
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
      <SensorTrace samples={paused || reduce ? [] : imu.samples} caption={prompt} />
    );

  const siteChooser =
    method === 'imu' && imu.gate === 'choose-site' ? (
      <View accessibilityRole="radiogroup" accessibilityLabel="Where is this phone" style={{ gap: space.md }}>
        {SITES.map((site) => (
          <ChoiceCard
            key={site}
            title={SITE_LABELS[site]}
            description={imu.freeSites.includes(site) ? SITE_COPY[site].description : 'The other phone already took this spot'}
            icon={SITE_COPY[site].icon}
            selected={false}
            onPress={() => {
              if (imu.freeSites.includes(site)) void imu.claim(site);
            }}
          />
        ))}
      </View>
    ) : null;

  const imuReadout = imu.captureStarted
    ? imu.lowMotion
      ? 'Not moving'
      : (imu.detectedLabel ?? '—')
    : imu.mySite
      ? `${SITE_LABELS[imu.mySite]}${imu.hz > 0 ? ` · ${imu.hz.toFixed(0)} Hz` : ''}`
      : null;

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
        {method === 'imu' && imuReadout ? (
          <Text variant="title" align="center">
            {imuReadout}
          </Text>
        ) : null}
        <Text
          variant="callout"
          muted={method !== 'cv' || !pose.cue}
          align="center"
          color={method === 'cv' && pose.cue?.tone === 'good' ? colors.seagrass : undefined}
          accessibilityLiveRegion="polite"
        >
          {prompt}
        </Text>
      </View>
      <View style={{ gap: space.md }}>
        {method === 'imu' && imu.gate === 'need-permission' ? (
          <PillButton
            label="Allow motion sensors"
            icon="phone-portrait"
            size="lg"
            fullWidth
            onPress={() => void imu.requestSensors()}
          />
        ) : null}
        {method === 'imu' && imu.stoppedElsewhere ? null : method === 'imu' &&
          imu.gate === 'ready' &&
          !imu.recording &&
          !captureFinished ? (
          <PillButton label="Start" icon="play" size="lg" fullWidth onPress={imu.start} />
        ) : (
          <PillButton
            label={paused ? 'Resume' : 'Pause'}
            icon={paused ? 'play' : 'pause'}
            variant="secondary"
            size="lg"
            fullWidth
            disabled={!captureStarted || saving || saveError !== null || (method === 'imu' && imu.settling)}
            onPress={() => setPaused((p) => !p)}
          />
        )}
        <PillButton
          label={
            method === 'imu' && imu.stoppedElsewhere
              ? 'See results'
              : saving
                ? 'Saving…'
                : saveError
                  ? 'Try saving again'
                  : 'Stop'
          }
          icon={method === 'imu' && imu.stoppedElsewhere ? 'chevron-forward' : saveError ? 'refresh' : 'stop'}
          size="lg"
          fullWidth
          disabled={saving}
          onPress={stop}
        />
        {saveError ? (
          <Text variant="callout" muted align="center" accessibilityRole="alert">
            {saveError}
          </Text>
        ) : null}
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

      {siteChooser}

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: GAP }}>
        <View style={{ flex: wide ? 2 : undefined, height: wide ? 440 : 320 }}>{live}</View>
        {controls}
      </View>
    </ScreenContainer>
  );
}

/** What the sensor session wants the person to do, or why it cannot measure yet. */
function sensorPrompt(
  motion: MotionType,
  paused: boolean,
  imu: { gate: ImuGate; lowMotion: boolean; recording: boolean; modelConnected: boolean; stoppedElsewhere: boolean },
): string {
  if (imu.stoppedElsewhere) return 'Stopped on the other phone, which saves this session.';
  if (paused) return 'Paused on both phones. Resume on either one.';
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
      return 'Where is this phone? Pick the right thigh or the right shin.';
    case 'need-permission':
      return 'Safari will ask to use Motion & Orientation. Keep this page open.';
    case 'unavailable-sensors':
      return 'Open this page in Safari on the iPhone. Desktop browsers cannot stream these sensors.';
    case 'waiting-for-phones':
      return 'This phone is ready. Sign in on the second phone and pick the other spot.';
    case 'ready':
      if (!imu.recording) {
        return imu.modelConnected
          ? 'Both phones are in. Tap Start on either phone and both start together.'
          : 'Both phones are in, but the model service is not reachable. Joint angles will wait for it.';
      }
      if (imu.lowMotion) return 'Not enough movement to measure. Keep going at your usual pace.';
      return 'Keep moving at your usual pace. Your clinician sees the joint angles live.';
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
  cue: FormCue | null,
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
      if (cue) return cue.text;
      return movementInstruction(movementState, motion, detectedMotion);
    default: {
      const unexpected: never = gate;
      return unexpected;
    }
  }
}
