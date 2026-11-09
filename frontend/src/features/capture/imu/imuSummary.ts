import { LOCAL_PATIENT_ID } from '@/lib/data';
import { localDateTime, sessionId } from '@/lib/session';
import type { MotionType, Session, SessionAssessmentMetric } from '@/types';
import { ACTIVITY_TO_MOTION, type JointName, type LiveWindow, type ModelActivity } from './liveTypes';

const JOINT_LABELS: Record<JointName, string> = {
  hip_flexion_r: 'Hip flexion',
  knee_angle_r: 'Knee angle',
  ankle_angle_r: 'Ankle angle',
};

const JOINTS: JointName[] = ['hip_flexion_r', 'knee_angle_r', 'ankle_angle_r'];
const SAVED_POINTS = 100;
/** Right-knee cycles outside this range are not treated as steps. */
const MIN_CADENCE = 40;
const MAX_CADENCE = 200;
/** A joint has to move at least this many degrees or the oscillation is noise. */
const MIN_CYCLE_AMP = 8;

export type ImuTally = {
  accepted: LiveWindow[];
  total: number;
};

function thinTo(series: number[], points: number): number[] {
  const step = series.length <= points ? 1 : (series.length - 1) / (points - 1);
  const count = Math.min(series.length, points);
  return Array.from({ length: count }, (_, i) => Math.round(series[Math.round(i * step)] * 10) / 10);
}

/** The accepted window the model was surest about, from the session's main activity when it has one. */
export function bestWindow(accepted: LiveWindow[], dominant: ModelActivity | undefined): LiveWindow | undefined {
  const main = accepted.filter((w) => w.activity === dominant);
  const pool = main.length > 0 ? main : accepted;
  return pool.reduce<LiveWindow | undefined>((best, w) => (best == null || w.confidence > best.confidence ? w : best), undefined);
}

export function savedAngles(scored: LiveWindow | undefined): Record<JointName, number[]> | undefined {
  if (!scored) return undefined;
  const { hip_flexion_r: hip, knee_angle_r: knee, ankle_angle_r: ankle } = scored.angles;
  if (!(hip?.length > 1 && knee?.length > 1 && ankle?.length > 1)) return undefined;
  return {
    hip_flexion_r: thinTo(hip, SAVED_POINTS),
    knee_angle_r: thinTo(knee, SAVED_POINTS),
    ankle_angle_r: thinTo(ankle, SAVED_POINTS),
  };
}

/**
 * Steps per minute from the right-knee curve. One knee peaks once per gait cycle, so two steps.
 * Null when the curve is too short or too flat to count.
 */
export function cadenceFromKnee(series: number[], windowSec: number): number | null {
  if (series.length < 12 || windowSec <= 0) return null;
  const cycles = countCycles(series);
  if (cycles < 2) return null;
  const cadence = Math.round(((cycles * 2) / windowSec) * 60);
  if (cadence < MIN_CADENCE || cadence > MAX_CADENCE) return null;
  return cadence;
}

function countCycles(series: number[]): number {
  const smooth = series.map((_, i) => {
    const a = series[Math.max(0, i - 1)];
    const b = series[i];
    const c = series[Math.min(series.length - 1, i + 1)];
    return (a + b + c) / 3;
  });
  const min = Math.min(...smooth);
  const max = Math.max(...smooth);
  const amp = max - min;
  if (amp < MIN_CYCLE_AMP) return 0;
  return Math.max(countExtrema(smooth, min + amp * 0.55, 'peak'), countExtrema(smooth, max - amp * 0.55, 'trough'));
}

function countExtrema(series: number[], threshold: number, kind: 'peak' | 'trough'): number {
  let count = 0;
  let armed = true;
  for (let i = 1; i < series.length - 1; i += 1) {
    const extreme =
      kind === 'peak'
        ? series[i] >= series[i - 1] && series[i] > series[i + 1] && series[i] >= threshold
        : series[i] <= series[i - 1] && series[i] < series[i + 1] && series[i] <= threshold;
    if (extreme && armed) {
      count += 1;
      armed = false;
    }
    if (kind === 'peak' ? series[i] < threshold : series[i] > threshold) armed = true;
  }
  return count;
}

function cadenceFromWindows(windows: LiveWindow[]): number | null {
  const rates: number[] = [];
  for (const window of windows) {
    const knee = window.angles.knee_angle_r;
    if (!knee) continue;
    const duration = Math.max(0.5, window.end_s - window.start_s);
    const rate = cadenceFromKnee(knee, duration);
    if (rate != null) rates.push(rate);
  }
  if (rates.length === 0) return null;
  rates.sort((a, b) => a - b);
  return rates[Math.floor(rates.length / 2)];
}

function jointRanges(accepted: LiveWindow[]): SessionAssessmentMetric[] {
  const metrics: SessionAssessmentMetric[] = [];
  for (const joint of JOINTS) {
    const ranges = accepted.map((window) => window.summary[joint]).filter(Boolean);
    if (ranges.length === 0) continue;
    const span = ranges.reduce((sum, range) => sum + (range.max - range.min), 0) / ranges.length;
    metrics.push({ key: joint, label: `${JOINT_LABELS[joint]} range`, value: Math.round(span * 10) / 10, unit: '°' });
  }
  return metrics;
}

/** Turns scored sensor windows into the session Results shows. Only measured values are filled in. */
export function summariseImu(tally: ImuTally, motion: MotionType, durationSec: number): Session {
  const counts = new Map<ModelActivity, number>();
  for (const window of tally.accepted) {
    const activity = window.activity as ModelActivity;
    counts.set(activity, (counts.get(activity) ?? 0) + 1);
  }
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const matching = tally.accepted.filter((window) => ACTIVITY_TO_MOTION[window.activity as ModelActivity] === motion);
  const detected = dominant ? ACTIVITY_TO_MOTION[dominant] ?? undefined : undefined;
  const cadence = cadenceFromWindows(matching.length > 0 ? matching : tally.accepted);
  const match = tally.accepted.length > 0 ? Math.round((100 * matching.length) / tally.accepted.length) : 0;
  const confidence =
    matching.length > 0 ? matching.reduce((sum, window) => sum + window.confidence, 0) / matching.length : 0;
  const jointAngles = savedAngles(bestWindow(tally.accepted, dominant));

  return {
    id: sessionId('imu'),
    patientId: LOCAL_PATIENT_ID,
    date: localDateTime(),
    motion,
    method: 'imu',
    durationSec,
    gaitScore: Math.round(confidence * 100),
    cadence: cadence ?? 0,
    cadenceMeasured: cadence != null,
    symmetry: 0,
    symmetryMeasured: false,
    movementVerified: detected === motion,
    detectedMotion: detected,
    movementMatch: match,
    assessmentMetrics: jointRanges(tally.accepted),
    ...(jointAngles ? { jointAngles } : {}),
  };
}
