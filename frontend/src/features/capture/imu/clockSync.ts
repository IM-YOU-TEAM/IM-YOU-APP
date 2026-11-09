/**
 * Puts the scanned phone's samples on the signed-in phone's clock.
 *
 * Each phone stamps samples with its own clock, and the model lines the thigh and
 * shin up by those stamps. Two iPhones' clocks can disagree by tens of
 * milliseconds, which shifts one leg against the other. The scanned phone pings
 * the signed-in phone over the pairing channel and, from each round trip,
 * estimates how far apart the clocks are (the NTP method). Round trips that
 * were slow are also the least symmetric, so the fastest recent one wins.
 */

/** Seconds, in the same clock domain as `ImuSample.t`. */
export function phoneClock(): number {
  const origin = typeof performance !== 'undefined' ? performance.timeOrigin : 0;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return (origin + now) / 1000;
}

/** Sent by the scanned phone. `t0` is its clock when sent. */
export type SyncPing = { id: number; t0: number };

/** Sent back by the signed-in phone. `t1` is its clock when it answered. */
export type SyncPong = { id: number; t0: number; t1: number };

/** One finished round trip. `t2` is the scanned phone's clock when the answer arrived. */
export type Exchange = { t0: number; t1: number; t2: number };

/** Round trips slower than this are too lopsided to trust. */
export const MAX_RTT_S = 1.5;

/** Exchanges to keep: about the last minute at the steady ping rate. */
export const KEEP = 30;

/** Seconds to add to the scanned phone's clock to get the signed-in phone's. */
export function offsetOf(exchange: Exchange): number {
  return exchange.t1 - (exchange.t0 + exchange.t2) / 2;
}

/** Best offset from recent exchanges: the one with the shortest round trip. Null before any usable one. */
export function estimateOffset(exchanges: Exchange[]): { offset: number; rtt: number } | null {
  let best: Exchange | null = null;
  for (const exchange of exchanges) {
    const rtt = exchange.t2 - exchange.t0;
    if (!(rtt >= 0 && rtt <= MAX_RTT_S)) continue;
    if (best == null || rtt < best.t2 - best.t0) best = exchange;
  }
  return best ? { offset: offsetOf(best), rtt: best.t2 - best.t0 } : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Null unless the payload off the network is a well-formed ping. */
export function asPing(payload: unknown): SyncPing | null {
  if (payload == null || typeof payload !== 'object') return null;
  const { id, t0 } = payload as Partial<SyncPing>;
  return isFiniteNumber(id) && isFiniteNumber(t0) ? { id, t0 } : null;
}

/** Null unless the payload off the network is a well-formed pong. */
export function asPong(payload: unknown): SyncPong | null {
  if (payload == null || typeof payload !== 'object') return null;
  const { id, t0, t1 } = payload as Partial<SyncPong>;
  return isFiniteNumber(id) && isFiniteNumber(t0) && isFiniteNumber(t1) ? { id, t0, t1 } : null;
}
