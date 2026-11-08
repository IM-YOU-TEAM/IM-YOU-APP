import { localDateTime, sessionId } from '@/lib/session';
import type { MotionType, Session } from '@/types';
import { FramingTracker, type FramingStatus } from './framing';
import { Joint, bodyInFrame, isInFrame, isVisible } from './landmarks';
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
 * Image points are 0–1 in the camera frame, y down. World points are meters from the
 * middle of the hips, y down. The phone sits to the person's side, so counting uses the
 * image (where the stride actually shows up) instead of world depth, which the model guesses.
 *
 * - A step is a peak in how far apart the two ankles look, divided by the length of the
 *   visible leg. From the side that peak is a heel strike; the feet pass each other mid-swing.
 *   A peak counts once the gap has risen and then fallen by the motion's swing, and peaks
 *   closer than 280 ms are dropped. A hidden far ankle still counts, because the model places it.
 * - A sit-to-stand rep is one rise from a bent knee (about 90°) to a straight one (about 170°).
 *   The angle is read from the image, where the side view is reliable. Seated is 118° or under,
 *   standing is 152° or over. A rise that stops short, or a sit that never reaches the chair,
 *   is not counted and gets a cue instead. Wrists in the lower quarter of the torso, or below
 *   the hips, on 3 or more frames of a rise mean the hands pushed off; the rep still counts
 *   and the cue says so. Standing frames are ignored, so resting arms between reps do not flag it.
 * - Cadence is steps per minute, or reps per minute for sit-to-stand.
 * - Symmetry needs both legs visible on at least half of the in-frame frames. Steps alternate
 *   feet, so every other step time belongs to the same leg; symmetry is the shorter leg's mean
 *   step time over the longer one's. A pause starts a new run, since the alternation is lost.
 *   For sit-to-stand it is how close the two knee angles stay.
 * - Steadiness is how even the gaps between steps (or reps) are: 100 when the gaps match,
 *   falling as their spread grows. Pauses are left out. It needs at least three gaps.
 * - In-frame rate is the share of frames showing the upper body, a hip, and a foot.
 * - Movement score is the average of the in-frame rate and whichever of symmetry and steadiness
 *   were measured. It summarizes this recording. It is not a clinical index.
 */

const STEP_SWING: Record<Exclude<MotionType, 'sitToStand'>, number> = {
  walking: 0.16,
  running: 0.18,
  stairs: 0.14,
};
const MIN_STEP_GAP_MS = 280;
const MIN_REP_GAP_MS = 800;
const SMOOTH_MS = 90;
const TRACK_LOST_MS = 500;
/** A gap this many times the median gap is a pause, not a step. */
const PAUSE_FACTOR = 1.6;
/** Ignore a 2D leg shorter than this share of the frame: the body is too small or the joints collapsed. */
const MIN_IMAGE_LEG = 0.1;

const SEATED_KNEE = 118;
const STANDING_KNEE = 152;
/** Risen at least this far without standing upright: a rise that stopped short. */
const PARTIAL_RISE_KNEE = 138;
/** Lowered at least this far from standing without reaching the chair: a sit that stopped short. */
const PARTIAL_SIT_KNEE = 138;
const ARMS_OFF_FRAMES = 3;

const BOTH_LEGS_FRACTION = 0.5;
const MIN_GAPS_FOR_STEADINESS = 3;
const LIVE_SIGNAL_WINDOW = 300;
const LIVE_EVENT_WINDOW = 30;
const MIN_RUN_GAPS_FOR_SYMMETRY = 4;

const SIDES = [
  [Joint.leftHip, Joint.leftKnee, Joint.leftAnkle],
  [Joint.rightHip, Joint.rightKnee, Joint.rightAnkle],
] as const;

/** Feedback on the latest sit-to-stand attempt. */
export type FormCue = { tone: 'good' | 'fix'; text: string };

export const FORM_CUES = {
  good: { tone: 'good', text: 'Good rep' },
  armsUsed: { tone: 'fix', text: 'Counted. Keep your arms crossed over your chest.' },
  standTaller: { tone: 'fix', text: 'Not counted. Stand all the way up.' },
  sitLower: { tone: 'fix', text: 'Not counted. Sit all the way down first.' },
} as const satisfies Record<string, FormCue>;

export type LiveReadout = {
  count: number;
  unit: 'steps' | 'reps';
  inFrame: boolean;
  seenPerson: boolean;
  framing: FramingStatus;
  movementState: MovementState;
  detectedMotion?: MotionType;
  captureStarted: boolean;
  /** Sit-to-stand only: how the latest attempt went. Null until there is one. */
  cue: FormCue | null;
};

export type RecordedSession = {
  session: Session;
  samples: PoseSample[];
};

type Strides = {
  smooth: number | null;
  lastT: number | null;
  /** True while the ankles are moving apart and we are waiting for the peak. */
  rising: boolean;
  extreme: number;
  extremeT: number;
  steps: number[];
};

type Rises = {
  phase: 'unknown' | 'seated' | 'standing';
  angle: number | null;
  lastT: number | null;
  /** Highest knee since last in the seat, or lowest since last standing. */
  extreme: number;
  armsOffFrames: number;
  reps: number[];
  durations: number[];
  riseStartedAt: number | null;
  goodReps: number;
  cue: FormCue | null;
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
  private readonly strides: Strides = { smooth: null, lastT: null, rising: false, extreme: 0, extremeT: 0, steps: [] };
  private readonly rises: Rises = {
    phase: 'unknown',
    angle: null,
    lastT: null,
    extreme: 0,
    armsOffFrames: 0,
    reps: [],
    durations: [],
    riseStartedAt: null,
    goodReps: 0,
    cue: null,
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

    if (this.lastSignalAt != null) this.activeElapsedMs += Math.max(0, frame.tMs - this.lastSignalAt);
    this.lastSignalAt = frame.tMs;
    this.signals.push(signalFromFrame(frame));
    if (this.motion === 'sitToStand') pushRise(this.rises, frame);
    else pushStride(this.strides, frame.tMs, ankleSeparation(frame), STEP_SWING[this.motion]);
    return this.readout();
  }

  readout(): LiveReadout {
    const cycleCount = this.count();
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
      cue: isReps(this.motion) ? this.rises.cue : null,
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
    const steady = steadiness(withoutPauses(gaps(reps ? this.rises.reps : this.strides.steps)));
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
    return isReps(this.motion) ? this.rises.reps.length : this.strides.steps.length;
  }

  private symmetry(): { measured: boolean; farLegHidden: boolean; value: number } {
    if (this.inFrame === 0) return { measured: false, farLegHidden: false, value: 0 };

    if (isReps(this.motion)) {
      const bothKnees = this.rises.kneeDiffCount > 0 && this.rises.kneeDiffCount / this.inFrame >= BOTH_LEGS_FRACTION;
      if (!bothKnees) return { measured: false, farLegHidden: true, value: 0 };
      const meanDiff = this.rises.kneeDiffSum / this.rises.kneeDiffCount;
      return { measured: true, farLegHidden: false, value: Math.round(100 * (1 - clamp(meanDiff / 60, 0, 1))) };
    }

    if (this.bothAnkles / this.inFrame < BOTH_LEGS_FRACTION) return { measured: false, farLegHidden: true, value: 0 };
    const value = stepSymmetry(this.strides.steps);
    return value == null ? { measured: false, farLegHidden: false, value: 0 } : { measured: true, farLegHidden: false, value };
  }

  private assessmentInput(durationSec: number, recentSignals = false): AssessmentInput {
    const stepTimes = recentSignals ? this.strides.steps.slice(-LIVE_EVENT_WINDOW) : this.strides.steps;
    const repTimes = recentSignals ? this.rises.reps.slice(-LIVE_EVENT_WINDOW) : this.rises.reps;
    const stepCount = stepTimes.length;
    const reps = repTimes.length;
    return {
      selected: this.motion,
      stepCount,
      stepCadence: durationSec > 0 ? Math.round((stepCount / durationSec) * 60) : 0,
      reps,
      repCadence: durationSec > 0 ? Math.round((reps / durationSec) * 60) : 0,
      riseDurationsMs: recentSignals ? this.rises.durations.slice(-LIVE_EVENT_WINDOW) : this.rises.durations,
      stepRegularity: steadiness(withoutPauses(gaps(stepTimes))),
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

// ---------- Steps ----------

/**
 * How far apart the ankles look, in units of the visible leg. Null when the feet are off
 * screen or the body is too small to trust. Uses the image, not world depth: from the side
 * the stride is along the camera's depth axis, which the model guesses badly.
 */
function ankleSeparation(frame: PoseFrame): number | null {
  const { image } = frame;
  if (!isInFrame(image, Joint.leftAnkle) || !isInFrame(image, Joint.rightAnkle)) return null;
  if (!isVisible(image, Joint.leftAnkle) && !isVisible(image, Joint.rightAnkle)) return null;
  const scale = imageLegLength(image);
  if (scale == null || scale < MIN_IMAGE_LEG) return null;
  const left = image[Joint.leftAnkle];
  const right = image[Joint.rightAnkle];
  return distance2(left, right) / scale;
}

function imageLegLength(image: Vec3[]): number | null {
  const lengths: number[] = [];
  for (const [hip, knee, ankle] of SIDES) {
    const length = imageChain(image, hip, knee, ankle);
    if (length != null) lengths.push(length);
  }
  return lengths.length > 0 ? mean(lengths) : null;
}

function pushStride(s: Strides, t: number, separation: number | null, swing: number): void {
  if (separation == null) return;
  if (s.smooth == null || s.lastT == null || t - s.lastT > TRACK_LOST_MS) {
    s.smooth = separation;
    s.lastT = t;
    s.rising = false;
    s.extreme = separation;
    s.extremeT = t;
    return;
  }
  s.smooth += (1 - Math.exp(-(t - s.lastT) / SMOOTH_MS)) * (separation - s.smooth);
  s.lastT = t;
  const d = s.smooth;

  if (s.rising) {
    if (d >= s.extreme) {
      s.extreme = d;
      s.extremeT = t;
    } else if (d <= s.extreme - swing) {
      const last = s.steps.at(-1);
      if (last == null || s.extremeT - last >= MIN_STEP_GAP_MS) s.steps.push(s.extremeT);
      s.rising = false;
      s.extreme = d;
      s.extremeT = t;
    }
  } else if (d <= s.extreme) {
    s.extreme = d;
    s.extremeT = t;
  } else if (d >= s.extreme + swing) {
    s.rising = true;
    s.extreme = d;
    s.extremeT = t;
  }
}

/** Shorter leg's mean step time over the longer one's, from runs of steps without a pause. */
function stepSymmetry(steps: number[]): number | null {
  let weighted = 0;
  let weight = 0;
  for (const run of runs(gaps(steps))) {
    if (run.length < MIN_RUN_GAPS_FOR_SYMMETRY) continue;
    const one = mean(run.filter((_, i) => i % 2 === 0));
    const other = mean(run.filter((_, i) => i % 2 === 1));
    const longer = Math.max(one, other);
    if (longer <= 0) continue;
    weighted += (Math.min(one, other) / longer) * run.length;
    weight += run.length;
  }
  return weight > 0 ? Math.round((100 * weighted) / weight) : null;
}

/** Splits gaps at pauses, which break the left-right alternation. */
function runs(intervals: number[]): number[][] {
  if (intervals.length === 0) return [];
  const limit = median(intervals) * PAUSE_FACTOR;
  const out: number[][] = [[]];
  for (const gap of intervals) {
    if (gap > limit) out.push([]);
    else out[out.length - 1].push(gap);
  }
  return out.filter((run) => run.length > 0);
}

// ---------- Sit-to-stand ----------

function pushRise(r: Rises, frame: PoseFrame): void {
  const left = kneeAngle(frame, Joint.leftHip, Joint.leftKnee, Joint.leftAnkle);
  const right = kneeAngle(frame, Joint.rightHip, Joint.rightKnee, Joint.rightAnkle);
  if (left != null && right != null) {
    r.kneeDiffSum += Math.abs(left - right);
    r.kneeDiffCount += 1;
  }

  const raw = sitUpright(frame);
  if (raw == null) return;
  const t = frame.tMs;
  if (r.angle == null || r.lastT == null || t - r.lastT > TRACK_LOST_MS) {
    r.angle = raw;
    r.lastT = t;
    r.phase = 'unknown';
    r.armsOffFrames = 0;
    r.extreme = raw;
    return;
  }
  r.angle += (1 - Math.exp(-(t - r.lastT) / SMOOTH_MS)) * (raw - r.angle);
  r.lastT = t;
  const angle = r.angle;

  if (r.phase === 'seated' && handsLow(frame)) r.armsOffFrames += 1;

  switch (r.phase) {
    case 'unknown':
      if (angle <= SEATED_KNEE) enterSeat(r, angle);
      else if (angle >= STANDING_KNEE) enterStanding(r, angle);
      return;
    case 'seated':
      if (angle > SEATED_KNEE && r.riseStartedAt == null) r.riseStartedAt = t;
      if (angle >= STANDING_KNEE) {
        const last = r.reps.at(-1);
        if (last == null || t - last >= MIN_REP_GAP_MS) {
          r.reps.push(t);
          if (r.riseStartedAt != null) r.durations.push(t - r.riseStartedAt);
          const usedArms = r.armsOffFrames >= ARMS_OFF_FRAMES;
          if (!usedArms) r.goodReps += 1;
          r.cue = usedArms ? FORM_CUES.armsUsed : FORM_CUES.good;
        }
        enterStanding(r, angle);
      } else if (angle <= SEATED_KNEE) {
        if (r.extreme >= PARTIAL_RISE_KNEE) r.cue = FORM_CUES.standTaller;
        enterSeat(r, angle);
      } else {
        r.extreme = Math.max(r.extreme, angle);
      }
      return;
    case 'standing':
      if (angle <= SEATED_KNEE) {
        enterSeat(r, angle);
      } else if (angle >= STANDING_KNEE) {
        if (r.extreme <= PARTIAL_SIT_KNEE) r.cue = FORM_CUES.sitLower;
        enterStanding(r, angle);
      } else {
        r.extreme = Math.min(r.extreme, angle);
      }
      return;
    default: {
      const unexpected: never = r.phase;
      return unexpected;
    }
  }
}

function enterSeat(r: Rises, angle: number): void {
  r.phase = 'seated';
  r.extreme = angle;
  r.armsOffFrames = 0;
  r.riseStartedAt = null;
}

function enterStanding(r: Rises, angle: number): void {
  r.phase = 'standing';
  r.extreme = angle;
  r.riseStartedAt = null;
}

/**
 * How upright the legs are, in degrees at the knee. 90 is seated, 180 is standing.
 * Prefers the side-view image; falls back to world points, then to hip height.
 */
function sitUpright(frame: PoseFrame): number | null {
  const angles: number[] = [];
  for (const [hip, knee, ankle] of SIDES) {
    const fromImage = imageKnee(frame.image, hip, knee, ankle);
    if (fromImage != null) {
      angles.push(fromImage);
      continue;
    }
    const fromWorld = worldKnee(frame, hip, knee, ankle);
    if (fromWorld != null) angles.push(fromWorld);
  }
  if (angles.length > 0) return mean(angles);
  const height = hipHeight(frame);
  if (height == null) return null;
  return 90 + 90 * clamp((height - 0.55) / 0.45, 0, 1);
}

function kneeAngle(frame: PoseFrame, hip: number, knee: number, ankle: number): number | null {
  return imageKnee(frame.image, hip, knee, ankle) ?? worldKnee(frame, hip, knee, ankle);
}

function imageKnee(image: Vec3[], hip: number, knee: number, ankle: number): number | null {
  const chain = imageChain(image, hip, knee, ankle);
  if (chain == null || chain < MIN_IMAGE_LEG) return null;
  if (!isVisible(image, hip) || !isVisible(image, knee) || !isVisible(image, ankle)) return null;
  return angleAt(image[hip], image[knee], image[ankle]);
}

function worldKnee(frame: PoseFrame, hip: number, knee: number, ankle: number): number | null {
  if (!isVisible(frame.image, hip) || !isVisible(frame.image, knee) || !isVisible(frame.image, ankle)) return null;
  const a = frame.world[hip];
  const b = frame.world[knee];
  const c = frame.world[ankle];
  if (!a || !b || !c) return null;
  return angleAt(a, b, c);
}

function imageChain(image: Vec3[], hip: number, knee: number, ankle: number): number | null {
  if (!isInFrame(image, hip) || !isInFrame(image, knee) || !isInFrame(image, ankle)) return null;
  return distance2(image[hip], image[knee]) + distance2(image[knee], image[ankle]);
}

/** Hip height above the ankle over 3D leg length, averaged over the legs in view. */
function hipHeight(frame: PoseFrame): number | null {
  const heights: number[] = [];
  for (const [hip, knee, ankle] of SIDES) {
    if (!isVisible(frame.image, hip) || !isVisible(frame.image, knee) || !isVisible(frame.image, ankle)) continue;
    const h = frame.world[hip];
    const k = frame.world[knee];
    const a = frame.world[ankle];
    if (!h || !k || !a) continue;
    const leg = distance(h, k) + distance(k, a);
    if (leg > 0) heights.push(Math.abs(a.y - h.y) / leg);
  }
  return heights.length > 0 ? mean(heights) : null;
}

/**
 * The camera-side wrist in the lower quarter of the torso, or below the hips.
 * The far wrist is often a guess, so a crossed-arm rep would look like a push-off if we trusted it.
 */
function handsLow(frame: PoseFrame): boolean {
  const { image, world } = frame;
  const shoulders: number[] = [];
  const hips: number[] = [];
  if (isVisible(image, Joint.leftShoulder)) shoulders.push(image[Joint.leftShoulder].y);
  if (isVisible(image, Joint.rightShoulder)) shoulders.push(image[Joint.rightShoulder].y);
  if (isVisible(image, Joint.leftHip)) hips.push(image[Joint.leftHip].y);
  if (isVisible(image, Joint.rightHip)) hips.push(image[Joint.rightHip].y);
  if (shoulders.length === 0 || hips.length === 0) return false;
  const torso = mean(hips) - mean(shoulders);
  if (torso < 0.06) return false;
  const low = mean(hips) - 0.25 * torso;
  const wrist = nearWrist(image, world);
  return wrist != null && image[wrist].y >= low;
}

/** The wrist closer to the camera. MediaPipe world z is negative toward the lens. */
function nearWrist(image: Vec3[], world: Vec3[]): number | null {
  const left = isVisible(image, Joint.leftWrist);
  const right = isVisible(image, Joint.rightWrist);
  if (left && right) {
    const zl = world[Joint.leftWrist]?.z;
    const zr = world[Joint.rightWrist]?.z;
    if (zl != null && zr != null && zl !== zr) return zl < zr ? Joint.leftWrist : Joint.rightWrist;
    return image[Joint.leftWrist].visibility >= image[Joint.rightWrist].visibility ? Joint.leftWrist : Joint.rightWrist;
  }
  if (left) return Joint.leftWrist;
  if (right) return Joint.rightWrist;
  return null;
}

/** Degrees at `b`, between points a-b-c. A straight knee is about 180. Uses x/y/z; 2D points leave z at 0. */
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

// ---------- Shared ----------

function gaps(times: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < times.length; i += 1) out.push(times[i] - times[i - 1]);
  return out;
}

function withoutPauses(intervals: number[]): number[] {
  if (intervals.length === 0) return intervals;
  const limit = median(intervals) * PAUSE_FACTOR;
  return intervals.filter((gap) => gap <= limit);
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

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function distance2(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
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

