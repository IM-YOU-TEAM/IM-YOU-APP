import type { JointName } from '@/types';
import { buildJointTrace, displaySeries, seriesRange, traceFromWindow, traceSeconds } from './jointTrace';

function assert(ok: boolean, message: string): void {
  if (!ok) throw new Error(message);
}

const HZ = 100;
const LENGTH = 250;

/** A model window like the live service sends: 250 samples at 100 Hz from `start`. */
function window(start: number, angle: (t: number) => number) {
  const series = Array.from({ length: LENGTH }, (_, k) => angle(start + k / HZ));
  const angles: Record<JointName, number[]> = { hip_flexion_r: series, knee_angle_r: series.map((v) => -v), ankle_angle_r: series };
  return { start_s: start, end_s: start + (LENGTH - 1) / HZ, angles };
}

// Overlapping windows that agree must give back the same curve, over the whole span.
const truth = (t: number) => 30 * Math.sin(2 * Math.PI * t);
const windows = Array.from({ length: 9 }, (_, i) => window(i * 0.5, truth));
const trace = buildJointTrace(windows, 20);
assert(trace != null, 'windows make a trace');
const seconds = traceSeconds(trace!);
assert(Math.abs(seconds - 6.5) < 0.06, `covers 0 to 6.5 s, got ${seconds}`);
assert(trace!.startSec === 0, 'starts with the first window');
const hip = trace!.angles.hip_flexion_r;
let worst = 0;
hip.forEach((v, i) => {
  if (v != null) worst = Math.max(worst, Math.abs(v - truth(i / 20)));
});
// Only the 0.1° rounding remains, including where windows start and end.
assert(worst <= 0.051, `averaged overlaps track the true curve, worst error ${worst}`);

// Disagreeing overlaps are averaged.
const flat = buildJointTrace([window(0, () => 10), window(0.5, () => 20)], 20)!;
assert(flat.angles.hip_flexion_r[0] === 10, 'one window alone keeps its value');
assert(flat.angles.hip_flexion_r[20] === 15, 'two overlapping windows average');

// A pause leaves a gap, not a made-up line.
const gapped = buildJointTrace([window(0, () => 5), window(10, () => 5)], 20)!;
assert(gapped.angles.hip_flexion_r[100] === null, 'unscored time stays empty');
assert(gapped.angles.hip_flexion_r[0] === 5 && gapped.angles.hip_flexion_r.at(-1) === 5, 'both ends kept');

// A late first window keeps its place on the session clock.
assert(buildJointTrace([window(3, () => 1)], 20)!.startSec === 3, 'start offset kept');

assert(buildJointTrace([], 20) === undefined, 'no windows, no trace');

// Clinical signs: knee flexion positive, hip and ankle unchanged.
const raw = { sampleHz: 20, startSec: 0, angles: { hip_flexion_r: [12, null], knee_angle_r: [-61, 0], ankle_angle_r: [-5, 3] } };
assert(displaySeries(raw, 'knee_angle_r').join() === '61,0', 'knee flipped so flexion is positive, no -0');
assert(displaySeries(raw, 'hip_flexion_r').join() === '12,', 'hip unchanged, gaps kept');
assert(displaySeries(raw, 'ankle_angle_r').join() === '-5,3', 'ankle unchanged');

const range = seriesRange([null, 4, 61, null, 20]);
assert(range?.min === 4 && range.max === 61, 'range ignores gaps');
assert(seriesRange([null]) === null, 'no values, no range');

const legacy = traceFromWindow({ hip_flexion_r: Array(100).fill(0), knee_angle_r: Array(100).fill(0), ankle_angle_r: Array(100).fill(0) });
assert(Math.abs(traceSeconds(legacy) - 2.5) < 1e-9, 'an old single window spans 2.5 s');
console.log('joint trace ok');
