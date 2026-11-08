import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Card, PillButton, ScreenContainer, Text } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import type { FormCue, RecordedSession } from '@/features/capture/cv/metrics';
import { PoseCamera } from '@/features/capture/cv/PoseCamera';
import { savePoseLog } from '@/features/capture/cv/poseLog';
import type { CameraGate } from '@/features/capture/cv/poseTypes';
import { usePoseSession } from '@/features/capture/cv/usePoseSession';
import { FlowHeader } from '@/features/capture/FlowHeader';
import { LiveWaveform } from '@/features/capture/imu/LiveWaveform';
import { MissingParams } from '@/features/capture/MissingParams';
import { parseMethod, parseMotion } from '@/features/capture/params';
import { RecordingBadge } from '@/features/capture/RecordingBadge';
import { saveSession } from '@/features/results/api';
import { METHOD_LABELS, MOTION_LABELS } from '@/lib/data';
import { formatDuration } from '@/lib/format';
import { colors, GAP, space, WIDE } from '@/lib/theme';
import { useReduceMotion } from '@/lib/useReduceMotion';

// Step 4: the live session. Camera sessions record pose on the device. Sensor sessions are still a preview.
export default function SessionScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const reduce = useReduceMotion();
  const params = useLocalSearchParams();
  const motion = parseMotion(params.motion);
  const method = parseMethod(params.method);
  const pose = usePoseSession(motion);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [gate, setGate] = useState<CameraGate>('starting');
  const { patient } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Kept after a failed save so "Try again" re-sends the same numbers instead of re-scoring.
  const finished = useRef<RecordedSession | null>(null);

  const clockOn = !saving && !finished.current && (method === 'imu' || (method === 'cv' && gate === 'ready'));

  useEffect(() => {
    if (paused || !clockOn) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused, clockOn]);

  if (!motion || !method) return <MissingParams />;

  const stop = async () => {
    if (method === 'cv') {
      finished.current ??= pose.finish(seconds);
      const done = finished.current;
      if (done && patient) {
        setSaving(true);
        setSaveError(null);
        try {
          const saved = await saveSession(done.session, patient.id);
          savePoseLog(saved.id, done.samples);
          router.replace({ pathname: '/results', params: { sessionId: saved.id } });
        } catch {
          setSaveError("This session didn't save. Check your connection and try again.");
          setSaving(false);
        }
        return;
      }
    }
    router.replace('/results');
  };

  const prompt = sessionPrompt(method, motion, paused, gate, pose.seenPerson, pose.inFrame, pose.cue);
  const live =
    method === 'cv' ? (
      <PoseCamera
        paused={paused}
        caption={paused || pose.inFrame ? undefined : 'Step back so your head and feet stay in view.'}
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
        <Text
          variant="callout"
          muted={!pose.cue}
          align="center"
          color={pose.cue?.tone === 'good' ? colors.seagrass : undefined}
          accessibilityLiveRegion="polite"
        >
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
          disabled={saving || saveError !== null}
          onPress={() => setPaused((p) => !p)}
        />
        <PillButton
          label={saving ? 'Saving…' : saveError ? 'Try saving again' : 'Stop'}
          icon={saveError ? 'refresh' : 'stop'}
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
        <RecordingBadge paused={paused} />
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
  seenPerson: boolean,
  inFrame: boolean,
  cue: FormCue | null,
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
      if (!seenPerson || !inFrame) return 'Step back so your head and feet stay in view.';
      if (cue) return cue.text;
      return motion === 'sitToStand'
        ? 'Stand all the way up, sit all the way down. Keep your arms crossed.'
        : 'Keep moving at your usual pace';
    default: {
      const unexpected: never = gate;
      return unexpected;
    }
  }
}
