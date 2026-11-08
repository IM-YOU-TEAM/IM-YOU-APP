import type { MotionType } from '@/types';
import { Joint, VISIBLE, isVisible } from './landmarks';
import type { Vec3 } from './poseTypes';

export type FramingStatus =
  | 'no-person'
  | 'move-farther'
  | 'move-closer'
  | 'aim-left'
  | 'aim-right'
  | 'ready';

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const BODY_POINTS = [
  Joint.nose,
  Joint.leftShoulder,
  Joint.rightShoulder,
  Joint.leftHip,
  Joint.rightHip,
  Joint.leftKnee,
  Joint.rightKnee,
  Joint.leftAnkle,
  Joint.rightAnkle,
] as const;

const STABLE_FRAMES = 4;

/**
 * Camera setup guidance from image-space landmarks.
 *
 * These thresholds are capture-quality heuristics, not physical distance
 * measurements. They keep enough pixels on the person without clipping the
 * head or feet.
 */
export function framingStatus(image: Vec3[], motion: MotionType): FramingStatus {
  const visible = BODY_POINTS.map((index) => image[index]).filter(
    (point): point is Vec3 => point != null && point.visibility >= VISIBLE,
  );
  const hipsVisible = isVisible(image, Joint.leftHip) && isVisible(image, Joint.rightHip);
  const torsoVisible =
    hipsVisible ||
    (isVisible(image, Joint.leftShoulder) && isVisible(image, Joint.rightShoulder));

  if (!torsoVisible || visible.length < 4) return 'no-person';

  const headVisible = isVisible(image, Joint.nose);
  const leftFootVisible = isVisible(image, Joint.leftAnkle);
  const rightFootVisible = isVisible(image, Joint.rightAnkle);
  if (!hipsVisible || !headVisible || (!leftFootVisible && !rightFootVisible)) return 'move-farther';

  const tracked = [
    image[Joint.nose],
    image[Joint.leftHip],
    image[Joint.rightHip],
    ...(leftFootVisible ? [image[Joint.leftAnkle]] : []),
    ...(rightFootVisible ? [image[Joint.rightAnkle]] : []),
  ].filter((point): point is Vec3 => point != null && point.visibility >= VISIBLE);
  const bounds = pointBounds(tracked);
  const bodyHeight = bounds.maxY - bounds.minY;

  if (bodyHeight > 0.88 || bounds.minY < 0.035 || bounds.maxY > 0.965) return 'move-farther';

  const minimumHeight = motion === 'stairs' ? 0.26 : motion === 'walking' ? 0.3 : 0.34;
  if (bodyHeight < minimumHeight) return 'move-closer';

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const horizontalMargin = motion === 'walking' || motion === 'stairs' ? 0.15 : 0.25;
  if (centerX < horizontalMargin) return 'aim-left';
  if (centerX > 1 - horizontalMargin) return 'aim-right';

  return 'ready';
}

export function framingInstruction(status: FramingStatus): string {
  switch (status) {
    case 'no-person':
      return 'Stand where the camera can see your whole body.';
    case 'move-farther':
      return 'Move the camera farther away until your head and feet fit.';
    case 'move-closer':
      return 'Move the camera closer so your joints are easier to see.';
    case 'aim-left':
      return 'Point the camera a little left to centre your body.';
    case 'aim-right':
      return 'Point the camera a little right to centre your body.';
    case 'ready':
      return 'Camera position is ready.';
    default: {
      const unexpected: never = status;
      return unexpected;
    }
  }
}

/** Prevent one uncertain frame from flickering the live instruction. */
export class FramingTracker {
  private candidate: FramingStatus = 'no-person';
  private candidateFrames = 0;
  private stable: FramingStatus = 'no-person';

  push(image: Vec3[] | null, motion: MotionType): FramingStatus {
    const next = image == null ? 'no-person' : framingStatus(image, motion);
    if (next === this.candidate) {
      this.candidateFrames += 1;
    } else {
      this.candidate = next;
      this.candidateFrames = 1;
    }
    if (this.candidateFrames >= STABLE_FRAMES) this.stable = next;
    return this.stable;
  }
}

function pointBounds(points: Vec3[]): Bounds {
  return points.reduce<Bounds>(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}
