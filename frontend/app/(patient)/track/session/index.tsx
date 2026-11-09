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
import { PairingCode } from '@/features/capture/imu/PairingCode';
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
import type { IconName, MotionType, Session } from '@/types';

const SITE_COPY: Record<Site, { description: string; icon: IconName }> = {
  thigh: { description: 'Outer right thigh, screen facing your leg', icon: 'body' },
  shank: { description: 'Right shin, just below the knee', icon: 'walk' },
};

// Step 4: the live session. Camera records pose on the device. Sensors: this phone runs the session and
// shows a QR code; the second phone scans it, needs no account, and streams alongside to the live model.
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
  const { patient } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Kept after a failed save so "Try again" re-sends the same numbers instead of re-scoring.
  const finishedPose = useRef<RecordedSession | null>(null);
  const finishedImu = useRef<Session | null>(null);

  const captureStarted = method === 'imu' ? imu.captureStarted : pose.captureStarted;
  const captureFinished = method === 'imu' ? finishedImu.current != null : finishedPose.current != null;
  // Picking a spot or allowing sensors must not look like recording: Start is the only control until it is tapped.
  const imuWaiting = method === 'imu' && !imu.recording && !captureFinished;
  const showPairingCode = imuWaiting && imu.gate === 'scan-qr';
  const clockOn =
    !saving && !captureFinished && (method === 'imu' ? imu.recording : gate === 'ready' && captureStarted);
  const blocked =
    method === 'cv'
      ? gate === 'denied' || gate === 'unavailable' || gate === 'model-error'
      : imu.gate === 'unreachable' || imu.gate === 'unsupported-motion' || imu.gate === 'unavailable-sensors';
  const recordingStatus = blocked ? 'camera-blocked' : !captureStarted ? 'setting-up' : paused ? 'paused' : 'recording';

  useEffect(() => {
    if (paused || !clockOn) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused, clockOn]);

  if (!motion || !method) return <MissingParams />;

  const stop = async () => {
    if (method === 'cv') finishedPose.current ??= pose.finish(seconds);
    else finishedImu.current ??= imu.finish(seconds);

    const session = method === 'cv' ? finishedPose.current?.session : finishedImu.current;
    if (!session && method === 'imu') {
      // Nothing came back from the model. Say so and stay here, rather than leaving as if it saved.
      setSaveError(
        imu.modelConnected
          ? 'The model scored no movement, so nothing was saved. Check both phones are strapped on, then tap Start and walk.'
          : "The model service wasn't reachable, so nothing was measured or saved. Check it's running, then record again.",
      );
      return;
    }
    if (session && !patient) {
      setSaveError("Your account hasn't loaded yet, so this session can't be saved. Wait a moment and try again.");
      return;
    }
    if (session && patient) {
      setSaving(true);
      setSaveError(null);
      try {
        const saved = await saveSession(session, patient.id);
        if (method === 'cv' && finishedPose.current) savePoseLog(saved.id, finishedPose.current.samples);
        router.replace(`/results/${saved.id}`);
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
      ? cameraPrompt(motion, paused, gate, pose.framing, pose.movementState, pose.cue)
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
    ) : showPairingCode ? (
      <PairingCode code={imu.pairCode} expiresAt={imu.pairExpiresAt} onRenew={imu.renewPairing} />
    ) : (
      <SensorTrace traces={imu.traces} caption={prompt} />
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
    ? null
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
        {method === 'imu' && imu.gate === 'unreachable' ? (
          <PillButton label="Try again" icon="refresh" size="lg" fullWidth onPress={imu.renewPairing} />
        ) : null}
        {imuWaiting && imu.gate === 'scan-qr' ? (
          // Step 1 -> 2: unlocked once the second phone has scanned the code.
          <PillButton
            label="Next"
            icon="chevron-forward"
            iconRight
            size="lg"
            fullWidth
            disabled={!imu.secondPhoneConnected}
            onPress={imu.confirmSecondPhone}
          />
        ) : imuWaiting && (imu.gate === 'need-permission' || imu.gate === 'unreachable') ? null : imuWaiting ? (
          <PillButton
            label="Start"
            icon="play"
            size="lg"
            fullWidth
            disabled={imu.gate !== 'ready'}
            onPress={() => {
              setSaveError(null);
              setSeconds(0);
              imu.start();
            }}
          />
        ) : (
          <PillButton
            label={paused ? 'Resume' : 'Pause'}
            icon={paused ? 'play' : 'pause'}
            variant="secondary"
            size="lg"
            fullWidth
            disabled={!captureStarted || saving || saveError !== null}
            onPress={() => setPaused((p) => !p)}
          />
        )}
        {imuWaiting ? null : (
          <PillButton
            label={saving ? 'Saving…' : saveError ? 'Try saving again' : 'Stop'}
            icon={saveError ? 'refresh' : 'stop'}
            size="lg"
            fullWidth
            disabled={saving}
            onPress={stop}
          />
        )}
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
          <Text muted>Tracking with {METHOD_LABELS[method].toLowerCase()}</Text>
        </View>
        <RecordingBadge status={recordingStatus} />
      </View>

      {siteChooser}

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: GAP }}>
        {/* Taller once both phones have a spot, so thigh and shin traces fit before Start. */}
        <View style={wide ? { flex: 2, height: 440 } : showPairingCode ? { minHeight: 320 } : { height: method === 'imu' && imu.mySite != null ? 520 : 320 }}>
          {live}
        </View>
        {controls}
      </View>
    </ScreenContainer>
  );
}

/** What the sensor session wants the person to do, or why it cannot measure yet. */
function sensorPrompt(
  motion: MotionType,
  paused: boolean,
  imu: { gate: ImuGate; recording: boolean; modelConnected: boolean; secondPhoneConnected: boolean },
): string {
  if (paused) return 'Paused on both phones. Tap Resume to carry on.';
  switch (imu.gate) {
    case 'unsupported-motion':
      return `${MOTION_LABELS[motion]} cannot be measured by the phone sensors yet. Use the camera instead.`;
    case 'connecting':
      return 'Getting the session ready…';
    case 'unreachable':
      return 'Could not set up the session. Check the network and try again.';
    case 'scan-qr':
      return imu.secondPhoneConnected
        ? 'Second phone connected. Tap Next.'
        : 'Scan this code with your second phone, then tap Next.';
    case 'choose-site':
      return 'Where is this phone? Pick the right thigh or the right shin.';
    case 'need-permission':
      return 'Safari will ask to use Motion & Orientation. Keep this page open.';
    case 'unavailable-sensors':
      return 'Open this page in Safari on the iPhone. Desktop browsers cannot stream these sensors.';
    case 'waiting-for-second-phone':
      return imu.recording
        ? 'The second phone dropped out. Keep its page open and it rejoins on its own.'
        : 'Waiting for the second phone to take its spot on the leg. Keep its page open.';
    case 'ready':
      if (!imu.recording) {
        return imu.modelConnected
          ? 'Both phones are in. The graphs are your thigh and shin. Strap them on, then tap Start here.'
          : 'Both phones are in, but the model service is not reachable, so a recording would not be measured.';
      }
      return 'Keep moving at your usual pace. Your joint angles are saved for your clinician when you stop.';
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
      return movementInstruction(movementState, motion);
    default: {
      const unexpected: never = gate;
      return unexpected;
    }
  }
}
