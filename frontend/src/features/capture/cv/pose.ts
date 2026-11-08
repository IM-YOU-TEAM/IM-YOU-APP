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
  switch (motion) {
    case 'chairStand':
      return sitToStandPose(t);
    default: {
      const exhaustive: never = motion;
      return exhaustive;
    }
  }
}

/** Where the chair seat sits for sit-to-stand (the hip when fully seated). */
export const SEAT = sitToStandPose(0).hip;
