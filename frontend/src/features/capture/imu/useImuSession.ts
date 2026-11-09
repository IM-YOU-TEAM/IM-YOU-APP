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
import type { MotionGate } from './motionTypes';
import { createPairing, type HostPairing } from './pairingApi';
import { EVENTS, type ControlMessage, type Site } from './protocol';
import { useMotionStream } from './useMotionStream';
import { usePairing, type PairGate } from './usePairing';
import { useSampleUplink } from './useSampleUplink';

/** What is stopping us from measuring, in one word. */
export type ImuGate =
  | 'connecting'
  | 'unreachable'
  | 'choose-site'
  | 'need-permission'
  | 'unavailable-sensors'
  /** This phone is ready; its QR code is waiting to be scanned by the second phone. */
  | 'waiting-for-second-phone'
  | 'unsupported-motion'
  | 'ready';

const JOINT_LABELS: Record<JointName, string> = {
  hip_flexion_r: 'Hip flexion',
  knee_angle_r: 'Knee angle',
  ankle_angle_r: 'Ankle angle',
};

type ModelReadout = {
  captureStarted: boolean;
  recording: boolean;
  detectedMotion?: MotionType;
  detectedLabel?: string;
  confidence: number;
  lowMotion: boolean;
  reason?: string;
  windows: number;
  accepted: number;
  angles?: Record<JointName, number[]>;
};

const EMPTY: ModelReadout = {
  captureStarted: false,
  recording: false,
  confidence: 0,
  lowMotion: false,
  windows: 0,
  accepted: 0,
};

type Tally = {
  accepted: LiveWindow[];
  total: number;
};

/** Points kept per joint: enough for a smooth 2.5 s curve, small enough for the session row. */
const SAVED_POINTS = 100;

function thinTo(series: number[], points: number): number[] {
  const step = series.length <= points ? 1 : (series.length - 1) / (points - 1);
  const count = Math.min(series.length, points);
  return Array.from({ length: count }, (_, i) => Math.round(series[Math.round(i * step)] * 10) / 10);
}

/** The accepted window the model was surest about, from the session's main activity when it has one. */
function bestWindow(accepted: LiveWindow[], dominant: ModelActivity | undefined): LiveWindow | undefined {
  const main = accepted.filter((w) => w.activity === dominant);
  const pool = main.length > 0 ? main : accepted;
  return pool.reduce<LiveWindow | undefined>((best, w) => (best == null || w.confidence > best.confidence ? w : best), undefined);
}

function savedAngles(scored: LiveWindow | undefined): Record<JointName, number[]> | undefined {
  if (!scored) return undefined;
  const { hip_flexion_r: hip, knee_angle_r: knee, ankle_angle_r: ankle } = scored.angles;
  if (!(hip?.length > 1 && knee?.length > 1 && ankle?.length > 1)) return undefined;
  return {
    hip_flexion_r: thinTo(hip, SAVED_POINTS),
    knee_angle_r: thinTo(knee, SAVED_POINTS),
    ankle_angle_r: thinTo(ankle, SAVED_POINTS),
  };
}

function summarise(tally: Tally, motion: MotionType, durationSec: number): Session {
  const counts = new Map<ModelActivity, number>();
  for (const window of tally.accepted) {
    const activity = window.activity as ModelActivity;
    counts.set(activity, (counts.get(activity) ?? 0) + 1);
  }
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const jointAngles = savedAngles(bestWindow(tally.accepted, dominant));
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
    gaitScore: tally.total > 0 ? Math.round((100 * tally.accepted.length) / tally.total) : 0,
    cadence: 0,
    symmetry: 0,
    symmetryMeasured: false,
    movementVerified: detected === motion,
    detectedMotion: detected,
    movementMatch: tally.accepted.length > 0 ? Math.round((100 * matching) / tally.accepted.length) : 0,
    assessmentMetrics: metrics,
    ...(jointAngles ? { jointAngles } : {}),
  };
}

function hostGate(pairingFailed: boolean, gate: PairGate, motion: MotionGate): ImuGate {
  if (pairingFailed) return 'unreachable';
  switch (gate) {
    case 'connecting':
      return 'connecting';
    case 'unreachable':
      return 'unreachable';
    case 'choose-site':
      return 'choose-site';
    case 'waiting-for-peer':
    case 'paired':
      if (motion === 'unavailable') return 'unavailable-sensors';
      if (motion === 'streaming') return gate === 'paired' ? 'ready' : 'waiting-for-second-phone';
      return 'need-permission';
    default: {
      const unexpected: never = gate;
      return unexpected;
    }
  }
}

/**
 * The signed-in phone of a two-phone sensor session. It creates the pairing whose
 * QR code the second phone scans, holds the only Start / Pause / Stop, feeds the
 * live model, and turns the scored windows into the session it saves.
 */
export function useImuSession(motion: MotionType | null, paused: boolean) {
  const tally = useRef<Tally>({ accepted: [], total: 0 });
  const pausedRef = useRef(paused);
  const recordingRef = useRef(false);
  const sessionRef = useRef<string | null>(null);
  const [live, setLive] = useState<ModelReadout>(EMPTY);

  const supported = motion != null && IMU_SUPPORTED.includes(motion);
  const sensors = useMotionStream();

  const [hostPairing, setHostPairing] = useState<HostPairing | null>(null);
  const [pairingFailed, setPairingFailed] = useState(false);
  const pairingRequest = useRef(0);
  const pairingQueue = useRef<Promise<void>>(Promise.resolve());

  const renewPairing = useCallback(() => {
    const request = ++pairingRequest.current;
    setPairingFailed(false);
    // One at a time: each pairing retires the older ones, so the newest must also be created last.
    pairingQueue.current = pairingQueue.current.then(async () => {
      if (request !== pairingRequest.current) return;
      const next = await createPairing();
      if (request !== pairingRequest.current) return;
      if (next) setHostPairing(next);
      else setPairingFailed(true);
    });
  }, []);

  useEffect(() => {
    if (!supported) return;
    renewPairing();
    return () => {
      pairingRequest.current += 1;
    };
  }, [supported, renewPairing]);

  const pairing = usePairing(supported ? (hostPairing?.topic ?? null) : null);
  const publishRef = useRef(pairing.publish);
  publishRef.current = pairing.publish;

  const uplink = useSampleUplink(supported, pairing.mySite, sensors.subscribe, () => recordingRef.current && !pausedRef.current);

  useEffect(() => {
    if (motion == null) return;
    if (!supported) return;

    tally.current = { accepted: [], total: 0 };

    return connectLive(liveApiUrl(), {
      onOpen: () => undefined,
      onClose: () => undefined,
      onMessage: (message: LiveMessage) => {
        if (message.type !== 'window') return;
        if (pausedRef.current) return;
        tally.current.total += 1;
        if (message.usable) tally.current.accepted.push(message);
        const activity = message.activity as ModelActivity | null;
        setLive((prev) => ({
          ...prev,
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
  }, [motion, supported]);

  const sendControl = useCallback((action: ControlMessage['action']) => {
    const control: ControlMessage = { action };
    publishRef.current(EVENTS.control, control);
  }, []);

  // Pausing here pauses the second phone too: the model needs thigh and shin from the same moments.
  useEffect(() => {
    pausedRef.current = paused;
    if (!recordingRef.current) return;
    sendControl(paused ? 'pause' : 'resume');
    if (paused) uplink.flush();
    // The model would interpolate straight across the gap, so it restarts clean on resume.
    uplink.send(paused ? { type: 'session_stop' } : { type: 'session_start', session_id: sessionRef.current });
  }, [paused, sendControl, uplink.flush, uplink.send]);

  // The second phone reloaded or reconnected mid-session: tell it where things stand.
  const paired = pairing.gate === 'paired';
  useEffect(() => {
    if (!paired || !recordingRef.current) return;
    sendControl('start');
    if (pausedRef.current) sendControl('pause');
  }, [paired, sendControl]);

  const start = useCallback(() => {
    if (motion == null || pairing.gate !== 'paired' || recordingRef.current) return;
    const id = sessionId('imu');
    recordingRef.current = true;
    sessionRef.current = id;
    tally.current = { accepted: [], total: 0 };
    setLive((prev) => ({ ...prev, recording: true, captureStarted: true }));
    sendControl('start');
    uplink.send({ type: 'session_start', session_id: id });
  }, [motion, pairing.gate, sendControl, uplink.send]);

  const halt = useCallback(() => {
    if (!recordingRef.current) return;
    uplink.flush();
    sendControl('stop');
    uplink.send({ type: 'session_stop' });
    recordingRef.current = false;
    sessionRef.current = null;
    setLive((prev) => ({ ...prev, recording: false }));
  }, [sendControl, uplink.flush, uplink.send]);

  const finish = useCallback(
    (durationSec: number): Session | null => {
      halt();
      if (motion == null || tally.current.total === 0) return null;
      return summarise(tally.current, motion, durationSec);
    },
    [halt, motion],
  );

  const gate: ImuGate = supported ? hostGate(pairingFailed, pairing.gate, sensors.gate) : 'unsupported-motion';
  const mySite: Site | null = pairing.mySite;

  return {
    ...live,
    gate,
    supported,
    modelConnected: uplink.connected,
    mySite,
    freeSites: pairing.freeSites,
    secondPhoneIn: paired,
    hz: sensors.hz,
    samples: sensors.recent,
    pairCode: hostPairing?.code ?? null,
    pairExpiresAt: hostPairing?.expiresAt ?? null,
    renewPairing,
    claim: pairing.claim,
    requestSensors: sensors.request,
    start,
    finish,
  };
}
