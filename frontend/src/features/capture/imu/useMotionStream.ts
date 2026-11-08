import { useCallback, useMemo } from 'react';
import type { MotionStream } from './motionTypes';

export type { MotionGate, MotionStream } from './motionTypes';

/**
 * Native builds do not stream browser DeviceMotion events. IMU capture is the
 * Vercel / Safari path; the camera flow covers on-device measurement.
 */
export function useMotionStream(): MotionStream {
  const request = useCallback(async () => undefined, []);
  const subscribe = useCallback(() => () => undefined, []);
  return useMemo(
    () => ({ gate: 'unavailable', hz: 0, recent: [], request, subscribe }),
    [request, subscribe],
  );
}
