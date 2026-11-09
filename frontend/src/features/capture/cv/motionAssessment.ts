import type { MotionType, SessionAssessmentMetric } from '@/types';
import { Joint, isVisible } from './landmarks';
import type { PoseFrame, Vec3 } from './poseTypes';

export type MovementState = 'waiting' | 'matching' | 'different';

export type MotionSignal = {
  tMs: number;
  hipX: number | null;
  hipY: number | null;
  kneeBend: number | null;
  trunkLean: number | null;
};

export type AssessmentInput = {
  selected: MotionType;
  stepCount: number;
  stepCadence: number;
  reps: number;
  repCadence: number;
  riseDurationsMs: number[];
  stepRegularity: number | null;
  signals: MotionSignal[];
};

export type MovementAssessment = {
  verified: boolean;
  detectedMotion?: MotionType;
  match: number;
  metrics: SessionAssessmentMetric[];
};

export function signalFromFrame(frame: PoseFrame): MotionSignal {
  const leftKnee = jointAngle(frame, Joint.leftHip, Joint.leftKnee, Joint.leftAnkle);
  const rightKnee = jointAngle(frame, Joint.rightHip, Joint.rightKnee, Joint.rightAnkle);
  const kneeAngles = [leftKnee, rightKnee].filter((value): value is number => value != null);
  const hip = imageMidpoint(frame.image, Joint.leftHip, Joint.rightHip);

  return {
    tMs: frame.tMs,
    hipX: hip?.x ?? null,
    hipY: hip?.y ?? null,
    kneeBend: kneeAngles.length > 0 ? 180 - mean(kneeAngles) : null,
    trunkLean: trunkLean(frame),
  };
}

export function assessMovement(input: AssessmentInput): MovementAssessment {
  const features = summarize(input);
  const scores: Record<MotionType, number> = {
    walking: walkingScore(input, features),
    running: runningScore(input, features),
    stairs: stairsScore(input, features),
    sitToStand: sitToStandScore(input, features),
  };
  const detectedMotion = detectMotion(input, features, scores);
  const match = scores[input.selected];
  return {
    verified: detectedMotion === input.selected && match >= 65,
    detectedMotion,
    match,
    metrics: metricsFor(input, features),
  };
}

function detectMotion(
  input: AssessmentInput,
  _features: FeatureSummary,
  scores: Record<MotionType, number>,
): MotionType | undefined {
  if (input.reps >= 1 && scores.sitToStand >= 65) return 'sitToStand';
  if (input.selected === 'sitToStand') {
    return scores.sitToStand >= 50 ? 'sitToStand' : gaitWinner(scores, 60);
  }
  if (input.stepCount < 2) return undefined;

  const selectedScore = scores[input.selected];
  const best = gaitWinner(scores, 0);
  // Keep the movement they chose unless another gait is clearly stronger. Walking bounce
  // used to look like stairs, which told people they had picked the wrong activity.
  if (selectedScore >= 55 && (best == null || scores[best] < selectedScore + 18)) {
    return input.selected;
  }
  return gaitWinner(scores, 60);
}

function gaitWinner(scores: Record<MotionType, number>, min: number): MotionType | undefined {
  const gaits: MotionType[] = ['walking', 'running', 'stairs'];
  const best = gaits.reduce((lead, motion) => (scores[motion] > scores[lead] ? motion : lead));
  return scores[best] >= min ? best : undefined;
}

export function movementState(input: AssessmentInput, assessment = assessMovement(input)): MovementState {
  if (input.stepCount < 2 && input.reps < 1) return 'waiting';
  if (assessment.detectedMotion === input.selected) return 'matching';
  return assessment.detectedMotion ? 'different' : 'waiting';
}

export function movementInstruction(state: MovementState, selected: MotionType, detected?: MotionType): string {
  switch (state) {
    case 'waiting':
      return startInstruction(selected);
    case 'matching':
      return `${motionLabel(selected)} looks right. Keep going at a comfortable pace.`;
    case 'different':
      return detected && detected !== selected
        ? `This looks more like ${motionLabel(detected).toLowerCase()} than ${motionLabel(selected).toLowerCase()}. Keep going if that is what you meant to do.`
        : `The camera has not confirmed ${motionLabel(selected).toLowerCase()} yet.`;
    default: {
      const unexpected: never = state;
      return unexpected;
    }
  }
}

export function motionLabel(motion: MotionType): string {
  switch (motion) {
    case 'walking':
      return 'Walking';
    case 'running':
      return 'Running';
    case 'stairs':
      return 'Stairs';
    case 'sitToStand':
      return 'Sit-to-stand';
    default: {
      const unexpected: never = motion;
      return unexpected;
    }
  }
}

type FeatureSummary = {
  horizontalRange: number | null;
  verticalRange: number | null;
  verticalTravel: number | null;
  verticalNet: number | null;
  peakKneeBend: number | null;
  averageTrunkLean: number | null;
  averageRiseTime: number | null;
};

function summarize(input: AssessmentInput): FeatureSummary {
  const hipX = input.signals.map((signal) => signal.hipX).filter((value): value is number => value != null);
  const hipY = input.signals.map((signal) => signal.hipY).filter((value): value is number => value != null);
  const kneeBends = input.signals.map((signal) => signal.kneeBend).filter((value): value is number => value != null);
  const trunkLeans = input.signals.map((signal) => signal.trunkLean).filter((value): value is number => value != null);
  return {
    horizontalRange: valueRange(hipX),
    verticalRange: valueRange(hipY),
    verticalTravel: rollingRange(hipY),
    verticalNet: netDisplacement(hipY),
    peakKneeBend: kneeBends.length > 0 ? Math.max(...kneeBends) : null,
    averageTrunkLean: trunkLeans.length > 0 ? mean(trunkLeans) : null,
    averageRiseTime: input.riseDurationsMs.length > 0 ? mean(input.riseDurationsMs) / 1000 : null,
  };
}

function walkingScore(input: AssessmentInput, features: FeatureSummary): number {
  let score = gaitEvidence(input.stepCount);
  if (input.stepCadence >= 40 && input.stepCadence < 140) score += 25;
  if (features.peakKneeBend != null && features.peakKneeBend >= 10 && features.peakKneeBend <= 70) score += 15;
  if (features.verticalNet != null && features.verticalNet < 0.08) score += 10;
  else if (features.verticalRange != null && features.verticalRange < 0.12) score += 10;
  if (input.reps === 0) score += 5;
  return clampScore(score);
}

function runningScore(input: AssessmentInput, features: FeatureSummary): number {
  let score = gaitEvidence(input.stepCount);
  if (input.stepCadence >= 140) score += 25;
  else if (input.stepCadence >= 115) score += 15;
  if (features.peakKneeBend != null && features.peakKneeBend >= 30) score += 15;
  if (features.verticalRange != null && features.verticalRange >= 0.02) score += 10;
  if (input.reps === 0) score += 5;
  return clampScore(score);
}

function stairsScore(input: AssessmentInput, features: FeatureSummary): number {
  let score = gaitEvidence(input.stepCount);
  if (features.verticalNet != null && features.verticalNet >= 0.08) score += 25;
  else if (features.verticalTravel != null && features.verticalTravel >= 0.12) score += 10;
  if (features.peakKneeBend != null && features.peakKneeBend >= 40) score += 20;
  if (input.stepCadence > 0 && input.stepCadence <= 160) score += 5;
  return clampScore(score);
}

function sitToStandScore(input: AssessmentInput, features: FeatureSummary): number {
  let score = Math.min(70, input.reps * 35);
  if (features.verticalRange != null && features.verticalRange >= 0.06) score += 20;
  if (features.horizontalRange != null && features.horizontalRange < 0.25) score += 10;
  return clampScore(score);
}

function gaitEvidence(stepCount: number): number {
  return Math.min(45, stepCount * 10);
}

function metricsFor(input: AssessmentInput, features: FeatureSummary): SessionAssessmentMetric[] {
  switch (input.selected) {
    case 'walking':
      return compactMetrics([
        percentMetric('step-regularity', 'Step regularity', input.stepRegularity),
        degreeMetric('peak-knee-bend', 'Peak knee bend', features.peakKneeBend),
        degreeMetric('trunk-lean', 'Average trunk lean', features.averageTrunkLean),
      ]);
    case 'running':
      return compactMetrics([
        percentMetric('step-regularity', 'Step regularity', input.stepRegularity),
        percentMetric('vertical-motion', 'Vertical motion in frame', scaledPercent(features.verticalRange)),
        degreeMetric('peak-knee-bend', 'Peak knee bend', features.peakKneeBend),
      ]);
    case 'stairs':
      return compactMetrics([
        percentMetric('vertical-travel', 'Vertical travel in frame', scaledPercent(features.verticalTravel)),
        degreeMetric('peak-knee-bend', 'Peak knee bend', features.peakKneeBend),
        percentMetric('step-regularity', 'Step regularity', input.stepRegularity),
      ]);
    case 'sitToStand':
      return compactMetrics([
        numberMetric('rise-time', 'Average rise time', features.averageRiseTime, 's', 1),
        degreeMetric('peak-knee-bend', 'Peak knee bend', features.peakKneeBend),
        degreeMetric('trunk-lean', 'Average trunk lean', features.averageTrunkLean),
      ]);
    default: {
      const unexpected: never = input.selected;
      return unexpected;
    }
  }
}

function startInstruction(motion: MotionType): string {
  switch (motion) {
    case 'walking':
      return 'Walk side-on across the frame to confirm the walking pattern.';
    case 'running':
      return 'Run side-on at a comfortable pace to confirm the running pattern.';
    case 'stairs':
      return 'Use the stairs side-on so the camera can confirm the step pattern.';
    case 'sitToStand':
      return 'Sit fully, then stand tall so the camera can confirm one repetition.';
    default: {
      const unexpected: never = motion;
      return unexpected;
    }
  }
}

function jointAngle(frame: PoseFrame, aIndex: number, bIndex: number, cIndex: number): number | null {
  if (!isVisible(frame.image, aIndex) || !isVisible(frame.image, bIndex) || !isVisible(frame.image, cIndex)) return null;
  const a = frame.world[aIndex];
  const b = frame.world[bIndex];
  const c = frame.world[cIndex];
  if (!a || !b || !c) return null;
  return angleAt(a, b, c);
}

function trunkLean(frame: PoseFrame): number | null {
  const shoulders = worldMidpoint(frame, Joint.leftShoulder, Joint.rightShoulder);
  const hips = worldMidpoint(frame, Joint.leftHip, Joint.rightHip);
  if (!shoulders || !hips) return null;
  const horizontal = Math.hypot(shoulders.x - hips.x, shoulders.z - hips.z);
  const vertical = Math.abs(shoulders.y - hips.y);
  if (vertical === 0) return null;
  return (Math.atan2(horizontal, vertical) * 180) / Math.PI;
}

function imageMidpoint(points: Vec3[], left: number, right: number): Vec3 | null {
  const visible = [left, right].map((index) => points[index]).filter((point): point is Vec3 => point != null && point.visibility >= 0.5);
  if (visible.length === 0) return null;
  return {
    x: mean(visible.map((point) => point.x)),
    y: mean(visible.map((point) => point.y)),
    z: mean(visible.map((point) => point.z)),
    visibility: mean(visible.map((point) => point.visibility)),
  };
}

function worldMidpoint(frame: PoseFrame, left: number, right: number): Vec3 | null {
  if (!isVisible(frame.image, left) || !isVisible(frame.image, right)) return null;
  const a = frame.world[left];
  const b = frame.world[right];
  if (!a || !b) return null;
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: 1,
  };
}

function angleAt(a: Vec3, b: Vec3, c: Vec3): number {
  const first = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const second = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = first.x * second.x + first.y * second.y + first.z * second.z;
  const firstLength = Math.hypot(first.x, first.y, first.z);
  const secondLength = Math.hypot(second.x, second.y, second.z);
  if (firstLength === 0 || secondLength === 0) return 180;
  const cosine = Math.min(1, Math.max(-1, dot / (firstLength * secondLength)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function percentMetric(key: string, label: string, value: number | null): SessionAssessmentMetric | null {
  return numberMetric(key, label, value, '%', 0);
}

function degreeMetric(key: string, label: string, value: number | null): SessionAssessmentMetric | null {
  return numberMetric(key, label, value, '°', 0);
}

function numberMetric(
  key: string,
  label: string,
  value: number | null,
  unit: string,
  decimals: number,
): SessionAssessmentMetric | null {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return { key, label, value: Math.round(value * factor) / factor, unit };
}

function compactMetrics(metrics: Array<SessionAssessmentMetric | null>): SessionAssessmentMetric[] {
  return metrics.filter((metric): metric is SessionAssessmentMetric => metric != null);
}

function scaledPercent(value: number | null): number | null {
  return value == null ? null : value * 100;
}

function valueRange(values: number[]): number | null {
  return values.length > 0 ? Math.max(...values) - Math.min(...values) : null;
}

/** Net rise or drop, so bouncing in place is not treated as climbing stairs. */
function netDisplacement(values: number[]): number | null {
  if (values.length < 5) return null;
  return Math.abs(values[values.length - 1] - values[0]);
}

/** Range after smoothing short up/down oscillations such as running bounce. */
function rollingRange(values: number[]): number | null {
  if (values.length === 0) return null;
  if (values.length < 3) return valueRange(values);
  const window = Math.min(15, Math.max(3, Math.floor(values.length / 5)));
  let sum = 0;
  for (let index = 0; index < window; index += 1) sum += values[index];
  let minimum = sum / window;
  let maximum = minimum;
  for (let index = window; index < values.length; index += 1) {
    sum += values[index] - values[index - window];
    const average = sum / window;
    minimum = Math.min(minimum, average);
    maximum = Math.max(maximum, average);
  }
  return maximum - minimum;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}
