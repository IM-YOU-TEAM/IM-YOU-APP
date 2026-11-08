import type { ImuSample } from './protocol';

export type MotionGate = 'idle' | 'denied' | 'unavailable' | 'streaming';

export type MotionStream = {
  gate: MotionGate;
  hz: number;
  recent: ImuSample[];
  /** Must run from a tap. iOS will not grant motion access any other way. */
  request: () => Promise<void>;
  subscribe: (listener: (sample: ImuSample) => void) => () => void;
};
