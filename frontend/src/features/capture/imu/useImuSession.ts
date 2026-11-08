import { useCallback, useEffect, useRef, useState } from 'react';
import { LOCAL_PATIENT_ID } from '@/lib/data';
import { localDateTime, sessionId } from '@/lib/session';
import type { MotionType, Session, SessionAssessmentMetric } from '@/types';
import { connectLive, liveApiUrl } from './liveClient';
import {
  ACTIVITY_LABELS,
  ACTIVITY_TO_MOTION,
  IMU_SUPPORTED,
  type JointName,
  type LiveMessage,
  type LiveWindow,
  type ModelActivity,
} from './liveTypes';

/** Mirrors CameraGate: what is stopping us from measuring, in one word. */
export type ImuGate = 'connecting' | 'unreachable' | 'waiting-for-phones' | 'unsupported-motion' | 'ready';

const JOINT_LABELS: Record<JointName, string> = {
  hip_flexion_r: 'Hip flexion',
  knee_angle_r: 'Knee angle',
  ankle_angle_r: 'Ankle angle',
};

export type ImuReadout = {
  gate: ImuGate;
  captureStarted: boolean;
  recording: boolean;
  /** The latest accepted activity, mapped to what the app understands. */
  detectedMotion?: MotionType;
  /** The model's own finer-grained answer, e.g. "Stairs down". */
  detectedLabel?: string;
  confidence: number;
  /** True when the newest window had too little movement to judge. */
  lowMotion: boolean;
  reason?: string;
  windows: number;
  accepted: number;
  observedHz: Record<string, number>;
  /** Newest window's joint angles, for the live trace. */
  angles?: Record<JointName, number[]>;
};

const EMPTY: ImuReadout = {
  gate: 'connecting',
  captureStarted: false,
  recording: false,
  confidence: 0,
  lowMotion: false,
  windows: 0,
  accepted: 0,
  observedHz: {},
};

/** Everything kept across a session, so `finish` can summarise it. */
type Tally = {
  accepted: LiveWindow[];
  total: number;
};

function summarise(tally: Tally, motion: MotionType, durationSec: number): Session {
  const counts = new Map<ModelActivity, number>();
  for (const window of tally.accepted) {
    const activity = window.activity as ModelActivity;
    counts.set(activity, (counts.get(activity) ?? 0) + 1);
  }
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const detected = dominant ? ACTIVITY_TO_MOTION[dominant] ?? undefined : undefined;
  const matching = tally.accepted.filter((w) => ACTIVITY_TO_MOTION[w.activity as ModelActivity] === motion).length;

  const metrics: SessionAssessmentMetric[] = [];
  const joints: JointName[] = ['hip_flexion_r', 'knee_angle_r', 'ankle_angle_r'];
  for (const joint of joints) {
    const ranges = tally.accepted.map((w) => w.summary[joint]).filter(Boolean);
    if (ranges.length === 0) continue;
    const span = ranges.reduce((sum, r) => sum + (r.max - r.min), 0) / ranges.length;
    metrics.push({ key: joint, label: `${JOINT_LABELS[joint]} range`, value: Math.round(span * 10) / 10, unit: '°' });
  }
  metrics.push({
    key: 'coverage',
    label: 'Session with enough movement to measure',
    value: tally.total > 0 ? Math.round((100 * tally.accepted.length) / tally.total) : 0,
    unit: '%',
  });

  return {
    id: sessionId('imu'),
    patientId: LOCAL_PATIENT_ID,
    date: localDateTime(),
    motion,
    method: 'imu',
    durationSec,
    // Share of the session that held steady, measurable movement. Not a clinical score.
    gaitScore: tally.total > 0 ? Math.round((100 * tally.accepted.length) / tally.total) : 0,
    // Steps are not counted from the sensors: the joint-angle output is unvalidated on phone data.
    cadence: 0,
    symmetry: 0,
    symmetryMeasured: false,
    movementVerified: detected === motion,
    detectedMotion: detected,
    movementMatch: tally.accepted.length > 0 ? Math.round((100 * matching) / tally.accepted.length) : 0,
    assessmentMetrics: metrics,
  };
}

/**
 * Subscribes to the live inference service for one session.
 *
 * Mirrors `usePoseSession`: a live readout plus `finish`, so the session screen
 * treats both capture methods the same way.
 */
export function useImuSession(motion: MotionType | null, paused: boolean) {
  const tally = useRef<Tally>({ accepted: [], total: 0 });
  const pausedRef = useRef(paused);
  const [live, setLive] = useState<ImuReadout>(EMPTY);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const supported = motion != null && IMU_SUPPORTED.includes(motion);

  useEffect(() => {
    if (motion == null) return;
    if (!supported) {
      setLive({ ...EMPTY, gate: 'unsupported-motion' });
      return;
    }

    tally.current = { accepted: [], total: 0 };
    setLive(EMPTY);

    const stop = connectLive(liveApiUrl(), {
      onOpen: () => setLive((prev) => ({ ...prev, gate: 'waiting-for-phones' })),
      onClose: () => setLive((prev) => ({ ...prev, gate: 'unreachable', recording: false })),
      onMessage: (message: LiveMessage) => {
        if (message.type === 'status') {
          setLive((prev) => ({
            ...prev,
            gate: !message.receiver_connected ? 'unreachable' : message.recording ? 'ready' : 'waiting-for-phones',
            recording: message.recording,
            observedHz: message.observed_hz,
          }));
          return;
        }
        if (message.type !== 'window') return;
        // Pausing freezes the readout without dropping the connection.
        if (pausedRef.current) return;

        tally.current.total += 1;
        if (message.usable) tally.current.accepted.push(message);

        const activity = message.activity as ModelActivity | null;
        setLive((prev) => ({
          ...prev,
          gate: 'ready',
          captureStarted: true,
          windows: tally.current.total,
          accepted: tally.current.accepted.length,
          lowMotion: !message.usable,
          reason: message.reason ?? undefined,
          confidence: message.confidence,
          angles: message.angles,
          detectedMotion: activity ? ACTIVITY_TO_MOTION[activity] ?? undefined : prev.detectedMotion,
          detectedLabel: activity ? ACTIVITY_LABELS[activity] : prev.detectedLabel,
        }));
      },
    });

    return stop;
  }, [motion, supported]);

  const finish = useCallback(
    (durationSec: number): Session | null => {
      if (motion == null || tally.current.total === 0) return null;
      return summarise(tally.current, motion, durationSec);
    },
    [motion],
  );

  return { ...live, supported, finish };
}
