// Setup copy for the placement guide: 3-4 short steps per motion and method.
import type { CaptureMethod, IconName, MotionType } from '@/types';

export type PlacementStep = { icon: IconName; title: string; detail: string };

/** Where the phone sits on the body for IMU tracking. Drawn by imu/BodyPlacement. */
export type BodySpot = 'pocket' | 'waist' | 'thigh' | 'lowerBack';

export const IMU_SPOT: Record<MotionType, BodySpot> = {
  walking: 'pocket',
  running: 'waist',
  stairs: 'thigh',
  sitToStand: 'lowerBack',
};

export const BODY_SPOT_LABELS: Record<BodySpot, string> = {
  pocket: 'Front pocket',
  waist: 'Front of waist',
  thigh: 'Outer thigh',
  lowerBack: 'Lower back',
};

/** How far the phone stands from you for camera tracking, in meters. Drawn by cv/CameraSetup. */
export const CV_DISTANCE_M: Record<MotionType, number> = {
  walking: 3,
  running: 3,
  stairs: 2,
  sitToStand: 2,
};

const CV_STEPS: Record<MotionType, PlacementStep[]> = {
  walking: [
    { icon: 'resize', title: 'Clear a 5 m path', detail: 'A hallway or room where you can walk in a straight line.' },
    { icon: 'phone-portrait', title: 'Phone on the floor, 3 m away', detail: 'Stand it upright on a small tripod or lean it on something steady.' },
    { icon: 'swap-horizontal', title: 'Walk across the frame', detail: 'The camera should see your side as you pass.' },
    { icon: 'body', title: 'Head to feet in view', detail: 'Bright, even light and no one else in the shot.' },
  ],
  running: [
    { icon: 'speedometer', title: 'Set up beside a treadmill', detail: 'It keeps you in frame the whole time.' },
    { icon: 'phone-portrait', title: 'Phone on the floor, 3 m away', detail: 'Upright on a small tripod, level with the treadmill belt.' },
    { icon: 'eye', title: 'Side-on to the camera', detail: 'It should see your side, not your front or back.' },
    { icon: 'body', title: 'Head to feet in view', detail: 'Check your feet and head stay in frame at full stride.' },
  ],
  stairs: [
    { icon: 'trending-up', title: 'Pick 4 or more steps', detail: 'With a handrail you can hold the whole way.' },
    { icon: 'phone-portrait', title: 'Phone on the floor, 2 m to the side', detail: 'Upright on a small tripod at the bottom step.' },
    { icon: 'body', title: 'Every step in view', detail: 'Your whole body, from the bottom step to the top.' },
  ],
  sitToStand: [
    { icon: 'cube', title: 'Use a firm chair', detail: 'No wheels or armrests, with its back against a wall.' },
    { icon: 'phone-portrait', title: 'Phone on the floor, 2 m away', detail: 'Upright on a small tripod, facing the side of the chair.' },
    { icon: 'eye', title: 'Sit side-on to the camera', detail: 'It should see your side, not your front.' },
    { icon: 'body', title: 'Head to feet in view', detail: 'Stand up once to check your head stays in frame.' },
  ],
};

const IMU_STEPS: Record<MotionType, PlacementStep[]> = {
  walking: [
    { icon: 'qr-code', title: 'Sign in on one phone', detail: 'Then scan its code with the second phone\'s camera. That one needs no sign-in.' },
    { icon: 'phone-portrait', title: 'Right thigh and right shin', detail: 'One phone strapped to the outer thigh, the other just below the knee.' },
    { icon: 'arrow-up', title: 'Tops pointing up', detail: 'Screens facing the leg, snug so they do not swing.' },
    { icon: 'walk', title: 'Walk a straight path', detail: 'At your normal pace. Keep both Safari pages open and unlocked.' },
  ],
  running: [
    { icon: 'phone-portrait', title: 'Running belt at the waist', detail: 'Phone at the front, over your belly button.' },
    { icon: 'arrow-up', title: 'Top of the phone pointing up', detail: 'Screen facing out.' },
    { icon: 'contract', title: 'Pull the belt snug', detail: 'The phone should not bounce when you jog on the spot.' },
    { icon: 'speedometer', title: 'Run at your usual pace', detail: 'Warm up first, then keep a steady speed.' },
  ],
  stairs: [
    { icon: 'qr-code', title: 'Sign in on one phone', detail: 'Then scan its code with the second phone\'s camera. That one needs no sign-in.' },
    { icon: 'phone-portrait', title: 'Right thigh and right shin', detail: 'A tight side pocket or strap on the thigh; the second phone on the shin.' },
    { icon: 'arrow-up', title: 'Tops pointing up', detail: 'Screens facing the leg.' },
    { icon: 'hand-left', title: 'Hold the handrail', detail: 'Go up and back down at least one full flight. Keep both pages open.' },
  ],
  sitToStand: [
    { icon: 'phone-portrait', title: 'Middle of your lower back', detail: 'Tucked into your waistband or a belt clip.' },
    { icon: 'arrow-up', title: 'Top of the phone pointing up', detail: 'Screen facing out.' },
    { icon: 'cube', title: 'Sit on a firm chair', detail: 'Feet flat, arms crossed over your chest.' },
    { icon: 'repeat', title: 'Stand up fully, sit back down', detail: 'Repeat at a steady pace until you tap Stop.' },
  ],
};

export function placementSteps(motion: MotionType, method: CaptureMethod): PlacementStep[] {
  return method === 'cv' ? CV_STEPS[motion] : IMU_STEPS[motion];
}
