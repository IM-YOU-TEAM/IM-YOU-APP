// Read the track flow's URL params safely. Anything missing or unknown becomes null.
import { METHOD_LABELS, MOTION_LABELS } from '@/lib/data';
import type { CaptureMethod, MotionType } from '@/types';

export function parseMotion(value: unknown): MotionType | null {
  return typeof value === 'string' && Object.hasOwn(MOTION_LABELS, value) ? (value as MotionType) : null;
}

export function parseMethod(value: unknown): CaptureMethod | null {
  return typeof value === 'string' && Object.hasOwn(METHOD_LABELS, value) ? (value as CaptureMethod) : null;
}
