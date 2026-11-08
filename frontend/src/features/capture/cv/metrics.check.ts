import type { MotionType } from '@/types';
import { framingStatus } from './framing';
import { Joint, LANDMARK_COUNT } from './landmarks';
import { createPoseAccumulator, FORM_CUES } from './metrics';
import { assessMovement, type AssessmentInput, type MotionSignal } from './motionAssessment';
import type { PoseFrame, Vec3 } from './poseTypes';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function blank(): Vec3[] {
  return Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
}

function hidden(): Vec3[] {
  return blank();
}

function place(points: Vec3[], index: number, x: number, y: number, visibility = 1): void {
  points[index] = { x, y, z: 0, visibility };
}

function copyWorldFromImage(image: Vec3[]): Vec3[] {
  return image.map((point) => ({ ...point }));
}

/** Side-view walk in place. One gait cycle is 1000 ms and two steps. */
function gaitFrame(tMs: number, hideRight: boolean, swing = 0.16): PoseFrame {
  const image = blank();
  const leftSwing = Math.sin((2 * Math.PI * tMs) / 1000);
  const rightSwing = Math.sin((2 * Math.PI * (tMs + 500)) / 1000);
  const hipY = 0.5;
  const ankleY = 0.86;
  const leftX = 0.5 + swing * leftSwing;
  const rightX = 0.5 + swing * rightSwing;

  place(image, Joint.nose, 0.5, 0.16);
  place(image, Joint.leftShoulder, 0.5, 0.28);
  place(image, Joint.rightShoulder, 0.5, 0.28);
  place(image, Joint.leftHip, 0.5, hipY);
  place(image, Joint.rightHip, 0.5, hipY);
  place(image, Joint.leftKnee, (0.5 + leftX) / 2, (hipY + ankleY) / 2);
  place(image, Joint.rightKnee, (0.5 + rightX) / 2, (hipY + ankleY) / 2);
  place(image, Joint.leftAnkle, leftX, ankleY);
  place(image, Joint.rightAnkle, rightX, ankleY);
  if (hideRight) {
    image[Joint.rightAnkle] = { ...image[Joint.rightAnkle], visibility: 0 };
    image[Joint.rightKnee] = { ...image[Joint.rightKnee], visibility: 0 };
  }

  return { tMs, image, world: copyWorldFromImage(image) };
}

type SitOpts = { upright: number; hands: 'chest' | 'knees' };

/** Side-view chair stand. `upright` 0 is seated, 1 is standing. */
function sitFrame(tMs: number, opts: SitOpts): PoseFrame {
  const image = blank();
  const ankle = { x: 0.52, y: 0.88 };
  const shin = 0.2;
  const thigh = 0.2;
  const knee = { x: ankle.x, y: ankle.y - shin };
  const theta = (Math.PI / 2) * (1 - opts.upright);
  const hip = { x: knee.x - thigh * Math.sin(theta), y: knee.y - thigh * Math.cos(theta) };
  const shoulder = { x: hip.x, y: hip.y - 0.22 };
  const wrist =
    opts.hands === 'chest'
      ? { x: hip.x + 0.03, y: shoulder.y + 0.35 * (hip.y - shoulder.y) }
      : { x: knee.x, y: knee.y };

  place(image, Joint.nose, shoulder.x, shoulder.y - 0.1);
  place(image, Joint.leftShoulder, shoulder.x, shoulder.y);
  place(image, Joint.rightShoulder, shoulder.x, shoulder.y);
  place(image, Joint.leftElbow, (shoulder.x + wrist.x) / 2, (shoulder.y + wrist.y) / 2);
  place(image, Joint.rightElbow, (shoulder.x + wrist.x) / 2, (shoulder.y + wrist.y) / 2);
  place(image, Joint.leftWrist, wrist.x, wrist.y);
  place(image, Joint.rightWrist, wrist.x, wrist.y);
  place(image, Joint.leftHip, hip.x, hip.y);
  place(image, Joint.rightHip, hip.x, hip.y);
  place(image, Joint.leftKnee, knee.x, knee.y);
  place(image, Joint.rightKnee, knee.x, knee.y);
  place(image, Joint.leftAnkle, ankle.x, ankle.y);
  place(image, Joint.rightAnkle, ankle.x, ankle.y);

  // World copy with y down from the hip, so 3D knee angles match the picture.
  const world = blank();
  const shiftY = hip.y;
  for (const index of [
    Joint.nose,
    Joint.leftShoulder,
    Joint.rightShoulder,
    Joint.leftWrist,
    Joint.rightWrist,
    Joint.leftHip,
    Joint.rightHip,
    Joint.leftKnee,
    Joint.rightKnee,
    Joint.leftAnkle,
    Joint.rightAnkle,
  ]) {
    const p = image[index];
    world[index] = { x: p.x - hip.x, y: p.y - shiftY, z: 0, visibility: p.visibility };
  }

  return { tMs, image, world };
}

function sitCycle(tMs: number, hands: SitOpts['hands'] = 'chest'): SitOpts {
  const cycle = tMs % 4000;
  let upright = 0;
  if (cycle < 1000) upright = 0;
  else if (cycle < 2000) upright = (cycle - 1000) / 1000;
  else if (cycle < 3000) upright = 1;
  else upright = 1 - (cycle - 3000) / 1000;
  return { upright, hands };
}

function checkGait(): void {
  const acc = createPoseAccumulator('walking');
  for (let t = 0; t <= 4000; t += 50) acc.push(gaitFrame(t, false));
  const done = acc.finish(4, 'local');
  assert(done != null, 'walking recording should produce a session');
  if (!done) return;
  const { session, samples } = done;
  assert(session.stepCount != null && session.stepCount >= 6 && session.stepCount <= 9, `expected about 8 steps, got ${session.stepCount}`);
  assert(session.cadence >= 90 && session.cadence <= 140, `cadence ${session.cadence} out of range`);
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
  assert((done.session.stepCount ?? 0) >= 6, 'the model still places the hidden ankle, so steps still count');
}

function checkJitterIsNotSteps(): void {
  const acc = createPoseAccumulator('walking');
  for (let t = 0; t <= 4000; t += 50) acc.push(gaitFrame(t, false, 0.02));
  const done = acc.finish(4, 'local');
  assert(done != null, 'jitter recording should produce a session');
  if (!done) return;
  assert((done.session.stepCount ?? 0) === 0, `camera noise should not count as steps, got ${done.session.stepCount}`);
}

function checkSitToStand(): void {
  const acc = createPoseAccumulator('sitToStand');
  for (let t = 0; t <= 8000; t += 50) acc.push(sitFrame(t, sitCycle(t)));
  const done = acc.finish(8, 'local');
  assert(done != null, 'sit-to-stand recording should produce a session');
  if (!done) return;
  assert(done.session.reps === 2, `expected 2 reps, got ${done.session.reps}`);
  assert(done.session.cadence === 15, `expected 15 reps/min, got ${done.session.cadence}`);
  assert(done.session.symmetryMeasured === true, 'both knees were visible');
  assert(done.session.symmetry >= 90, `knee symmetry ${done.session.symmetry} should be high`);
  assert(acc.readout().cue?.text === FORM_CUES.good.text, `expected a good-rep cue, got ${acc.readout().cue?.text}`);
}

function checkArmsOnKnees(): void {
  const acc = createPoseAccumulator('sitToStand');
  for (let t = 0; t <= 4000; t += 50) acc.push(sitFrame(t, sitCycle(t, 'knees')));
  assert(acc.readout().count === 1, `pushing off the chair should still count, got ${acc.readout().count}`);
  assert(acc.readout().cue?.text === FORM_CUES.armsUsed.text, `expected an arms cue, got ${acc.readout().cue?.text}`);
}

function hold(acc: ReturnType<typeof createPoseAccumulator>, start: number, ms: number, upright: number): void {
  for (let t = start; t < start + ms; t += 50) acc.push(sitFrame(t, { upright, hands: 'chest' }));
}

function checkPartialRise(): void {
  const acc = createPoseAccumulator('sitToStand');
  hold(acc, 0, 800, 0);
  hold(acc, 800, 1200, 0.62);
  hold(acc, 2000, 1200, 0);
  assert(acc.readout().count === 0, `a half rise should not count, got ${acc.readout().count}`);
  assert(acc.readout().cue?.text === FORM_CUES.standTaller.text, `expected stand-taller cue, got ${acc.readout().cue?.text}`);
}

function checkPartialSit(): void {
  const acc = createPoseAccumulator('sitToStand');
  hold(acc, 0, 800, 0);
  hold(acc, 800, 1200, 1);
  hold(acc, 2000, 1200, 0.38);
  hold(acc, 3200, 1200, 1);
  assert(acc.readout().count === 1, `the first full stand should count, got ${acc.readout().count}`);
  assert(acc.readout().cue?.text === FORM_CUES.sitLower.text, `expected sit-lower cue, got ${acc.readout().cue?.text}`);
}

function checkOccludedFarWristIsIgnored(): void {
  const acc = createPoseAccumulator('sitToStand');
  for (let t = 0; t <= 4000; t += 50) {
    const frame = sitFrame(t, sitCycle(t));
    // Far wrist (positive z) sits on the knee; the near wrist stays on the chest.
    frame.world[Joint.leftWrist] = { ...frame.world[Joint.leftWrist], z: -0.2 };
    frame.world[Joint.rightWrist] = { ...frame.world[Joint.rightWrist], z: 0.2 };
    frame.image[Joint.rightWrist] = { ...frame.image[Joint.leftKnee], visibility: 1 };
    acc.push(frame);
  }
  assert(acc.readout().count === 1, `expected 1 rep, got ${acc.readout().count}`);
  assert(acc.readout().cue?.text === FORM_CUES.good.text, `a guessed far wrist on the knee should not flag a crossed-arm rise, got ${acc.readout().cue?.text}`);
}

function checkStandingArmsDoNotFlagNextRep(): void {
  const acc = createPoseAccumulator('sitToStand');
  for (let t = 0; t <= 4000; t += 50) {
    const cycle = sitCycle(t);
    const hands = cycle.upright > 0.85 ? 'knees' : 'chest';
    acc.push(sitFrame(t, { ...cycle, hands }));
  }
  assert(acc.readout().count === 1, `expected 1 rep, got ${acc.readout().count}`);
  assert(acc.readout().cue?.text === FORM_CUES.good.text, `arms at the sides while standing should not flag the next rise, got ${acc.readout().cue?.text}`);
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
checkJitterIsNotSteps();
checkSitToStand();
checkArmsOnKnees();
checkPartialRise();
checkPartialSit();
checkOccludedFarWristIsIgnored();
checkStandingArmsDoNotFlagNextRep();
checkNoFrames();
checkFramingGuidance();
checkMovementAssessment();
console.log('pose metrics ok');
