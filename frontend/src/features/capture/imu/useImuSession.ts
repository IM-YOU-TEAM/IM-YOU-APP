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

/**
 * After Stop, the model is still scoring the last samples (each window is 2.5 s), so keep taking its
 * windows until it has been quiet this long, but never wait longer than DRAIN_MAX_MS.
 */
const DRAIN_QUIET_MS = 1200;
const DRAIN_MAX_MS = 4000;

/** How long a remembered pairing waits for its second phone before a fresh, scannable code replaces it. */
const REUSE_GRACE_MS = 8000;

/** What is stopping us from measuring, in one word. */
export type ImuGate =
  | 'connecting'
  | 'unreachable'
  /** Step 1: show the QR code until the second phone has scanned it and Next is tapped. */
  | 'scan-qr'
  | 'choose-site'
  | 'need-permission'
  | 'unavailable-sensors'
  /** Past the QR step; the second phone has not taken its spot on the leg yet. */
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

function hostGate(pairingFailed: boolean, gate: PairGate, motion: MotionGate, pastQr: boolean): ImuGate {
  if (pairingFailed) return 'unreachable';
  switch (gate) {
    case 'connecting':
      return 'connecting';
    case 'unreachable':
      return 'unreachable';
    default:
      break;
  }
  // Step 1 is the QR code: scan with the second phone, then Next. Already paired (a remembered pairing) skips it.
  if (!pastQr && gate !== 'paired') return 'scan-qr';
  switch (gate) {
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

/** The second phone pings every 2 s once it is on the channel; this long without one means it left. */
const SECOND_PHONE_SILENT_MS = 7000;

/**
 * The signed-in phone of a two-phone sensor session. It creates the pairing whose
 * QR code the second phone scans, holds the only Start / Pause / Stop, feeds the
 * live model, draws both legs' sensors, and turns the scored windows into the session it saves.
 */
export function useImuSession(motion: MotionType | null, paused: boolean) {
  const tally = useRef<ImuTally>({ accepted: [], total: 0, scored: [] });
  const pausedRef = useRef(paused);
  const recordingRef = useRef(false);
  const sessionRef = useRef<string | null>(null);
  /** True between Stop and the session being built: late windows from before Stop still count. */
  const drainingRef = useRef(false);
  const lastWindowAtRef = useRef(0);
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

  // Listen as soon as this is a sensor session, so both graphs are live before Start.
  const peer = usePeerTrace(supported);
  const publishRef = useRef<Pairing['publish']>(() => undefined);
  const uplinkRef = useRef<{ send: (message: object) => void; flush: () => void } | null>(null);

  // Leaving the screen mid-recording (Back, another tab) must stop the second phone and the model too.
  // Declared before the pairing and the uplink so this runs while their channel and socket are still open.
  useEffect(
    () => () => {
      if (!recordingRef.current) return;
      recordingRef.current = false;
      uplinkRef.current?.flush();
      publishRef.current(EVENTS.control, { action: 'stop' } satisfies ControlMessage);
      uplinkRef.current?.send({ type: 'session_stop' });
    },
    [],
  );
  // This phone's clock is the session's reference: answer the scanned phone's sync pings.
  const peerListen = peer.listen;
  // The second phone pings from the moment it scans, before either phone picks a spot: that is our
  // sign it is connected, which unlocks Next on the QR step.
  const lastPingAt = useRef(0);
  const [pinged, setPinged] = useState(false);
  const onBroadcast = useCallback(
    (event: string, payload: unknown) => {
      peerListen(event, payload);
      if (event === EVENTS.syncPing) {
        lastPingAt.current = Date.now();
        setPinged(true);
      }
      answerSyncPing(event, payload, publishRef.current);
    },
    [peerListen],
  );
  useEffect(() => {
    if (!pinged) return;
    const id = setInterval(() => {
      if (Date.now() - lastPingAt.current > SECOND_PHONE_SILENT_MS) setPinged(false);
    }, 2000);
    return () => clearInterval(id);
  }, [pinged]);
  const [pastQr, setPastQr] = useState(false);
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

  const secondPhoneConnected = pinged || pairing.peerSites.length > 0;
  const onChannel = pairGateNow !== 'connecting' && pairGateNow !== 'unreachable';

  // A reused pairing's QR code has usually been redeemed already, so it cannot be scanned again. Keep the
  // pairing only if its second phone turns up; otherwise make a fresh code that a new scan can use.
  useEffect(() => {
    if (!reusing.current || !onChannel || secondPhoneConnected) return;
    const id = setTimeout(() => {
      if (reusing.current) renewPairing();
    }, REUSE_GRACE_MS);
    return () => clearTimeout(id);
  }, [onChannel, secondPhoneConnected, renewPairing]);
  useEffect(() => {
    // The second phone is back on the remembered pairing: it is ours to keep for this visit.
    if (secondPhoneConnected) reusing.current = false;
  }, [secondPhoneConnected]);

  // A fresh code means a new scan: back to the QR step.
  const topicNow = hostPairing?.topic ?? null;
  useEffect(() => {
    setPastQr(false);
  }, [topicNow]);
  // Step 1 -> step 2, only once the second phone has actually scanned.
  const confirmSecondPhone = useCallback(() => {
    if (secondPhoneConnected) setPastQr(true);
  }, [secondPhoneConnected]);

  const uplink = useSampleUplink(supported, pairing.mySite, sensors.subscribe, () => recordingRef.current && !pausedRef.current);
  uplinkRef.current = uplink;

  useEffect(() => {
    if (motion == null) return;
    if (!supported) return;

    tally.current = { accepted: [], total: 0, scored: [] };

    return connectLive(liveApiUrl(), {
      onOpen: () => undefined,
      onClose: () => undefined,
      onMessage: (message: LiveMessage) => {
        if (message.type !== 'window') return;
        // Only this recording's windows: none from before Start or while paused. Windows that land just
        // after Stop are the tail of the recording, still being scored, so they count too.
        if (!drainingRef.current && (!recordingRef.current || pausedRef.current)) return;
        lastWindowAtRef.current = Date.now();
        tally.current.total += 1;
        // The service restarts its clock at every resume, so move each stretch to where it sat in the session.
        const base = segmentStartRef.current;
        const placed = base === 0 ? message : { ...message, start_s: message.start_s + base, end_s: message.end_s + base };
        // Every window with angles feeds the joint chart; only gate-passing ones count toward the score.
        (tally.current.scored ??= []).push(placed);
        if (message.usable) tally.current.accepted.push(placed);
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
    tally.current = { accepted: [], total: 0, scored: [] };
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

  const modelConnected = uplink.connected;
  const finish = useCallback(
    async (durationSec: number): Promise<Session | null> => {
      const stoppedAt = Date.now();
      drainingRef.current = recordingRef.current;
      halt();
      if (drainingRef.current && modelConnected) {
        await new Promise<void>((resolve) => {
          const id = setInterval(() => {
            const now = Date.now();
            const quietSince = Math.max(stoppedAt, lastWindowAtRef.current);
            if (now - quietSince >= DRAIN_QUIET_MS || now - stoppedAt >= DRAIN_MAX_MS) {
              clearInterval(id);
              resolve();
            }
          }, 100);
        });
      }
      drainingRef.current = false;
      if (motion == null || tally.current.total === 0) return null;
      return summariseImu(tally.current, motion, durationSec);
    },
    [halt, motion, modelConnected],
  );

  const gate: ImuGate = supported ? hostGate(pairingFailed, pairing.gate, sensors.gate, pastQr) : 'unsupported-motion';
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
    modelConnected,
    mySite,
    freeSites: pairing.freeSites,
    secondPhoneIn: paired,
    secondPhoneConnected,
    confirmSecondPhone,
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
