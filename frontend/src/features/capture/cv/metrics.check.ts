import type { MotionType } from '@/types';
import { framingStatus } from './framing';
import { LANDMARK_COUNT } from './landmarks';
import { createPoseAccumulator } from './metrics';
import { assessMovement, type AssessmentInput, type MotionSignal } from './motionAssessment';
import type { PoseFrame, Vec3 } from './poseTypes';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function blank(): Vec3[] {
  return Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0, y: 0, z: 0, visibility: 1 }));
}

function hidden(): Vec3[] {
  return Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
}

/** Heel height for one stride per second. y is up, so the planted foot sits lower. */
function heelY(tMs: number, phaseMs: number): number {
  const p = ((tMs + phaseMs) % 1000) / 1000;
  if (p < 0.55) return -0.9;
  const u = (p - 0.55) / 0.45;
  return -0.9 + 0.22 * Math.sin(Math.PI * u);
}

function gaitFrame(tMs: number, hideRight: boolean): PoseFrame {
  const image = framingImage(0.12, 0.82, 0.5);
  const world = blank();
  world[0] = { x: 0, y: 0.6, z: 0, visibility: 1 };
  const leftY = heelY(tMs, 0);
  const rightY = heelY(tMs, 500);
  world[29] = { x: 0.1, y: leftY, z: 0, visibility: 1 };
  world[27] = { x: 0.1, y: leftY, z: 0, visibility: 1 };
  world[30] = { x: -0.1, y: rightY, z: 0, visibility: 1 };
  world[28] = { x: -0.1, y: rightY, z: 0, visibility: 1 };
  if (hideRight) {
    image[28] = { ...image[28], visibility: 0 };
    image[30] = { ...image[30], visibility: 0 };
  }
  return { tMs, image, world };
}

function checkGait(): void {
  const acc = createPoseAccumulator('walking');
  for (let t = 0; t <= 4000; t += 50) acc.push(gaitFrame(t, false));
  const done = acc.finish(4, 'local');
  assert(done != null, 'walking recording should produce a session');
  if (!done) return;
  const { session, samples } = done;
  assert(session.stepCount != null && session.stepCount >= 6 && session.stepCount <= 8, `expected about 7 steps, got ${session.stepCount}`);
  assert(session.cadence >= 90 && session.cadence <= 120, `cadence ${session.cadence} out of range`);
  assert(session.symmetryMeasured === true, 'both legs were visible, symmetry should be measured');
  assert(session.farLegHidden === false, 'both legs were visible');
  assert(session.symmetry >= 90, `symmetry ${session.symmetry} should be high for matched strides`);
  assert(session.gaitScore >= 90, `movement score ${session.gaitScore} should reflect a clean recording`);
  assert(samples.length === 78, `expected capture after four stable framing frames, got ${samples.length} samples`);
  assert(samples[0].world.length === LANDMARK_COUNT, 'each sample keeps all 33 world joints');
}

function checkHiddenLeg(): void {
  const acc = createPoseAccumulator('stairs');
  for (let t = 0; t <= 4000; t += 50) acc.push(gaitFrame(t, true));
  const done = acc.finish(4, 'local');
  assert(done != null, 'hidden-leg recording should produce a session');
  if (!done) return;
  assert(done.session.symmetryMeasured === false, 'the far leg was hidden, so symmetry is not compared');
  assert(done.session.farLegHidden === true, 'the results screen should say the far leg was hidden');
  assert((done.session.stepCount ?? 0) >= 2, 'the visible leg should still count steps');
  assert((done.session.stepCount ?? 0) < 6, 'the hidden leg should not invent steps');
}

/** Extra knee offset of 0.5 m is about a right angle. 0 keeps hip, knee, and ankle in a straight line. */
function sitFrame(tMs: number): PoseFrame {
  const cycle = tMs % 4000;
  let bend = 0.5;
  if (cycle < 1000) bend = 0.5;
  else if (cycle < 2000) bend = 0.5 * (1 - (cycle - 1000) / 1000);
  else if (cycle < 3000) bend = 0;
  else bend = 0.5 * ((cycle - 3000) / 1000);

  const image = framingImage(0.12, 0.82, 0.5);
  const world = blank();
  world[0] = { x: 0, y: 0.5, z: 0, visibility: 1 };
  world[23] = { x: 0.1, y: 0, z: 0, visibility: 1 };
  world[24] = { x: -0.1, y: 0, z: 0, visibility: 1 };
  world[25] = { x: 0.1 + bend, y: -0.5, z: 0, visibility: 1 };
  world[26] = { x: -0.1 - bend, y: -0.5, z: 0, visibility: 1 };
  world[27] = { x: 0.1, y: -1, z: 0, visibility: 1 };
  world[28] = { x: -0.1, y: -1, z: 0, visibility: 1 };
  return { tMs, image, world };
}

function checkSitToStand(): void {
  const acc = createPoseAccumulator('sitToStand');
  for (let t = 0; t <= 8000; t += 50) acc.push(sitFrame(t));
  const done = acc.finish(8, 'local');
  assert(done != null, 'sit-to-stand recording should produce a session');
  if (!done) return;
  assert(done.session.reps === 2, `expected 2 reps, got ${done.session.reps}`);
  assert(done.session.cadence === 15, `expected 15 reps/min, got ${done.session.cadence}`);
  assert(done.session.symmetryMeasured === true, 'both knees were visible');
  assert(done.session.symmetry >= 90, `knee symmetry ${done.session.symmetry} should be high`);
}

function checkNoFrames(): void {
  const acc = createPoseAccumulator('running');
  for (let t = 0; t < 20; t += 1) acc.push(null);
  assert(acc.finish(3, 'local') == null, 'no complete body pose means no session and no invented score');
}

function framingImage(top: number, bottom: number, centerX: number): Vec3[] {
  const image = hidden();
  const place = (index: number, x: number, y: number) => {
    image[index] = { x, y, z: 0, visibility: 1 };
  };
  place(0, centerX, top);
  place(11, centerX - 0.05, top + (bottom - top) * 0.25);
  place(12, centerX + 0.05, top + (bottom - top) * 0.25);
  place(23, centerX - 0.04, top + (bottom - top) * 0.5);
  place(24, centerX + 0.04, top + (bottom - top) * 0.5);
  place(25, centerX - 0.04, top + (bottom - top) * 0.72);
  place(26, centerX + 0.04, top + (bottom - top) * 0.72);
  place(27, centerX - 0.04, bottom);
  place(28, centerX + 0.04, bottom);
  return image;
}

function checkFramingGuidance(): void {
  assert(framingStatus(hidden(), 'walking') === 'no-person', 'an empty frame should ask the person to enter');
  assert(framingStatus(framingImage(0.12, 0.82, 0.5), 'walking') === 'ready', 'a centred full body should be ready');
  assert(framingStatus(framingImage(0.36, 0.58, 0.5), 'walking') === 'move-closer', 'a small body should move closer');
  assert(framingStatus(framingImage(0.02, 0.96, 0.5), 'walking') === 'move-farther', 'a clipped body should move farther');
  assert(framingStatus(framingImage(0.12, 0.82, 0.1), 'walking') === 'aim-left', 'a person on the left should move the camera left');
  assert(framingStatus(framingImage(0.12, 0.82, 0.9), 'walking') === 'aim-right', 'a person on the right should move the camera right');
  const missingHips = framingImage(0.12, 0.82, 0.5);
  missingHips[23] = { ...missingHips[23], visibility: 0 };
  missingHips[24] = { ...missingHips[24], visibility: 0 };
  assert(framingStatus(missingHips, 'walking') === 'move-farther', 'capture should not start without visible hips');
}

function assessmentInput(
  selected: MotionType,
  {
    steps,
    cadence,
    reps = 0,
    verticalRange,
    horizontalRange = 0.1,
    kneeBend,
    riseDurationsMs = [],
    verticalTrend = false,
  }: {
    steps: number;
    cadence: number;
    reps?: number;
    verticalRange: number;
    horizontalRange?: number;
    kneeBend: number;
    riseDurationsMs?: number[];
    verticalTrend?: boolean;
  },
): AssessmentInput {
  const verticalOffsets = verticalTrend ? [-0.5, -0.25, 0, 0.25, 0.5] : [-0.5, 0.5, -0.5, 0.5, 0];
  const signals: MotionSignal[] = verticalOffsets.map((offset, index) => ({
    tMs: index * 250,
    hipX: 0.5 - horizontalRange / 2 + (horizontalRange * index) / (verticalOffsets.length - 1),
    hipY: 0.5 + verticalRange * offset,
    kneeBend,
    trunkLean: index % 2 === 0 ? 8 : 10,
  }));
  return {
    selected,
    stepCount: steps,
    stepCadence: cadence,
    reps,
    repCadence: reps > 0 ? cadence : 0,
    riseDurationsMs,
    stepRegularity: 90,
    signals,
  };
}

function checkMovementAssessment(): void {
  const walking = assessMovement(
    assessmentInput('walking', { steps: 8, cadence: 100, verticalRange: 0.03, horizontalRange: 0.3, kneeBend: 20 }),
  );
  assert(walking.verified && walking.detectedMotion === 'walking', 'walking should use the walking pattern');
  assert(walking.metrics.some((metric) => metric.key === 'step-regularity'), 'walking should report step regularity');

  const running = assessMovement(
    assessmentInput('running', { steps: 12, cadence: 170, verticalRange: 0.04, kneeBend: 50 }),
  );
  assert(running.verified && running.detectedMotion === 'running', 'running should require a faster gait pattern');
  assert(running.metrics.some((metric) => metric.key === 'vertical-motion'), 'running should report vertical motion');
  const springyRunning = assessMovement(
    assessmentInput('running', { steps: 12, cadence: 170, verticalRange: 0.08, kneeBend: 50 }),
  );
  assert(springyRunning.verified && springyRunning.detectedMotion === 'running', 'fast running should not be classified as stairs');
  const slowRunning = assessMovement(
    assessmentInput('running', { steps: 10, cadence: 120, verticalRange: 0.04, kneeBend: 32 }),
  );
  assert(slowRunning.verified && slowRunning.detectedMotion === 'running', 'knee bend should distinguish a slower run from walking');

  const stairs = assessMovement(
    assessmentInput('stairs', { steps: 7, cadence: 90, verticalRange: 0.16, kneeBend: 65, verticalTrend: true }),
  );
  assert(stairs.verified && stairs.detectedMotion === 'stairs', 'stairs should require vertical travel and knee bend');
  assert(stairs.metrics.some((metric) => metric.key === 'vertical-travel'), 'stairs should report vertical travel');
  const fasterStairs = assessMovement(
    assessmentInput('stairs', { steps: 10, cadence: 150, verticalRange: 0.16, kneeBend: 65, verticalTrend: true }),
  );
  assert(fasterStairs.verified && fasterStairs.detectedMotion === 'stairs', 'vertical stair travel should not be classified as running');

  const sitToStand = assessMovement(
    assessmentInput('sitToStand', {
      steps: 0,
      cadence: 15,
      reps: 3,
      verticalRange: 0.12,
      kneeBend: 75,
      riseDurationsMs: [1100, 1200, 1000],
    }),
  );
  assert(sitToStand.verified && sitToStand.detectedMotion === 'sitToStand', 'sit-to-stand should require complete rises');
  assert(sitToStand.metrics.some((metric) => metric.key === 'rise-time'), 'sit-to-stand should report rise time');

  const mismatch = assessMovement(
    assessmentInput('stairs', { steps: 8, cadence: 100, verticalRange: 0.02, horizontalRange: 0.3, kneeBend: 15 }),
  );
  assert(!mismatch.verified && mismatch.detectedMotion === 'walking', 'a flat walking pattern should not pass as stairs');
  const wrongSelection = assessMovement(
    assessmentInput('sitToStand', { steps: 8, cadence: 100, verticalRange: 0.02, horizontalRange: 0.3, kneeBend: 15 }),
  );
  assert(wrongSelection.detectedMotion === 'walking', 'detected movement should not depend on the selected movement counter');
}

checkGait();
checkHiddenLeg();
checkSitToStand();
checkNoFrames();
checkFramingGuidance();
checkMovementAssessment();
console.log('pose metrics ok');
