import { useCallback, useEffect, useRef, useState } from 'react';
import { claimPairing } from './pairingApi';
import { EVENTS, SITES, type ControlMessage, type Site } from './protocol';
import { useMotionStream } from './useMotionStream';
import { usePairing } from './usePairing';
import { useClockSync } from './useClockSync';
import { useSampleUplink } from './useSampleUplink';
import { useTraceSender } from './useTraceSender';

export type SecondPhoneGate =
  | 'claiming'
  /** Used, replaced by a newer code, or past its 10 minutes. */
  | 'invalid-code'
  | 'unreachable'
  | 'connecting'
  | 'unavailable-sensors'
  | 'need-permission'
  /** On the channel, but the signed-in phone is not (or no longer) there with a spot. */
  | 'waiting-for-first-phone'
  /** Both phones are in; this one is still measuring how far its clock is from the other's. */
  | 'syncing-clocks'
  | 'ready';

type Claim = { state: 'claiming' } | { state: 'invalid' } | { state: 'offline' } | { state: 'claimed'; topic: string };

const CONTROL_ACTIONS: ControlMessage['action'][] = ['start', 'stop', 'pause', 'resume'];

/** The code is single use, so a reload of this tab has to remember what it redeemed. */
const storageKey = (code: string) => `imu-pairing:${code}`;

function remembered(code: string): string | null {
  try {
    return globalThis.sessionStorage?.getItem(storageKey(code)) ?? null;
  } catch {
    return null;
  }
}

function remember(code: string, topic: string | null): void {
  try {
    if (topic) globalThis.sessionStorage?.setItem(storageKey(code), topic);
    else globalThis.sessionStorage?.removeItem(storageKey(code));
  } catch {
    // Private mode: a reload just means scanning a new code.
  }
}

function asControl(payload: unknown): ControlMessage | null {
  if (payload == null || typeof payload !== 'object') return null;
  const action = (payload as Partial<ControlMessage>).action;
  return action != null && CONTROL_ACTIONS.includes(action) ? { action } : null;
}

/**
 * The scanned phone. No account: it redeems the QR code, takes whichever spot the
 * signed-in phone left free, and streams its sensors to the model, plus a smoothed
 * copy to that phone's graphs, while that phone says it is recording. It never saves anything.
 */
export function useSecondPhone(code: string) {
  const [claim, setClaim] = useState<Claim>(() => {
    const topic = remembered(code);
    return topic ? { state: 'claimed', topic } : { state: 'claiming' };
  });
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  // This phone never finishes on its own: it stays paired for every recording until its tab is closed.
  const done = false;
  const recordingRef = useRef(false);
  const pausedRef = useRef(false);

  const redeem = useCallback(async () => {
    setClaim({ state: 'claiming' });
    try {
      const topic = await claimPairing(code);
      remember(code, topic);
      setClaim(topic ? { state: 'claimed', topic } : { state: 'invalid' });
    } catch {
      setClaim({ state: 'offline' });
    }
  }, [code]);

  const arrivedUnclaimed = useRef(claim.state === 'claiming');
  useEffect(() => {
    if (arrivedUnclaimed.current) void redeem();
  }, [redeem]);

  // Set once the clock sync below exists; the pairing hands it the signed-in phone's answers.
  const syncListenRef = useRef<(event: string, payload: unknown) => void>(() => undefined);

  const onBroadcast = useCallback(
    (event: string, payload: unknown) => {
      syncListenRef.current(event, payload);
      if (event !== EVENTS.control) return;
      const control = asControl(payload);
      if (!control) return;
      switch (control.action) {
        case 'start':
          recordingRef.current = true;
          setRecording(true);
          return;
        case 'pause':
        case 'resume':
          pausedRef.current = control.action === 'pause';
          setPaused(pausedRef.current);
          return;
        case 'stop':
          // Stay on the channel: the next Start from the signed-in phone records again, with no new scan.
          recordingRef.current = false;
          pausedRef.current = false;
          setRecording(false);
          setPaused(false);
          return;
        default: {
          const unexpected: never = control.action;
          return unexpected;
        }
      }
    },
    [code],
  );

  const topic = claim.state === 'claimed' && !done ? claim.topic : null;
  const pairing = usePairing(topic, onBroadcast);
  const { gate: pairGate, peerSites, claim: claimSite } = pairing;
  const onChannel = pairGate !== 'connecting' && pairGate !== 'unreachable';
  const sync = useClockSync(onChannel, pairing.publish);
  syncListenRef.current = sync.listen;
  const sensors = useMotionStream();
  // Samples go out on the signed-in phone's clock, and not at all until the offset is known.
  useSampleUplink(topic != null, pairing.mySite, sensors.subscribe, () => recordingRef.current && !pausedRef.current, sync.offset);
  useTraceSender(recording && !paused, pairing.mySite, sensors.recent, pairing.publish);

  // Take the spot the signed-in phone left free, once Safari is actually sending motion.
  const firstSite: Site | undefined = peerSites[0];
  useEffect(() => {
    if (pairGate !== 'choose-site' || sensors.gate !== 'streaming' || firstSite == null) return;
    const free = SITES.find((site) => site !== firstSite);
    if (free) void claimSite(free);
  }, [pairGate, sensors.gate, firstSite, claimSite]);

  const gate: SecondPhoneGate = (() => {
    switch (claim.state) {
      case 'claiming':
        return 'claiming';
      case 'invalid':
        return 'invalid-code';
      case 'offline':
        return 'unreachable';
      case 'claimed':
        break;
      default: {
        const unexpected: never = claim;
        return unexpected;
      }
    }
    if (pairGate === 'connecting') return 'connecting';
    if (pairGate === 'unreachable') return 'unreachable';
    if (sensors.gate === 'unavailable') return 'unavailable-sensors';
    if (sensors.gate !== 'streaming') return 'need-permission';
    if (pairGate !== 'paired') return 'waiting-for-first-phone';
    return sync.synced ? 'ready' : 'syncing-clocks';
  })();

  // A redeemed code cannot be redeemed again, so a dropped channel retries by reloading onto the remembered topic.
  const retry = useCallback(() => {
    if (claim.state === 'offline') void redeem();
    else globalThis.location?.reload();
  }, [claim.state, redeem]);

  return {
    gate,
    mySite: pairing.mySite,
    recording,
    paused,
    done,
    motionDenied: sensors.gate === 'denied',
    requestSensors: sensors.request,
    retry,
  };
}
