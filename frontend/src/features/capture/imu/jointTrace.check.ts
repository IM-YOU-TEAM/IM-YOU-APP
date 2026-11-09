import type { JointName } from '@/types';
import {
  buildJointTrace,
  displaySeries,
  padTrace,
  seriesRange,
  sliderFromView,
  traceFromWindow,
  traceSeconds,
  viewBounds,
  viewFromSlider,
  visibleIndices,
} from './jointTrace';

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

// The view slider runs from 2 s to the recording's length and never past it.
const bounds = viewBounds(152);
assert(bounds.min === 2 && bounds.max === 152, 'view spans 2 s to the whole recording');
assert(viewFromSlider(0, bounds) === 2, 'slider start is 2 s');
assert(viewFromSlider(1, bounds) === 152, 'slider end is the whole recording');
assert(viewFromSlider(5, bounds) === 152 && viewFromSlider(-1, bounds) === 2, 'slider is capped at both ends');
assert(Math.abs(viewFromSlider(sliderFromView(30, bounds), bounds) - 30) < 1e-9, 'slider and view round-trip');
assert(viewBounds(1.5).min === 1.5 && viewFromSlider(0, viewBounds(1.5)) === 1.5, 'a short recording is never stretched');
assert(sliderFromView(9, viewBounds(1.5)) === 1, 'nothing to zoom on a short recording');

const [first, last] = visibleIndices(3041, 20, 10, 5);
assert(first === 199 && last === 301, `10 to 15 s at 20 Hz with margin, got ${first} to ${last}`);
const [head, tail] = visibleIndices(50, 20, 0, 5);
assert(head === 0 && tail === 49, 'clamped to the trace');

// A 9 s recording where the model only covered 3 to 5.5 s still spans all 9 s.
const spanning = buildJointTrace([window(3, () => 12)], 20, 9)!;
assert(spanning.startSec === 0, 'spans from Start');
assert(traceSeconds(spanning) === 9, `spans to Stop, got ${traceSeconds(spanning)} s`);
assert(spanning.angles.hip_flexion_r[0] === null && spanning.angles.hip_flexion_r[80] === 12, 'gap then the scored stretch');

// A short timeline saved earlier is drawn on the full recording length too.
const short = buildJointTrace([window(3, () => 7)], 20)!;
const padded = padTrace(short, 9);
assert(padded.startSec === 0 && traceSeconds(padded) === 9, 'padded to the recording');
// The fixture stores the knee with the model's sign (flexion negative), so 7 reads as -7 here.
assert(padded.angles.knee_angle_r[60] === -7 && padded.angles.knee_angle_r[0] === null, 'values stay at their time');
assert(padTrace(spanning, 9) === spanning, 'already full length is left alone');
console.log('joint trace ok');

// ---- Gait cycle: strides cut at the estimated heel strike and averaged ----
{
  const { gaitCycle, typicalCycle } = await import('./gaitCycle');
  const hz = 20;
  const strideSec = 1.1;
  const seconds = 30;
  const n = Math.round(seconds * hz);
  // A walk built from the typical curves, started mid-stride, with a little noise.
  const at = (joint: JointName, t: number) => {
    const curve = typicalCycle(joint).mean;
    const phase = (((t + 0.37) / strideSec) % 1) * (curve.length - 1);
    const i = Math.min(Math.floor(phase), curve.length - 2);
    return curve[i] + (curve[i + 1] - curve[i]) * (phase - i) + Math.sin(t * 13.7) * 0.8;
  };
  const series = (joint: JointName, sign: number) => Array.from({ length: n }, (_, k) => sign * at(joint, k / hz));
  const walk = {
    sampleHz: hz,
    startSec: 0,
    // The model's knee is negative in flexion; the chart flips it.
    angles: { hip_flexion_r: series('hip_flexion_r', 1), knee_angle_r: series('knee_angle_r', -1), ankle_angle_r: series('ankle_angle_r', 1) },
  };
  const cycle = gaitCycle(walk);
  assert(cycle != null, 'a 30 s walk gives an average stride');
  assert(cycle!.strides >= 22, `most strides are found, got ${cycle!.strides}`);
  assert(Math.abs(cycle!.strideSec - strideSec) < 0.06, `stride time ${cycle!.strideSec}`);
  assert(Math.abs(cycle!.cadence - 109) <= 4, `cadence ${cycle!.cadence}`);
  const knee = cycle!.joints.knee_angle_r;
  assert(knee.peak > 55 && knee.peak < 65, `knee peak ${knee.peak}`);
  assert(knee.mean[0] < 12, `stride starts near heel strike with a straight knee, got ${knee.mean[0]}`);
  const peakAt = knee.mean.indexOf(Math.max(...knee.mean)) / (knee.mean.length - 1);
  assert(peakAt > 0.62 && peakAt < 0.8, `swing peak sits at ~70 % of the stride, got ${peakAt}`);
  assert(Math.abs(cycle!.joints.hip_flexion_r.range - 42) < 5, `hip range ${cycle!.joints.hip_flexion_r.range}`);

  // Standing still: no strides, no average.
  const still = { sampleHz: hz, startSec: 0, angles: { hip_flexion_r: new Array(n).fill(2), knee_angle_r: new Array(n).fill(-3), ankle_angle_r: new Array(n).fill(1) } };
  assert(gaitCycle(still) == null, 'standing still has no average stride');
  console.log('gait cycle ok');
}
