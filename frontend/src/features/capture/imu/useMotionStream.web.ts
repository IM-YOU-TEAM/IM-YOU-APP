import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TRACE_SAMPLES, type MotionGate, type MotionStream } from './motionTypes';
import type { ImuSample } from './protocol';

type MotionConstructor = {
  requestPermission?: () => Promise<string>;
};

type Axis = Exclude<keyof ImuSample, 't'>;

const AXES: Axis[] = ['ax', 'ay', 'az', 'gx', 'gy', 'gz'];
/** Keeps gait (1-3 Hz) and drops sensor buzz. Drawing only; the server does the model's own filtering. */
const DISPLAY_CUTOFF_HZ = 5;
/** ~30 fps. Re-rendering on every 60 Hz event is what made the trace stutter. */
const FRAME_MS = 33;
const HZ_EVERY_MS = 1000;

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

/**
 * Two one-pole low-pass stages in a row. Causal, so points already on screen
 * never move as new ones arrive.
 */
function lowPass(): (sample: ImuSample) => ImuSample {
  let first: ImuSample | null = null;
  let second: ImuSample | null = null;
  return (sample) => {
    if (!first || !second) {
      first = sample;
      second = sample;
      return sample;
    }
    const dt = Math.min(Math.max(sample.t - second.t, 0.001), 0.1);
    const alpha = 1 - Math.exp(-2 * Math.PI * DISPLAY_CUTOFF_HZ * dt);
    const a: ImuSample = { ...sample };
    const b: ImuSample = { ...sample };
    for (const axis of AXES) {
      a[axis] = first[axis] + alpha * (sample[axis] - first[axis]);
      b[axis] = second[axis] + alpha * (a[axis] - second[axis]);
    }
    first = a;
    second = b;
    return b;
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
  const trace = useRef<ImuSample[]>([]);
  const fresh = useRef(false);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      stop.current?.();
      stop.current = null;
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

    if (stop.current) {
      setGate('streaming');
      return;
    }

    const smooth = lowPass();
    const onMotion = (event: DeviceMotionEvent) => {
      const sample = readSample(event);
      if (!sample) return;
      listeners.current.forEach((listener) => listener(sample));

      times.current.push(sample.t);
      if (times.current.length > 180) times.current.shift();
      trace.current.push(smooth(sample));
      if (trace.current.length > TRACE_SAMPLES) trace.current.shift();
      fresh.current = true;
    };

    let lastHz = 0;
    const frame = window.setInterval(() => {
      if (!fresh.current) return;
      fresh.current = false;
      setRecent(trace.current.slice());
      const now = performance.now();
      const stamps = times.current;
      if (now - lastHz >= HZ_EVERY_MS && stamps.length > 1) {
        lastHz = now;
        setHz((stamps.length - 1) / (stamps[stamps.length - 1] - stamps[0]));
      }
    }, FRAME_MS);

    window.addEventListener('devicemotion', onMotion);
    stop.current = () => {
      window.removeEventListener('devicemotion', onMotion);
      window.clearInterval(frame);
    };
    setGate('streaming');
    void lockScreen();
  }, []);

  return useMemo(
    () => ({ gate, hz, recent, request, subscribe }),
    [gate, hz, recent, request, subscribe],
  );
}
