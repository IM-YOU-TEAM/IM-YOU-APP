import { useCallback, useEffect, useRef, useState } from 'react';
import { asPing, asPong, estimateOffset, KEEP, phoneClock, type Exchange, type SyncPong } from './clockSync';
import { EVENTS } from './protocol';
import type { Pairing } from './usePairing';

/** A quick burst on joining, so the offset is known before anyone taps Start. */
const BURST = 10;
const BURST_MS = 200;
/** Then one ping every few seconds to follow clock drift over a long walk. */
const STEADY_MS = 2000;
/** Usable exchanges needed before this phone's samples are trusted. */
const MIN_EXCHANGES = 3;

/**
 * The scanned phone's side: pings the signed-in phone while `active` and keeps the
 * offset between their clocks. `listen` must receive the pairing's broadcasts.
 */
export function useClockSync(active: boolean, publish: Pairing['publish']) {
  const exchanges = useRef<Exchange[]>([]);
  const offsetRef = useRef<number | null>(null);
  const publishRef = useRef(publish);
  publishRef.current = publish;
  const [synced, setSynced] = useState(false);

  const listen = useCallback((event: string, payload: unknown) => {
    if (event !== EVENTS.syncPong) return;
    const pong = asPong(payload);
    if (!pong) return;
    exchanges.current.push({ t0: pong.t0, t1: pong.t1, t2: phoneClock() });
    if (exchanges.current.length > KEEP) exchanges.current.shift();
    const estimate = estimateOffset(exchanges.current);
    if (!estimate) return;
    offsetRef.current = estimate.offset;
    if (exchanges.current.length >= MIN_EXCHANGES) setSynced(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    let id = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ping = () => {
      id += 1;
      publishRef.current(EVENTS.syncPing, { id, t0: phoneClock() });
      timer = setTimeout(ping, id < BURST ? BURST_MS : STEADY_MS);
    };
    ping();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [active]);

  /** Seconds to add to this phone's sample times, or null until enough round trips are in. */
  const offset = useCallback(() => (exchanges.current.length >= MIN_EXCHANGES ? offsetRef.current : null), []);

  return { synced, offset, listen };
}

/** The signed-in phone's side: answer a ping with its own clock. */
export function answerSyncPing(event: string, payload: unknown, publish: Pairing['publish']): void {
  if (event !== EVENTS.syncPing) return;
  const ping = asPing(payload);
  if (!ping) return;
  const pong: SyncPong = { id: ping.id, t0: ping.t0, t1: phoneClock() };
  publish(EVENTS.syncPong, pong);
}
