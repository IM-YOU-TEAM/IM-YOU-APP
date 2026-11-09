import type { JointName, JointTrace } from '@/types';
import type { LiveWindow } from './liveTypes';

/** Saved timeline rate. A walking stride (~1.1 s) still gets about 22 points. */
export const TRACE_HZ = 20;
/** One hour at TRACE_HZ, the database's cap. */
const MAX_POINTS = 72000;
/** Older sessions kept only this one window. */
const LEGACY_WINDOW_S = 2.5;

const JOINTS: JointName[] = ['hip_flexion_r', 'knee_angle_r', 'ankle_angle_r'];

/**
 * How each joint reads to a clinician. The model keeps OpenSim signs, where knee flexion is
 * negative, so the knee is flipped. Hip flexion and ankle dorsiflexion are already positive.
 */
export const JOINT_DISPLAY: { joint: JointName; label: string; sign: 1 | -1 }[] = [
  { joint: 'hip_flexion_r', label: 'Hip flexion', sign: 1 },
  { joint: 'knee_angle_r', label: 'Knee flexion', sign: -1 },
  { joint: 'ankle_angle_r', label: 'Ankle dorsiflexion', sign: 1 },
];

type ScoredWindow = Pick<LiveWindow, 'start_s' | 'end_s' | 'angles'>;

const round1 = (v: number) => Math.round(v * 10) / 10 || 0;
/** Window times are rounded to the millisecond; this keeps an edge sample inside its window. */
const EPS = 1e-6;

/** Linear read between samples at a fractional index, or null outside the series. */
function sampleAt(series: number[], position: number): number | null {
  const last = series.length - 1;
  const p = Math.min(Math.max(position, 0), last);
  const i = Math.min(Math.floor(p), last - 1);
  const a = series[i];
  const b = series[i + 1];
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a + (b - a) * (p - i);
}

/**
 * Every scored window on one timeline. The model scores 2.5 s every 0.5 s, so most moments are
 * predicted by several windows; those predictions are averaged. Moments no window covered stay null.
 */
export function buildJointTrace(windows: ScoredWindow[], hz = TRACE_HZ, recordedSec?: number): JointTrace | undefined {
  const scored = windows.filter((w) => w.end_s > w.start_s && JOINTS.every((j) => (w.angles[j]?.length ?? 0) > 1));
  if (scored.length === 0) return undefined;

  // Each point is a moment on the session clock, read off every window that spans it.
  const firstOf = (w: ScoredWindow) => Math.ceil(w.start_s * hz - EPS);
  const lastOf = (w: ScoredWindow) => Math.floor(w.end_s * hz + EPS);
  // Given the recording's length, the timeline spans all of it, from Start to Stop, with gaps where nothing was scored.
  const span = recordedSec != null && recordedSec > 0;
  const firstBin = Math.min(...scored.map(firstOf), ...(span ? [0] : []));
  const lastBin = Math.max(...scored.map(lastOf), ...(span ? [Math.floor(recordedSec * hz)] : []));
  const length = Math.min(lastBin - firstBin + 1, MAX_POINTS);
  if (length < 2) return undefined;

  const angles = {} as Record<JointName, (number | null)[]>;
  for (const joint of JOINTS) {
    const sums = new Float64Array(length);
    const counts = new Uint32Array(length);
    for (const w of scored) {
      const series = w.angles[joint];
      const dt = (w.end_s - w.start_s) / (series.length - 1);
      for (let bin = firstOf(w); bin <= lastOf(w); bin += 1) {
        const i = bin - firstBin;
        if (i < 0 || i >= length) continue;
        const value = sampleAt(series, (bin / hz - w.start_s) / dt);
        if (value == null) continue;
        sums[i] += value;
        counts[i] += 1;
      }
    }
    angles[joint] = Array.from(sums, (sum, i) => (counts[i] > 0 ? round1(sum / counts[i]) : null));
  }
  return { sampleHz: hz, startSec: Math.round((firstBin / hz) * 100) / 100, angles };
}

/**
 * The same timeline stretched to cover the whole recording, from 0 s to `recordedSec`, with empty
 * stretches where nothing was scored. Sessions saved before timelines spanned the recording only
 * covered the scored part, so this lets every chart show the full length of the movement.
 */
export function padTrace(trace: JointTrace, recordedSec: number): JointTrace {
  const hz = trace.sampleHz;
  const current = trace.angles.hip_flexion_r.length;
  const lead = Math.max(0, Math.round(trace.startSec * hz));
  const total = Math.min(Math.max(lead + current, Math.floor(recordedSec * hz) + 1), MAX_POINTS);
  if (lead === 0 && total === current) return trace;
  const tail = Math.max(0, total - lead - current);
  const pad = (series: (number | null)[]) => [
    ...new Array<null>(lead).fill(null),
    ...series,
    ...new Array<null>(tail).fill(null),
  ].slice(0, total);
  const angles = {} as Record<JointName, (number | null)[]>;
  for (const joint of JOINTS) angles[joint] = pad(trace.angles[joint]);
  return { sampleHz: hz, startSec: 0, angles };
}

/** A pre-timeline session's single saved window, shown the same way. */
export function traceFromWindow(angles: Record<JointName, number[]>): JointTrace {
  const points = angles.hip_flexion_r.length;
  return { sampleHz: (points - 1) / LEGACY_WINDOW_S, startSec: 0, angles };
}

/** A joint's values with clinical signs (knee flexion positive). */
export function displaySeries(trace: JointTrace, joint: JointName): (number | null)[] {
  const sign = JOINT_DISPLAY.find((d) => d.joint === joint)?.sign ?? 1;
  return trace.angles[joint].map((v) => (v == null ? null : sign * v || 0));
}

/** Lowest and highest value, ignoring gaps. Null when nothing was scored. */
export function seriesRange(values: (number | null)[]): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v == null) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return min <= max ? { min, max } : null;
}

/** Seconds the trace spans. */
export function traceSeconds(trace: JointTrace): number {
  return (trace.angles.hip_flexion_r.length - 1) / trace.sampleHz;
}

/** Shortest view window: about two walking strides. */
export const MIN_VIEW_S = 2;

export type ViewBounds = { min: number; max: number };

/** The view can be as short as MIN_VIEW_S and as long as the recording. */
export function viewBounds(seconds: number): ViewBounds {
  return { min: Math.min(MIN_VIEW_S, seconds), max: seconds };
}

/**
 * Slider position (0 to 1) to view length in seconds. Logarithmic, so the short end, where strides
 * become readable, gets as much travel as the long end.
 */
export function viewFromSlider(fraction: number, { min, max }: ViewBounds): number {
  const f = Math.min(Math.max(fraction, 0), 1);
  if (max <= min) return max;
  return Math.min(max, min * (max / min) ** f);
}

export function sliderFromView(view: number, { min, max }: ViewBounds): number {
  if (max <= min) return 1;
  const v = Math.min(Math.max(view, min), max);
  return Math.log(v / min) / Math.log(max / min);
}

/** First and last sample index inside [from, from + view] seconds, one sample of margin each side. */
export function visibleIndices(length: number, hz: number, from: number, view: number): [number, number] {
  const first = Math.max(0, Math.floor(from * hz) - 1);
  const last = Math.min(length - 1, Math.ceil((from + view) * hz) + 1);
  return [first, last];
}
