import type { Vec3 } from './poseTypes';

/** MediaPipe Pose Landmarker joint indexes. 33 points, same order on web and on the phone. */
export const Joint = {
  nose: 0,
  leftEye: 2,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftPinky: 17,
  rightPinky: 18,
  leftIndex: 19,
  rightIndex: 20,
  leftThumb: 21,
  rightThumb: 22,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

export const LANDMARK_COUNT = 33;

/** Bones drawn on the preview. Matches the pose landmarker connection set. */
export const POSE_BONES: ReadonlyArray<readonly [number, number]> = [
  [Joint.nose, Joint.leftEye],
  [Joint.leftEye, Joint.leftEar],
  [Joint.nose, Joint.rightEye],
  [Joint.rightEye, Joint.rightEar],
  [Joint.leftShoulder, Joint.rightShoulder],
  [Joint.leftShoulder, Joint.leftElbow],
  [Joint.leftElbow, Joint.leftWrist],
  [Joint.leftWrist, Joint.leftPinky],
  [Joint.leftWrist, Joint.leftIndex],
  [Joint.leftWrist, Joint.leftThumb],
  [Joint.rightShoulder, Joint.rightElbow],
  [Joint.rightElbow, Joint.rightWrist],
  [Joint.rightWrist, Joint.rightPinky],
  [Joint.rightWrist, Joint.rightIndex],
  [Joint.rightWrist, Joint.rightThumb],
  [Joint.leftShoulder, Joint.leftHip],
  [Joint.rightShoulder, Joint.rightHip],
  [Joint.leftHip, Joint.rightHip],
  [Joint.leftHip, Joint.leftKnee],
  [Joint.rightHip, Joint.rightKnee],
  [Joint.leftKnee, Joint.leftAnkle],
  [Joint.rightKnee, Joint.rightAnkle],
  [Joint.leftAnkle, Joint.leftHeel],
  [Joint.leftAnkle, Joint.leftFootIndex],
  [Joint.leftHeel, Joint.leftFootIndex],
  [Joint.rightAnkle, Joint.rightHeel],
  [Joint.rightAnkle, Joint.rightFootIndex],
  [Joint.rightHeel, Joint.rightFootIndex],
];

export const VISIBLE = 0.5;

// The model keeps guessing joints just past the frame edge with high visibility, so position counts too.
const EDGE = 0.02;

/** Inside the camera frame, seen or not. The model still places joints hidden behind the body. */
export function isInFrame(points: Vec3[], index: number): boolean {
  const point = points[index];
  return point != null && point.x >= -EDGE && point.x <= 1 + EDGE && point.y >= -EDGE && point.y <= 1 + EDGE;
}

export function isVisible(points: Vec3[], index: number): boolean {
  const point = points[index];
  return point != null && point.visibility >= VISIBLE && isInFrame(points, index);
}

/**
 * Upper body, a hip, and a foot. Counting waits until this is true.
 * The face is not required: it turns away on a walk and leaves the top of the frame when someone stands.
 */
export function bodyInFrame(image: Vec3[]): boolean {
  return (
    (isVisible(image, Joint.nose) || isVisible(image, Joint.leftShoulder) || isVisible(image, Joint.rightShoulder)) &&
    (isVisible(image, Joint.leftHip) || isVisible(image, Joint.rightHip)) &&
    (isVisible(image, Joint.leftAnkle) || isVisible(image, Joint.rightAnkle))
  );
}

/**
 * Map a 0–1 point inside the camera frame onto a 0–1 point in the preview box,
 * matching `object-fit: contain` (the whole body stays in view, with bars if needed).
 */
export function containPoint(point: Vec3, boxW: number, boxH: number, frameW: number, frameH: number): Vec3 {
  if (boxW <= 0 || boxH <= 0 || frameW <= 0 || frameH <= 0) return point;
  const frameRatio = frameW / frameH;
  const boxRatio = boxW / boxH;
  const wide = boxRatio > frameRatio;
  const dw = wide ? boxH * frameRatio : boxW;
  const dh = wide ? boxH : boxW / frameRatio;
  const ox = wide ? (boxW - dw) / 2 : 0;
  const oy = wide ? 0 : (boxH - dh) / 2;
  return { ...point, x: (ox + point.x * dw) / boxW, y: (oy + point.y * dh) / boxH };
}
