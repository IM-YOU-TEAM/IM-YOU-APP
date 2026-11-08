import { LANDMARK_COUNT } from './landmarks';
import { createPoseAccumulator } from './metrics';
import type { PoseFrame, Vec3 } from './poseTypes';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function blank(): Vec3[] {
  return Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0, y: 0, z: 0, visibility: 1 }));
}

/** Heel height for one stride per second. y is up, so the planted foot sits lower. */
function heelY(tMs: number, phaseMs: number): number {
  const p = ((tMs + phaseMs) % 1000) / 1000;
  if (p < 0.55) return -0.9;
  const u = (p - 0.55) / 0.45;
  return -0.9 + 0.22 * Math.sin(Math.PI * u);
}

function gaitFrame(tMs: number, hideRight: boolean): PoseFrame {
  const image = blank();
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

  const image = blank();
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
  const done = createPoseAccumulator('running').finish(3, 'local');
  assert(done == null, 'no frames means no session and no invented score');
}

checkGait();
checkHiddenLeg();
checkSitToStand();
checkNoFrames();
console.log('pose metrics ok');
