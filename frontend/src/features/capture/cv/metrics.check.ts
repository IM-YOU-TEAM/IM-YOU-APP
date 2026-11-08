import { Joint, LANDMARK_COUNT } from './landmarks';
import { createPoseAccumulator, FORM_CUES } from './metrics';
import type { PoseFrame, Vec3 } from './poseTypes';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function blank(): Vec3[] {
  return Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
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
  assert(session.gaitScore >= 90, `gait score ${session.gaitScore} should reflect a clean recording`);
  assert(samples.length === 81, `expected one sample per frame, got ${samples.length}`);
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
  const done = createPoseAccumulator('running').finish(3, 'local');
  assert(done == null, 'no frames means no session and no invented score');
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
console.log('pose metrics ok');
