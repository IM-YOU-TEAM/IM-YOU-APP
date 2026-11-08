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
  cv: 'Camera',
  imu: 'Phone sensors',
};

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
