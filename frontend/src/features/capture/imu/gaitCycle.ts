import type { JointName, JointTrace } from '@/types';
import { displaySeries } from './jointTrace';

/**
 * Gait-cycle view of a sensor session, the way a gait lab report shows it: every stride cut out,
 * stretched to 0-100 % and averaged, next to a typical adult walking band.
 *
 * There is no foot sensor, so heel strike is estimated from the knee: the knee is close to straight
 * just before the foot lands, which is the lowest knee flexion between one swing peak and the next.
 */

/** 0, 2, 4 ... 100 % of the stride. */
export const CYCLE_POINTS = 51;
const MIN_STRIDE_S = 0.6;
const MAX_STRIDE_S = 2.5;
/** Less knee motion than this (degrees, 5th to 95th percentile) is not walking or stairs. */
const MIN_KNEE_SWING = 15;
/** A swing peak sits in the top 40 % of the knee's range. */
const PEAK_LEVEL = 0.6;
/** Heel strike is searched for in this share of the gap after a swing peak (terminal swing). */
const STRIKE_SEARCH = 0.45;
/** Strides much shorter or longer than the median are turns, stops or missed peaks. */
const STRIDE_TOLERANCE = 0.3;

const JOINTS: JointName[] = ['hip_flexion_r', 'knee_angle_r', 'ankle_angle_r'];

export type Stride = { start: number; end: number };

export type JointCycle = {
  /** Mean angle at each CYCLE_POINTS step, clinical signs (flexion and dorsiflexion positive). */
  mean: number[];
  /** Stride-to-stride standard deviation at each step. */
  sd: number[];
  /** Averages over strides of each stride's own peak, lowest point and range. */
  peak: number;
  low: number;
  range: number;
};

export type GaitCycle = {
  strides: number;
  /** Median stride time, seconds. */
  strideSec: number;
  /** Steps per minute (two steps per stride). */
  cadence: number;
  joints: Record<JointName, JointCycle>;
};

function percentile(sorted: number[], p: number): number {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[i];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function unbroken(series: (number | null)[], from: number, to: number): boolean {
  for (let i = from; i <= to; i += 1) if (series[i] == null) return false;
  return true;
}

/** Strides between estimated heel strikes, as sample indices into the trace. */
export function detectStrides(trace: JointTrace): Stride[] {
  const hz = trace.sampleHz;
  const knee = displaySeries(trace, 'knee_angle_r');
  const smooth = knee.map((v, i) => (v == null ? null : ((knee[i - 1] ?? v) + v + (knee[i + 1] ?? v)) / 3));

  const values = smooth.filter((v): v is number => v != null).sort((a, b) => a - b);
  if (values.length < hz * MIN_STRIDE_S * 2) return [];
  const lo = percentile(values, 0.05);
  const hi = percentile(values, 0.95);
  if (hi - lo < MIN_KNEE_SWING) return [];
  const level = lo + PEAK_LEVEL * (hi - lo);

  // Swing peaks: the big knee bend once per stride. Two close together are one peak.
  const peaks: number[] = [];
  for (let i = 1; i < smooth.length - 1; i += 1) {
    const [a, b, c] = [smooth[i - 1], smooth[i], smooth[i + 1]];
    if (a == null || b == null || c == null || b < level || b < a || b <= c) continue;
    const last = peaks[peaks.length - 1];
    if (last != null && i - last < MIN_STRIDE_S * hz * 0.8) {
      if (b > (smooth[last] ?? -Infinity)) peaks[peaks.length - 1] = i;
    } else {
      peaks.push(i);
    }
  }

  // One heel strike per gap between swing peaks: the straightest knee in terminal swing.
  const strikes: (number | null)[] = [];
  for (let k = 0; k < peaks.length - 1; k += 1) {
    const [p, q] = [peaks[k], peaks[k + 1]];
    const gap = (q - p) / hz;
    if (gap < MIN_STRIDE_S || gap > MAX_STRIDE_S || !unbroken(smooth, p, q)) {
      strikes.push(null);
      continue;
    }
    const end = p + Math.max(1, Math.round((q - p) * STRIKE_SEARCH));
    let best = p;
    for (let i = p; i <= end; i += 1) if ((smooth[i] as number) < (smooth[best] as number)) best = i;
    strikes.push(best);
  }

  const strides: Stride[] = [];
  for (let k = 0; k < strikes.length - 1; k += 1) {
    const [start, end] = [strikes[k], strikes[k + 1]];
    if (start == null || end == null) continue;
    const sec = (end - start) / hz;
    if (sec >= MIN_STRIDE_S && sec <= MAX_STRIDE_S && unbroken(knee, start, end)) strides.push({ start, end });
  }
  if (strides.length < 2) return strides;
  const typical = median(strides.map((s) => s.end - s.start));
  return strides.filter((s) => Math.abs(s.end - s.start - typical) <= typical * STRIDE_TOLERANCE);
}

/** One stride of a series stretched to CYCLE_POINTS. */
function resample(series: (number | null)[], { start, end }: Stride): number[] {
  return Array.from({ length: CYCLE_POINTS }, (_, k) => {
    const p = start + ((end - start) * k) / (CYCLE_POINTS - 1);
    const i = Math.min(Math.floor(p), end - 1);
    const a = series[i] as number;
    const b = series[i + 1] as number;
    return a + (b - a) * (p - i);
  });
}

const round1 = (v: number) => Math.round(v * 10) / 10 || 0;

/** The averaged stride, or null with fewer than two clean strides. */
export function gaitCycle(trace: JointTrace): GaitCycle | null {
  const strides = detectStrides(trace);
  if (strides.length < 2) return null;
  const n = strides.length;
  const joints = {} as Record<JointName, JointCycle>;
  for (const joint of JOINTS) {
    const series = displaySeries(trace, joint);
    const cycles = strides.map((s) => resample(series, s));
    const mean = Array.from({ length: CYCLE_POINTS }, (_, k) => cycles.reduce((sum, c) => sum + c[k], 0) / n);
    const sd = mean.map((m, k) => Math.sqrt(cycles.reduce((sum, c) => sum + (c[k] - m) ** 2, 0) / n));
    const peaks = cycles.map((c) => Math.max(...c));
    const lows = cycles.map((c) => Math.min(...c));
    const avg = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
    joints[joint] = {
      mean: mean.map(round1),
      sd: sd.map(round1),
      peak: round1(avg(peaks)),
      low: round1(avg(lows)),
      range: round1(avg(peaks.map((p, i) => p - lows[i]))),
    };
  }
  const strideSec = median(strides.map((s) => s.end - s.start)) / trace.sampleHz;
  return { strides: n, strideSec: Math.round(strideSec * 100) / 100, cadence: Math.round(120 / strideSec), joints };
}

/**
 * Typical adult level walking, every 5 % of the stride from heel strike, in degrees with flexion and
 * dorsiflexion positive. Approximate shape and spread read from published normal gait data
 * (Perry; Kadaba et al.), for orientation only, not a diagnostic norm.
 */
const TYPICAL_WALKING: Record<JointName, { mean: number[]; band: number }> = {
  hip_flexion_r: {
    mean: [30, 28, 24, 19, 14, 9, 4, 0, -4, -7, -9, -10, -6, 2, 12, 20, 26, 30, 32, 31, 30],
    band: 7,
  },
  knee_angle_r: {
    mean: [5, 12, 17, 19, 16, 11, 7, 5, 4, 6, 10, 20, 36, 52, 60, 58, 48, 32, 17, 7, 5],
    band: 6,
  },
  ankle_angle_r: {
    mean: [0, -5, -3, 2, 5, 7, 9, 10, 11, 12, 10, 3, -10, -16, -8, -2, 1, 2, 1, 0, 0],
    band: 5,
  },
};

/** The typical walking curve on the CYCLE_POINTS grid, with its band. */
export function typicalCycle(joint: JointName): { mean: number[]; band: number } {
  const { mean, band } = TYPICAL_WALKING[joint];
  const last = mean.length - 1;
  return {
    band,
    mean: Array.from({ length: CYCLE_POINTS }, (_, k) => {
      const p = (k / (CYCLE_POINTS - 1)) * last;
      const i = Math.min(Math.floor(p), last - 1);
      return mean[i] + (mean[i + 1] - mean[i]) * (p - i);
    }),
  };
}

/** Typical walking range of motion for a joint, from the typical curve. */
export function typicalRange(joint: JointName): number {
  const { mean } = TYPICAL_WALKING[joint];
  return Math.round(Math.max(...mean) - Math.min(...mean));
}
