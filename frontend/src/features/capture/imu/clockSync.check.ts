import { asPing, asPong, estimateOffset, MAX_RTT_S, offsetOf, type Exchange } from './clockSync';

function assert(ok: boolean, message: string): void {
  if (!ok) throw new Error(message);
}

const near = (a: number, b: number, tolerance: number) => Math.abs(a - b) <= tolerance;

// The scanned phone's clock runs 0.087 s behind the signed-in phone's.
const TRUE_OFFSET = 0.087;

/** One round trip with the given one-way delays (seconds), starting at scanned-phone time t0. */
function exchange(t0: number, out: number, back: number): Exchange {
  const t1 = t0 + out + TRUE_OFFSET; // signed-in phone's clock when it answers
  const t2 = t0 + out + back; // scanned phone's clock when the answer lands
  return { t0, t1, t2 };
}

// Symmetric delays recover the offset exactly.
assert(near(offsetOf(exchange(100, 0.04, 0.04)), TRUE_OFFSET, 1e-9), 'symmetric round trip is exact');

// Lopsided delays are off by half the asymmetry; the fastest round trip keeps that smallest.
const noisy = [
  exchange(100, 0.30, 0.05),
  exchange(101, 0.06, 0.25),
  exchange(102, 0.045, 0.035),
  exchange(103, 0.20, 0.20),
];
const best = estimateOffset(noisy);
assert(best != null, 'an estimate exists');
assert(near(best!.rtt, 0.08, 1e-9), 'picks the shortest round trip');
assert(near(best!.offset, TRUE_OFFSET, 0.005 + 1e-9), 'within half the asymmetry of the best round trip');

// Round trips that are too slow, or run backwards, are ignored.
assert(estimateOffset([exchange(100, MAX_RTT_S, 0.5)]) === null, 'slow round trip rejected');
assert(estimateOffset([{ t0: 10, t1: 10, t2: 9 }]) === null, 'negative round trip rejected');
assert(estimateOffset([]) === null, 'nothing to go on');

// Payloads come off the network.
assert(asPing({ id: 1, t0: 5 })?.t0 === 5, 'ping parsed');
assert(asPing({ id: '1', t0: 5 }) === null, 'bad ping id rejected');
assert(asPong({ id: 1, t0: 5, t1: Number.NaN }) === null, 'non-finite pong rejected');
assert(asPong(null) === null, 'null pong rejected');

console.log('clockSync checks passed');
