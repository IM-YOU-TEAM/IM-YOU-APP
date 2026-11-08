import { useCallback, useEffect, useRef, useState } from 'react';
import { LOCAL_PATIENT_ID } from '@/lib/data';
import { localDateTime, sessionId } from '@/lib/session';
import type { MotionType, Session, SessionAssessmentMetric } from '@/types';
import { connectLive, connectSocket, liveApiUrl, liveSocketUrl } from './liveClient';
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
import {
  DEVICE_ID,
  EVENTS,
  SITES,
  type ControlMessage,
  type ImuSample,
  type SamplesMessage,
  type Site,
} from './protocol';
import { useMotionStream } from './useMotionStream';
import { usePairing, type PairGate } from './usePairing';

/** What is stopping us from measuring, in one word. */
export type ImuGate =
  | 'connecting'
  | 'not-a-patient'
  | 'unreachable'
  | 'choose-site'
  | 'need-permission'
  | 'unavailable-sensors'
  | 'waiting-for-phones'
  | 'unsupported-motion'
  | 'ready';

const JOINT_LABELS: Record<JointName, string> = {
  hip_flexion_r: 'Hip flexion',
  knee_angle_r: 'Knee angle',
  ankle_angle_r: 'Ankle angle',
};

const BATCH_SIZE = 10;
const BATCH_MS = 80;

export type ImuReadout = {
  gate: ImuGate;
  captureStarted: boolean;
  recording: boolean;
  modelConnected: boolean;
  mySite: Site | null;
  freeSites: Site[];
  hz: number;
  samples: ImuSample[];
  detectedMotion?: MotionType;
  detectedLabel?: string;
  confidence: number;
  lowMotion: boolean;
  reason?: string;
  windows: number;
  accepted: number;
  observedHz: Record<string, number>;
  angles?: Record<JointName, number[]>;
};

const EMPTY: ImuReadout = {
  gate: 'connecting',
  captureStarted: false,
  recording: false,
  modelConnected: false,
  mySite: null,
  freeSites: SITES.slice(),
  hz: 0,
  samples: [],
  confidence: 0,
  lowMotion: false,
  windows: 0,
  accepted: 0,
  observedHz: {},
};

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
    gaitScore: tally.total > 0 ? Math.round((100 * tally.accepted.length) / tally.total) : 0,
    cadence: 0,
    symmetry: 0,
    symmetryMeasured: false,
    movementVerified: detected === motion,
    detectedMotion: detected,
    movementMatch: tally.accepted.length > 0 ? Math.round((100 * matching) / tally.accepted.length) : 0,
    assessmentMetrics: metrics,
  };
}

function asControl(payload: unknown): ControlMessage | null {
  if (payload == null || typeof payload !== 'object') return null;
  const message = payload as Partial<ControlMessage>;
  if (message.action !== 'start' && message.action !== 'stop') return null;
  if (typeof message.session_id !== 'string' || typeof message.origin !== 'string') return null;
  return message as ControlMessage;
}

function pairToImuGate(gate: PairGate, motion: MotionGate): ImuGate {
  switch (gate) {
    case 'connecting':
      return 'connecting';
    case 'not-a-patient':
      return 'not-a-patient';
    case 'unreachable':
      return 'unreachable';
    case 'choose-site':
      return 'choose-site';
    case 'waiting-for-peer':
    case 'paired':
      if (motion === 'unavailable') return 'unavailable-sensors';
      if (motion === 'streaming') return gate === 'paired' ? 'ready' : 'waiting-for-phones';
      return 'need-permission';
    default: {
      const unexpected: never = gate;
      return unexpected;
    }
  }
}

/**
 * Two phones signed into the same patient account: pair over Realtime, stream
 * DeviceMotion samples, and feed the live inference service.
 */
export function useImuSession(motion: MotionType | null, paused: boolean) {
  const tally = useRef<Tally>({ accepted: [], total: 0 });
  const pausedRef = useRef(paused);
  const recordingRef = useRef(false);
  const sessionRef = useRef<string | null>(null);
  const seqRef = useRef(0);
  const batchRef = useRef<ImuSample[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneRef = useRef<ReturnType<typeof connectSocket> | null>(null);
  const [live, setLive] = useState<ImuReadout>(EMPTY);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const supported = motion != null && IMU_SUPPORTED.includes(motion);
  const sensors = useMotionStream();

  const onBroadcast = useCallback((event: string, payload: unknown) => {
    if (event !== EVENTS.control) return;
    const control = asControl(payload);
    if (!control) return;
    recordingRef.current = control.action === 'start';
    sessionRef.current = control.action === 'start' ? control.session_id : null;
    setLive((prev) => ({
      ...prev,
      recording: control.action === 'start',
      captureStarted: prev.captureStarted || control.action === 'start',
    }));
  }, []);

  const pairing = usePairing(supported, onBroadcast);
  const mySiteRef = useRef(pairing.mySite);
  const publishRef = useRef(pairing.publish);
  mySiteRef.current = pairing.mySite;
  publishRef.current = pairing.publish;

  const flush = useCallback(() => {
    const samples = batchRef.current;
    const site = mySiteRef.current;
    if (samples.length === 0 || site == null) return;
    batchRef.current = [];
    const packet: SamplesMessage = { site, seq: seqRef.current, samples };
    seqRef.current += 1;
    publishRef.current(EVENTS.samples, packet);
    phoneRef.current?.send({
      type: 'samples',
      device_id: DEVICE_ID[site],
      accel_units: 'm/s^2',
      gyro_units: 'deg/s',
      samples: samples.map((sample) => ({
        common_timestamp: sample.t,
        ax: sample.ax,
        ay: sample.ay,
        az: sample.az,
        gx: sample.gx,
        gy: sample.gy,
        gz: sample.gz,
      })),
    });
  }, []);

  useEffect(() => {
    return sensors.subscribe((sample) => {
      if (!recordingRef.current || pausedRef.current) return;
      batchRef.current.push(sample);
      if (batchRef.current.length >= BATCH_SIZE) flush();
    });
  }, [sensors.subscribe, flush]);

  useEffect(() => {
    if (flushTimer.current) clearInterval(flushTimer.current);
    flushTimer.current = setInterval(flush, BATCH_MS);
    return () => {
      if (flushTimer.current) clearInterval(flushTimer.current);
    };
  }, [flush]);

  useEffect(() => {
    if (!supported || pairing.mySite == null) return;
    void pairing.advertise({ hz: sensors.hz, sensing: sensors.gate === 'streaming' });
  }, [supported, pairing.mySite, pairing.advertise, sensors.hz, sensors.gate]);

  useEffect(() => {
    if (motion == null) return;
    if (!supported) {
      setLive({ ...EMPTY, gate: 'unsupported-motion' });
      return;
    }

    tally.current = { accepted: [], total: 0 };

    const phone = connectSocket(liveSocketUrl('/phone'), {
      onOpen: () => setLive((prev) => ({ ...prev, modelConnected: true })),
      onClose: () => setLive((prev) => ({ ...prev, modelConnected: false })),
    });
    phoneRef.current = phone;

    const stopViewer = connectLive(liveApiUrl(), {
      onOpen: () => setLive((prev) => ({ ...prev, modelConnected: true })),
      onClose: () => undefined,
      onMessage: (message: LiveMessage) => {
        if (message.type === 'status') {
          setLive((prev) => ({ ...prev, observedHz: message.observed_hz }));
          return;
        }
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

    return () => {
      phone.stop();
      phoneRef.current = null;
      stopViewer();
    };
  }, [motion, supported]);

  useEffect(() => {
    setLive((prev) => ({
      ...prev,
      gate: supported ? pairToImuGate(pairing.gate, sensors.gate) : prev.gate,
      mySite: pairing.mySite,
      freeSites: pairing.freeSites,
      hz: sensors.hz,
      samples: sensors.recent,
    }));
  }, [supported, pairing.gate, pairing.mySite, pairing.freeSites, sensors.gate, sensors.hz, sensors.recent]);

  const claim = pairing.claim;
  const requestSensors = sensors.request;

  const start = useCallback(() => {
    if (motion == null || pairing.gate !== 'paired') return;
    const id = sessionId('imu');
    sessionRef.current = id;
    recordingRef.current = true;
    seqRef.current = 0;
    tally.current = { accepted: [], total: 0 };
    const control: ControlMessage = {
      action: 'start',
      motion,
      at: Date.now(),
      session_id: id,
      origin: pairing.clientKey,
    };
    publishRef.current(EVENTS.control, control);
    phoneRef.current?.send({ type: 'session_start', session_id: id });
    setLive((prev) => ({ ...prev, recording: true, captureStarted: true }));
  }, [motion, pairing.gate, pairing.clientKey]);

  const halt = useCallback(() => {
    if (!recordingRef.current) return;
    flush();
    const control: ControlMessage = {
      action: 'stop',
      motion: motion ?? '',
      at: Date.now(),
      session_id: sessionRef.current ?? '',
      origin: pairing.clientKey,
    };
    publishRef.current(EVENTS.control, control);
    phoneRef.current?.send({ type: 'session_stop' });
    recordingRef.current = false;
    sessionRef.current = null;
    setLive((prev) => ({ ...prev, recording: false }));
  }, [flush, motion, pairing.clientKey]);

  const finish = useCallback(
    (durationSec: number): Session | null => {
      halt();
      if (motion == null || tally.current.total === 0) return null;
      return summarise(tally.current, motion, durationSec);
    },
    [halt, motion],
  );

  return { ...live, supported, claim, requestSensors, start, finish };
}
