// Stick-figure poses for the camera drawings, seen from the side (facing right).
// Pure math, no data: `t` is animation time in seconds. Coordinates live in a 200 x 260 box, ground at y = 250.
import type { MotionType } from '@/types';

export type Point = { x: number; y: number };

export type Pose = {
  head: Point;
  neck: Point;
  hip: Point;
  near: Limbs; // limbs on the camera side
  far: Limbs; // limbs on the other side (drawn fainter)
};

type Limbs = { knee: Point; foot: Point; elbow: Point; hand: Point };

export const VIEW_W = 200;
export const VIEW_H = 260;
export const GROUND_Y = 250;

const THIGH = 52;
const SHIN = 52;
const TORSO = 64;
const UPPER_ARM = 40;
const FOREARM = 36;
export const HEAD_R = 15;

/** Point `len` away from `from`, at `angle` radians from straight down (positive = forward / right). */
function limb(from: Point, len: number, angle: number): Point {
  return { x: from.x + len * Math.sin(angle), y: from.y + len * Math.cos(angle) };
}

/** Same, but pointing up from `from` (for the torso and head). */
function up(from: Point, len: number, lean: number): Point {
  return { x: from.x + len * Math.sin(lean), y: from.y - len * Math.cos(lean) };
}

type Gait = { speed: number; offset: number; swing: number; knee: number; lean: number; arm: number; elbow: number };

const GAITS: Record<Exclude<MotionType, 'sitToStand'>, Gait> = {
  walking: { speed: 0.9, offset: 0, swing: 0.42, knee: 0.7, lean: 0.05, arm: 0.45, elbow: 0.35 },
  running: { speed: 1.5, offset: 0.1, swing: 0.55, knee: 1.5, lean: 0.22, arm: 0.6, elbow: 1.4 },
  stairs: { speed: 0.7, offset: 0.35, swing: 0.35, knee: 1.1, lean: 0.12, arm: 0.2, elbow: 0.3 },
};

function gaitPose(g: Gait, t: number): Pose {
  const w = 2 * Math.PI * g.speed * t;
  const legs = [1, -1].map((side) => {
    const thigh = g.offset + side * g.swing * Math.sin(w);
    const bend = 0.1 + g.knee * Math.max(0, side * Math.cos(w)); // the swinging leg bends
    return { thigh, shin: thigh - bend };
  });

  // Work out the legs from a hip at (0, 0), then lift the hip so the lower foot touches the ground.
  const origin = { x: 0, y: 0 };
  const knees = legs.map((l) => limb(origin, THIGH, l.thigh));
  const feet = legs.map((l, i) => limb(knees[i], SHIN, l.shin));
  const drop = Math.max(feet[0].y, feet[1].y);
  const hip = { x: 96, y: GROUND_Y - drop };
  const shift = (p: Point) => ({ x: p.x + hip.x, y: p.y + hip.y });

  const neck = up(hip, TORSO, g.lean);
  const head = up(neck, 8 + HEAD_R, g.lean);
  const arms = [1, -1].map((side) => {
    const upper = -side * g.arm * Math.sin(w); // arms swing against the legs
    const elbow = limb(neck, UPPER_ARM, upper);
    return { elbow, hand: limb(elbow, FOREARM, upper + g.elbow) };
  });

  return {
    head,
    neck,
    hip,
    near: { knee: shift(knees[0]), foot: shift(feet[0]), ...arms[0] },
    far: { knee: shift(knees[1]), foot: shift(feet[1]), ...arms[1] },
  };
}

/** Sitting (s = 0) to standing (s = 1), feet planted. */
function sitToStandPose(t: number): Pose {
  const s = (1 - Math.cos(2 * Math.PI * 0.3 * t)) / 2;
  const thigh = 1.5 * (1 - s); // ~horizontal when seated, vertical when standing
  const lean = 0.15 * (1 - s) + 0.6 * Math.sin(Math.PI * s); // lean forward to rise
  const foot = { x: 118, y: GROUND_Y };
  const knee = { x: foot.x, y: foot.y - SHIN };
  const hip = { x: knee.x - THIGH * Math.sin(thigh), y: knee.y - THIGH * Math.cos(thigh) };
  const neck = up(hip, TORSO, lean);
  const head = up(neck, 8 + HEAD_R, lean);
  // Arms crossed over the chest: upper arm hangs forward, forearm folds back across the chest.
  const elbow = limb(neck, UPPER_ARM * 0.7, lean + 0.35);
  const hand = limb(elbow, FOREARM * 0.6, lean + 1.9);
  const offset = (p: Point, dx: number) => ({ x: p.x + dx, y: p.y });

  return {
    head,
    neck,
    hip,
    near: { knee, foot, elbow, hand },
    far: { knee: offset(knee, -6), foot: offset(foot, -6), elbow: offset(elbow, -5), hand: offset(hand, -5) },
  };
}

export function poseAt(motion: MotionType, t: number): Pose {
  return motion === 'sitToStand' ? sitToStandPose(t) : gaitPose(GAITS[motion], t);
}

/** Where the chair seat sits for sit-to-stand (the hip when fully seated). */
export const SEAT = sitToStandPose(0).hip;
