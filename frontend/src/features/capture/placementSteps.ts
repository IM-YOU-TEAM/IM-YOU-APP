// Setup copy for the placement guide: 3-4 short steps per motion and method.
import type { CaptureMethod, IconName, MotionType } from '@/types';

export type PlacementStep = { icon: IconName; title: string; detail: string };

/** Where the phone sits on the body for IMU tracking. Drawn by imu/BodyPlacement. */
export type BodySpot = 'pocket' | 'waist' | 'thigh' | 'lowerBack';

export const IMU_SPOT: Record<MotionType, BodySpot> = {
  chairStand: 'waist',
};

export const BODY_SPOT_LABELS: Record<BodySpot, string> = {
  pocket: 'Front pocket',
  waist: 'Front of waist',
  thigh: 'Outer thigh',
  lowerBack: 'Lower back',
};

/** How far the phone stands from you for camera tracking, in meters. Drawn by cv/CameraSetup. */
export const CV_DISTANCE_M: Record<MotionType, number> = {
  chairStand: 3,
};

const CV_STEPS: Record<MotionType, PlacementStep[]> = {
  chairStand: [
    { icon: 'cube', title: 'Firm chair, no armrests', detail: 'Back of the chair against a wall. No wheels.' },
    { icon: 'phone-portrait', title: 'Phone on the floor, 3 m to the side', detail: 'Upright on a small tripod, level with the chair.' },
    { icon: 'eye', title: 'Sit side-on to the camera', detail: 'It should see your side, not your front.' },
    { icon: 'body', title: 'Head to feet in view', detail: 'Stand up once and check your head stays in frame. You will keep going for 30 seconds.' },
  ],
};

const IMU_STEPS: Record<MotionType, PlacementStep[]> = {
  chairStand: [
    { icon: 'phone-portrait', title: 'Snug at the front of your waist', detail: 'A belt or waistband over your belly. Tighten it so the phone cannot shift.' },
    { icon: 'arrow-up', title: 'Top of the phone pointing up', detail: 'Screen facing out.' },
    { icon: 'body', title: 'Arms folded, feet flat', detail: 'Firm chair, no armrests. Sit up. Do not lean back or perch on the edge.' },
    { icon: 'repeat', title: 'Thirty seconds', detail: 'Stand and sit as many times as you can until 30 seconds is up.' },
  ],
};

export function placementSteps(motion: MotionType, method: CaptureMethod): PlacementStep[] {
  return method === 'cv' ? CV_STEPS[motion] : IMU_STEPS[motion];
}
