// Labels, icons and small helpers. Records live in Supabase: see features/results/api.ts and features/care/api.ts.
import type { CaptureMethod, IconName, Labels, MotionType } from '@/types';

/** Placeholder patient id on a freshly recorded session. Saving swaps in the signed-in patient's id. */
export const LOCAL_PATIENT_ID = 'local';

/** Today's date as "YYYY-MM-DD" (local time). */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- Labels and icons ----------
export const MOTION_LABELS: Labels<MotionType> = {
  walking: 'Walking',
  running: 'Running',
  stairs: 'Stairs',
  sitToStand: 'Sit-to-stand',
};

export const METHOD_LABELS: Labels<CaptureMethod> = {
  cv: 'Computer vision',
  imu: 'Phone IMU sensors',
};

/** Every movement the app can track, in the order the picker shows them. */
export const ALL_MOTIONS: MotionType[] = ['walking', 'running', 'stairs', 'sitToStand'];

/** Drop unknown names and keep the picker order. Missing or invalid input means every movement. */
export function parseAssignedMotions(value: unknown): MotionType[] {
  if (!Array.isArray(value)) return ALL_MOTIONS;
  const allowed = new Set<MotionType>();
  for (const item of value) {
    if (typeof item === 'string' && Object.hasOwn(MOTION_LABELS, item)) allowed.add(item as MotionType);
  }
  return ALL_MOTIONS.filter((motion) => allowed.has(motion));
}

export const MOTION_ICONS: Record<MotionType, IconName> = {
  walking: 'walk',
  running: 'speedometer',
  stairs: 'trending-up',
  sitToStand: 'repeat',
};

export const METHOD_ICONS: Record<CaptureMethod, IconName> = {
  cv: 'camera',
  imu: 'phone-portrait',
};
