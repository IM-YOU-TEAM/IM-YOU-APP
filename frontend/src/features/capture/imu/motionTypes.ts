import type { ImuSample } from './protocol';

export type MotionGate = 'idle' | 'denied' | 'unavailable' | 'streaming';

/** About 3 s at Safari's ~60 Hz. */
export const TRACE_SAMPLES = 180;

export type MotionStream = {
  gate: MotionGate;
  hz: number;
  /** Low-passed copy for drawing only. `subscribe` gets the raw samples the model needs. */
  recent: ImuSample[];
  /** Must run from a tap. iOS will not grant motion access any other way. */
  request: () => Promise<void>;
  subscribe: (listener: (sample: ImuSample) => void) => () => void;
};
