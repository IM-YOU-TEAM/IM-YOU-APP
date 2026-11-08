import { localDateTime, sessionId } from '@/lib/session';
import type { MotionType, Session } from '@/types';
import { FramingTracker, type FramingStatus } from './framing';
import { Joint, bodyInFrame, isVisible } from './landmarks';
import {
  assessMovement,
  movementState as movementStateFor,
  signalFromFrame,
  type AssessmentInput,
  type MotionSignal,
  type MovementState,
} from './motionAssessment';
import type { PoseFrame, PoseSample, Vec3 } from './poseTypes';

/**
 * Session score, written down so the number on Results is explainable.
 *
 * - Cadence is steps per minute from heel strikes, or reps per minute for sit-to-stand.
 *   A heel strike is a local minimum of the heel's world y (y increases upward, origin at
 *   the hips) after the foot has risen at least 4 cm. Strikes closer than 250 ms are dropped.
 *   A sit-to-stand rep is one rise: the visible knee goes from bent (under 140°) to straight
 *   (over 160°), at least 600 ms after the previous rise.
 * - Symmetry is how similar left and right timing is, and only when both legs stay visible
 *   on at least half of the in-frame frames. For walking, running, and stairs that is the
 *   ratio of mean left and right stride times. For sit-to-stand it is how close the two knee
 *   angles stay. When the far leg is hidden, symmetry is left out of the score.
 * - Steadiness is how even the gaps between steps (or reps) are: 100 when the gaps match,
 *   falling as their spread grows. It is left out until there are at least three gaps.
 * - In-frame rate is the share of frames where the head, both hips, and one foot are visible.
 * - Movement score is the average of the in-frame rate and whichever of symmetry and steadiness
 *   were measured. It summarizes this recording. It is not a clinical index.
 */

const MIN_HEEL_DROP_M = 0.04;
const MIN_STRIKE_GAP_MS = 250;
const KNEE_BENT_DEG = 140;
const KNEE_STRAIGHT_DEG = 160;
const MIN_REP_GAP_MS = 600;
const BOTH_LEGS_FRACTION = 0.5;
const MIN_GAPS_FOR_STEADINESS = 3;
const LIVE_SIGNAL_WINDOW = 300;
const LIVE_EVENT_WINDOW = 30;

export type LiveReadout = {
  count: number;
  unit: 'steps' | 'reps';
  inFrame: boolean;
  seenPerson: boolean;
  framing: FramingStatus;
  movementState: MovementState;
  detectedMotion?: MotionType;
  captureStarted: boolean;
};

export type RecordedSession = {
  session: Session;
  samples: PoseSample[];
};

type Foot = {
  prev2: number | null;
  prev: number | null;
  prevT: number | null;
  swingHigh: number;
  /** True after the foot has risen and started back down, until the next strike. */
  armed: boolean;
  lastStrike: number | null;
  strikes: number[];
};

type Rise = {
  phase: 'unknown' | 'bent' | 'straight';
  bentAt: number | null;
  lastRep: number | null;
  reps: number[];
  durations: number[];
  kneeDiffSum: number;
  kneeDiffCount: number;
};

export class PoseAccumulator {
  readonly motion: MotionType;
  private total = 0;
  private inFrame = 0;
  private bothAnkles = 0;
  private latestInFrame = false;
  private person = false;
  private readonly samples: PoseSample[] = [];
  private readonly signals: MotionSignal[] = [];
  private readonly framingTracker = new FramingTracker();
  private framing: FramingStatus = 'no-person';
  private captureStarted = false;
  private assessedCycleCount = -1;
  private liveMovementState: MovementState = 'waiting';
  private liveDetectedMotion: MotionType | undefined;
  private activeElapsedMs = 0;
  private lastSignalAt: number | null = null;
  private readonly left = emptyFoot();
  private readonly right = emptyFoot();
  private readonly rise: Rise = {
    phase: 'unknown',
    bentAt: null,
    lastRep: null,
    reps: [],
    durations: [],
    kneeDiffSum: 0,
    kneeDiffCount: 0,
  };

  constructor(motion: MotionType) {
    this.motion = motion;
  }

  push(frame: PoseFrame | null): LiveReadout {
    if (frame == null) {
      this.latestInFrame = false;
      this.framing = this.framingTracker.push(null, this.motion);
      if (this.captureStarted) this.total += 1;
      return this.readout();
    }

    this.person = true;
    this.framing = this.framingTracker.push(frame.image, this.motion);
    if (this.framing === 'ready') this.captureStarted = true;
    if (!this.captureStarted) return this.readout();

    this.total += 1;
    this.samples.push({ tMs: frame.tMs, world: frame.world.map((point) => ({ ...point })) });

    const inside = bodyInFrame(frame.image);
    this.latestInFrame = inside;
    if (!inside) return this.readout();

    this.inFrame += 1;
    if (isVisible(frame.image, Joint.leftAnkle) && isVisible(frame.image, Joint.rightAnkle)) this.bothAnkles += 1;

    const leftKnee = kneeAngle(frame, Joint.leftHip, Joint.leftKnee, Joint.leftAnkle);
    const rightKnee = kneeAngle(frame, Joint.rightHip, Joint.rightKnee, Joint.rightAnkle);
    pushKnees(this.rise, frame.tMs, leftKnee, rightKnee);
    pushFoot(this.left, frame.tMs, footHeight(frame, Joint.leftHeel, Joint.leftAnkle));
    pushFoot(this.right, frame.tMs, footHeight(frame, Joint.rightHeel, Joint.rightAnkle));
    if (this.lastSignalAt != null) this.activeElapsedMs += Math.max(0, frame.tMs - this.lastSignalAt);
    this.lastSignalAt = frame.tMs;
    this.signals.push(signalFromFrame(frame));
    return this.readout();
  }

  readout(): LiveReadout {
    const cycleCount = this.left.strikes.length + this.right.strikes.length + this.rise.reps.length;
    if (cycleCount !== this.assessedCycleCount) {
      const input = this.assessmentInput(this.elapsedSeconds(), true);
      const assessment = assessMovement(input);
      this.liveMovementState = movementStateFor(input, assessment);
      this.liveDetectedMotion = assessment.detectedMotion;
      this.assessedCycleCount = cycleCount;
    }
    return {
      count: this.count(),
      unit: isReps(this.motion) ? 'reps' : 'steps',
      inFrame: this.latestInFrame,
      seenPerson: this.person,
      framing: this.framing,
      movementState: this.liveMovementState,
      detectedMotion: this.liveDetectedMotion,
      captureStarted: this.captureStarted,
    };
  }

  setPaused(paused: boolean): void {
    if (paused) this.lastSignalAt = null;
  }

  /** Null when the camera never delivered a complete body pose, so we do not invent a score. */
  finish(durationSec: number, patientId: string): RecordedSession | null {
    if (this.samples.length === 0 || this.inFrame === 0) return null;

    const reps = isReps(this.motion);
    const count = this.count();
    const cadence = durationSec > 0 ? Math.round((count / durationSec) * 60) : 0;
    const inFrameRate = Math.round((100 * this.inFrame) / this.total);
    const symmetry = this.symmetry();
    const steady = steadiness(reps ? gaps(this.rise.reps) : [...gaps(this.left.strikes), ...gaps(this.right.strikes)]);
    const assessment = assessMovement(this.assessmentInput(durationSec));

    const parts = [inFrameRate];
    if (symmetry.measured) parts.push(symmetry.value);
    if (steady != null) parts.push(steady);
    const gaitScore = Math.round(parts.reduce((sum, part) => sum + part, 0) / parts.length);

    const session: Session = {
      id: sessionId('cv'),
      patientId,
      date: localDateTime(),
      motion: this.motion,
      method: 'cv',
      durationSec,
      gaitScore: clamp(gaitScore, 0, 100),
      cadence,
      symmetry: symmetry.measured ? symmetry.value : 0,
      symmetryMeasured: symmetry.measured,
      farLegHidden: symmetry.farLegHidden,
      ...(reps ? { reps: count } : { stepCount: count }),
      movementVerified: assessment.verified,
      detectedMotion: assessment.detectedMotion,
      movementMatch: assessment.match,
      assessmentMetrics: assessment.metrics,
    };
    return { session, samples: this.samples };
  }

  private count(): number {
    return isReps(this.motion) ? this.rise.reps.length : this.left.strikes.length + this.right.strikes.length;
  }

  private symmetry(): { measured: boolean; farLegHidden: boolean; value: number } {
    if (this.inFrame === 0) return { measured: false, farLegHidden: false, value: 0 };

    if (isReps(this.motion)) {
      const bothKnees = this.rise.kneeDiffCount / this.inFrame >= BOTH_LEGS_FRACTION && this.rise.kneeDiffCount > 0;
      if (!bothKnees) return { measured: false, farLegHidden: true, value: 0 };
      const meanDiff = this.rise.kneeDiffSum / this.rise.kneeDiffCount;
      return { measured: true, farLegHidden: false, value: Math.round(100 * (1 - clamp(meanDiff / 60, 0, 1))) };
    }

    const bothLegs = this.bothAnkles / this.inFrame >= BOTH_LEGS_FRACTION;
    if (!bothLegs) return { measured: false, farLegHidden: true, value: 0 };
    const leftGaps = gaps(this.left.strikes);
    const rightGaps = gaps(this.right.strikes);
    if (leftGaps.length === 0 || rightGaps.length === 0) return { measured: false, farLegHidden: false, value: 0 };
    const leftMean = mean(leftGaps);
    const rightMean = mean(rightGaps);
    const peak = Math.max(leftMean, rightMean);
    if (peak <= 0) return { measured: false, farLegHidden: false, value: 0 };
    return { measured: true, farLegHidden: false, value: Math.round((100 * Math.min(leftMean, rightMean)) / peak) };
  }

  private assessmentInput(durationSec: number, recentSignals = false): AssessmentInput {
    const stepCount = this.left.strikes.length + this.right.strikes.length;
    const reps = this.rise.reps.length;
    const leftStrikes = recentSignals ? this.left.strikes.slice(-LIVE_EVENT_WINDOW) : this.left.strikes;
    const rightStrikes = recentSignals ? this.right.strikes.slice(-LIVE_EVENT_WINDOW) : this.right.strikes;
    return {
      selected: this.motion,
      stepCount,
      stepCadence: durationSec > 0 ? Math.round((stepCount / durationSec) * 60) : 0,
      reps,
      repCadence: durationSec > 0 ? Math.round((reps / durationSec) * 60) : 0,
      riseDurationsMs: recentSignals ? this.rise.durations.slice(-LIVE_EVENT_WINDOW) : this.rise.durations,
      stepRegularity: steadiness([...gaps(leftStrikes), ...gaps(rightStrikes)]),
      signals: recentSignals ? this.signals.slice(-LIVE_SIGNAL_WINDOW) : this.signals,
    };
  }

  private elapsedSeconds(): number {
    return this.activeElapsedMs / 1000;
  }
}

export function createPoseAccumulator(motion: MotionType): PoseAccumulator {
  return new PoseAccumulator(motion);
}

function emptyFoot(): Foot {
  return { prev2: null, prev: null, prevT: null, swingHigh: Number.NEGATIVE_INFINITY, armed: false, lastStrike: null, strikes: [] };
}

/** Heel (or ankle) world y, or null when that foot is not visible. */
function footHeight(frame: PoseFrame, heel: number, ankle: number): number | null {
  if (isVisible(frame.image, heel)) return frame.world[heel]?.y ?? null;
  if (isVisible(frame.image, ankle)) return frame.world[ankle]?.y ?? null;
  return null;
}

function pushFoot(foot: Foot, t: number, y: number | null): void {
  if (y == null) {
    foot.prev2 = null;
    foot.prev = null;
    foot.prevT = null;
    foot.armed = false;
    foot.swingHigh = Number.NEGATIVE_INFINITY;
    return;
  }
  // A strike is the bottom of a swing: the foot rose, then stopped going down.
  // `armed` stays false while the foot is rising, so the first step of a swing is not a strike.
  if (foot.prev != null && foot.prev2 != null && foot.prevT != null) {
    const stoppedFalling = foot.prev <= foot.prev2 && foot.prev <= y;
    const drop = foot.swingHigh - foot.prev;
    const gapOk = foot.lastStrike == null || foot.prevT - foot.lastStrike >= MIN_STRIKE_GAP_MS;
    if (foot.armed && stoppedFalling && drop >= MIN_HEEL_DROP_M && gapOk) {
      foot.strikes.push(foot.prevT);
      foot.lastStrike = foot.prevT;
      foot.armed = false;
      foot.swingHigh = foot.prev;
    }
  }
  if (y > foot.swingHigh) foot.swingHigh = y;
  if (foot.swingHigh - y >= MIN_HEEL_DROP_M) foot.armed = true;
  foot.prev2 = foot.prev;
  foot.prev = y;
  foot.prevT = t;
}

function kneeAngle(frame: PoseFrame, hip: number, knee: number, ankle: number): number | null {
  if (!isVisible(frame.image, hip) || !isVisible(frame.image, knee) || !isVisible(frame.image, ankle)) return null;
  const a = frame.world[hip];
  const b = frame.world[knee];
  const c = frame.world[ankle];
  if (!a || !b || !c) return null;
  return angleAt(a, b, c);
}

/** Degrees at `b`, between points a-b-c. A straight knee is about 180. */
function angleAt(a: Vec3, b: Vec3, c: Vec3): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v1z = a.z - b.z;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const v2z = c.z - b.z;
  const dot = v1x * v2x + v1y * v2y + v1z * v2z;
  const m1 = Math.hypot(v1x, v1y, v1z);
  const m2 = Math.hypot(v2x, v2y, v2z);
  if (m1 === 0 || m2 === 0) return 180;
  const cos = clamp(dot / (m1 * m2), -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

function pushKnees(rise: Rise, t: number, left: number | null, right: number | null): void {
  if (left != null && right != null) {
    rise.kneeDiffSum += Math.abs(left - right);
    rise.kneeDiffCount += 1;
  }
  const angles = [left, right].filter((angle): angle is number => angle != null);
  if (angles.length === 0) return;
  const angle = mean(angles);
  if (angle < KNEE_BENT_DEG) {
    if (rise.phase !== 'bent') rise.bentAt = t;
    rise.phase = 'bent';
    return;
  }
  if (angle > KNEE_STRAIGHT_DEG && rise.phase === 'bent') {
    if (rise.lastRep == null || t - rise.lastRep >= MIN_REP_GAP_MS) {
      rise.reps.push(t);
      if (rise.bentAt != null) rise.durations.push(t - rise.bentAt);
      rise.lastRep = t;
    }
    rise.bentAt = null;
    rise.phase = 'straight';
  }
}

function gaps(times: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < times.length; i += 1) out.push(times[i] - times[i - 1]);
  return out;
}

/** 100 when every gap matches the mean. Null until there are enough gaps to judge. */
function steadiness(intervals: number[]): number | null {
  if (intervals.length < MIN_GAPS_FOR_STEADINESS) return null;
  const avg = mean(intervals);
  if (avg <= 0) return null;
  const variance = intervals.reduce((sum, gap) => sum + (gap - avg) ** 2, 0) / intervals.length;
  const cv = Math.sqrt(variance) / avg;
  return Math.round(clamp(100 * (1 - cv), 0, 100));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function isReps(motion: MotionType): boolean {
  switch (motion) {
    case 'sitToStand':
      return true;
    case 'walking':
    case 'running':
    case 'stairs':
      return false;
    default: {
      const unexpected: never = motion;
      return unexpected;
    }
  }
}

