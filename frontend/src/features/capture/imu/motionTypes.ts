import type { ImuSample, Site } from './protocol';

export type MotionGate = 'idle' | 'denied' | 'unavailable' | 'streaming';

/** About 3 s at Safari's ~60 Hz. */
export const TRACE_SAMPLES = 180;

/** How much time one trace spans, whatever rate its phone sends at. */
export const TRACE_SECONDS = 3;

export type MotionStream = {
  gate: MotionGate;
  hz: number;
  /** Low-passed copy for drawing only. `subscribe` gets the raw samples the model needs. */
  recent: ImuSample[];
  /** Must run from a tap. iOS will not grant motion access any other way. */
  request: () => Promise<void>;
  subscribe: (listener: (sample: ImuSample) => void) => () => void;
};

/** One leg's trace for drawing. */
export type SiteTrace = {
  site: Site;
  /** True for the phone showing the trace, false for the one it was sent from. */
  mine: boolean;
  samples: ImuSample[];
  /** Seconds on the sending phone's clock at the right edge of the trace. */
  end: number;
};
