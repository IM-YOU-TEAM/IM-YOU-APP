import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { sessionId } from '@/lib/session';
import type { MotionType, Session } from '@/types';
import { summariseImu, type ImuTally } from './imuSummary';
import { connectLive, liveApiUrl } from './liveClient';
import {
  ACTIVITY_TO_MOTION,
  IMU_SUPPORTED,
  type JointName,
  type LiveMessage,
  type ModelActivity,
} from './liveTypes';
import type { MotionGate, SiteTrace } from './motionTypes';
import { clearHostPairing, loadHostPairing, saveHostPairing } from './hostPairingStore';
import { createPairing, type HostPairing } from './pairingApi';
import { EVENTS, SITES, type ControlMessage, type Site } from './protocol';
import { useMotionStream } from './useMotionStream';
import { answerSyncPing } from './useClockSync';
import { usePairing, type PairGate, type Pairing } from './usePairing';
import { usePeerTrace } from './usePeerTrace';
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

type ModelReadout = {
  captureStarted: boolean;
  recording: boolean;
  detectedMotion?: MotionType;
  confidence: number;
  reason?: string;
  windows: number;
  accepted: number;
  angles?: Record<JointName, number[]>;
};

const EMPTY: ModelReadout = {
  captureStarted: false,
  recording: false,
  confidence: 0,
  windows: 0,
  accepted: 0,
};

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
 * live model, draws both legs' sensors, and turns the scored windows into the session it saves.
 */
export function useImuSession(motion: MotionType | null, paused: boolean) {
  const tally = useRef<ImuTally>({ accepted: [], total: 0 });
  const pausedRef = useRef(paused);
  const recordingRef = useRef(false);
  const sessionRef = useRef<string | null>(null);
  /** Wall-clock ms when Start was tapped. */
  const startedAtRef = useRef(0);
  /** Seconds into the session where the current stretch (since Start or the last resume) began. */
  const segmentStartRef = useRef(0);
  const [live, setLive] = useState<ModelReadout>(EMPTY);

  const supported = motion != null && IMU_SUPPORTED.includes(motion);
  const sensors = useMotionStream();

  // A pairing made earlier on this phone (by this account) is rejoined, so a second phone scanned
  // before a demo stays connected across recordings, the results page and reloads.
  const userId = useAuth().session?.user.id ?? null;
  const [stored] = useState(() => (userId ? loadHostPairing(userId) : null));
  const reusing = useRef(stored != null);
  const [hostPairing, setHostPairing] = useState<HostPairing | null>(stored?.pairing ?? null);
  const [pairingFailed, setPairingFailed] = useState(false);
  const pairingRequest = useRef(0);
  const pairingQueue = useRef<Promise<void>>(Promise.resolve());

  const renewPairing = useCallback(() => {
    const request = ++pairingRequest.current;
    reusing.current = false;
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
    if (!reusing.current) renewPairing();
    return () => {
      pairingRequest.current += 1;
    };
  }, [supported, renewPairing]);

  const peer = usePeerTrace(live.recording && !paused);
  const publishRef = useRef<Pairing['publish']>(() => undefined);
  // This phone's clock is the session's reference: answer the scanned phone's sync pings.
  const peerListen = peer.listen;
  const onBroadcast = useCallback(
    (event: string, payload: unknown) => {
      peerListen(event, payload);
      answerSyncPing(event, payload, publishRef.current);
    },
    [peerListen],
  );
  const pairing = usePairing(supported ? (hostPairing?.topic ?? null) : null, onBroadcast, stored?.site ?? null);
  publishRef.current = pairing.publish;

  // Remember the pairing and this phone's spot for the next visit.
  const mySiteNow = pairing.mySite;
  useEffect(() => {
    if (userId && hostPairing) saveHostPairing(userId, hostPairing, mySiteNow);
  }, [userId, hostPairing, mySiteNow]);

  // The remembered pairing was retired or ran past its 12 hours: start a fresh one.
  const pairGateNow = pairing.gate;
  useEffect(() => {
    if (pairGateNow !== 'unreachable' || !reusing.current) return;
    clearHostPairing();
    renewPairing();
  }, [pairGateNow, renewPairing]);

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
        // Only this recording's windows: none from before Start, after Stop, or while paused.
        if (!recordingRef.current || pausedRef.current) return;
        tally.current.total += 1;
        // The service restarts its clock at every resume, so move each stretch to where it sat in the session.
        const base = segmentStartRef.current;
        if (message.usable) {
          tally.current.accepted.push(
            base === 0 ? message : { ...message, start_s: message.start_s + base, end_s: message.end_s + base },
          );
        }
        const activity = message.activity as ModelActivity | null;
        setLive((prev) => ({
          ...prev,
          windows: tally.current.total,
          accepted: tally.current.accepted.length,
          reason: message.reason ?? undefined,
          confidence: message.confidence,
          angles: message.angles,
          detectedMotion: activity ? ACTIVITY_TO_MOTION[activity] ?? undefined : prev.detectedMotion,
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
    // Seconds since Start at which the resumed stretch begins; the pause itself becomes a gap.
    if (!paused) segmentStartRef.current = (Date.now() - startedAtRef.current) / 1000;
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
    startedAtRef.current = Date.now();
    segmentStartRef.current = 0;
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
      return summariseImu(tally.current, motion, durationSec);
    },
    [halt, motion],
  );

  const gate: ImuGate = supported ? hostGate(pairingFailed, pairing.gate, sensors.gate) : 'unsupported-motion';
  const mySite: Site | null = pairing.mySite;
  const own = sensors.recent;
  // Thigh first, as on the body.
  const traces: SiteTrace[] = mySite
    ? SITES.map((site) =>
        site === mySite
          ? { site, mine: true, samples: own, end: own[own.length - 1]?.t ?? 0 }
          : { site, mine: false, samples: peer.site === site ? peer.samples : [], end: peer.end },
      )
    : [];

  return {
    ...live,
    gate,
    supported,
    modelConnected: uplink.connected,
    mySite,
    freeSites: pairing.freeSites,
    secondPhoneIn: paired,
    hz: sensors.hz,
    traces,
    pairCode: hostPairing?.code ?? null,
    pairExpiresAt: hostPairing?.expiresAt ?? null,
    renewPairing,
    claim: pairing.claim,
    requestSensors: sensors.request,
    start,
    finish,
  };
}
