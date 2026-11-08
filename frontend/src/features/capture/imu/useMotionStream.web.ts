import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MotionGate, MotionStream } from './motionTypes';
import type { ImuSample } from './protocol';

type MotionConstructor = {
  requestPermission?: () => Promise<string>;
};

function readSample(event: DeviceMotionEvent): ImuSample | null {
  const acceleration = event.accelerationIncludingGravity;
  const rotation = event.rotationRate;
  if (!acceleration || !rotation) return null;
  const ax = acceleration.x;
  const ay = acceleration.y;
  const az = acceleration.z;
  // Same axis map as phone-imu: gx = beta, gy = gamma, gz = alpha.
  const gx = rotation.beta;
  const gy = rotation.gamma;
  const gz = rotation.alpha;
  if (![ax, ay, az, gx, gy, gz].every((value) => typeof value === 'number' && Number.isFinite(value))) {
    return null;
  }
  // timeOrigin + event.timeStamp is the event's wall clock, not the handler's.
  const origin = typeof performance !== 'undefined' ? performance.timeOrigin : Date.now();
  return {
    t: (origin + event.timeStamp) / 1000,
    ax: ax as number,
    ay: ay as number,
    az: az as number,
    gx: gx as number,
    gy: gy as number,
    gz: gz as number,
  };
}

async function lockScreen(): Promise<void> {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<unknown> } };
    if (nav.wakeLock && document.visibilityState === 'visible') {
      await nav.wakeLock.request('screen');
    }
  } catch {
    // Auto-lock can still interrupt a long walk; the prompt already says keep Safari open.
  }
}

/**
 * Safari / Chrome DeviceMotion stream. Permission has to be asked from a tap.
 */
export function useMotionStream(): MotionStream {
  const [gate, setGate] = useState<MotionGate>('idle');
  const [hz, setHz] = useState(0);
  const [recent, setRecent] = useState<ImuSample[]>([]);
  const listeners = useRef(new Set<(sample: ImuSample) => void>());
  const times = useRef<number[]>([]);
  const watching = useRef(false);

  useEffect(() => {
    return () => {
      watching.current = false;
    };
  }, []);

  const subscribe = useCallback((listener: (sample: ImuSample) => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const request = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.DeviceMotionEvent === 'undefined') {
      setGate('unavailable');
      return;
    }
    if (!window.isSecureContext) {
      setGate('unavailable');
      return;
    }

    const Motion = window.DeviceMotionEvent as typeof DeviceMotionEvent & MotionConstructor;
    if (typeof Motion.requestPermission === 'function') {
      const permission = await Motion.requestPermission();
      if (permission !== 'granted') {
        setGate('denied');
        return;
      }
    }

    if (watching.current) {
      setGate('streaming');
      return;
    }
    watching.current = true;

    const onMotion = (event: DeviceMotionEvent) => {
      const sample = readSample(event);
      if (!sample) return;
      times.current.push(sample.t);
      if (times.current.length > 180) times.current = times.current.slice(-180);
      const stamps = times.current;
      if (stamps.length > 1) {
        setHz((stamps.length - 1) / (stamps[stamps.length - 1] - stamps[0]));
      }
      setRecent((prev) => {
        const next = prev.length >= 150 ? prev.slice(prev.length - 149) : prev.slice();
        next.push(sample);
        return next;
      });
      listeners.current.forEach((listener) => listener(sample));
    };

    window.addEventListener('devicemotion', onMotion);
    setGate('streaming');
    void lockScreen();
  }, []);

  return useMemo(
    () => ({ gate, hz, recent, request, subscribe }),
    [gate, hz, recent, request, subscribe],
  );
}
