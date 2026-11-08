import type { JointName, ModelActivity } from './liveTypes';

/**
 * Where each phone is strapped. The model was trained on two sensors and wants
 * the shank channels first, so `DEVICE_ID` keeps the names its export uses.
 */
export type Site = 'thigh' | 'shank';

export const SITES: Site[] = ['thigh', 'shank'];

/** The ids the model export expects: phone_1 is the right thigh, phone_2 the right shank. */
export const DEVICE_ID: Record<Site, 'phone_1' | 'phone_2'> = {
  thigh: 'phone_1',
  shank: 'phone_2',
};

export const SITE_LABELS: Record<Site, string> = {
  thigh: 'Right thigh',
  shank: 'Right shin',
};

/** One accelerometer + gyroscope reading, in the units the model expects. */
export type ImuSample = {
  /** Seconds on the sending phone's own clock, from performance.now(). */
  t: number;
  /** m/s^2, gravity included. */
  ax: number;
  ay: number;
  az: number;
  /** degrees/second. */
  gx: number;
  gy: number;
  gz: number;
};

/** What a phone publishes while recording. Batched, because one event per sample floods the channel. */
export type SamplesMessage = {
  site: Site;
  /** Per-site counter, so the worker can spot a dropped batch. */
  seq: number;
  samples: ImuSample[];
};

/** Sent by whichever phone the person pressed Start on. */
export type ControlMessage = {
  action: 'start' | 'stop';
  motion: string;
  /** Milliseconds since the epoch, so both phones trim to the same window. */
  at: number;
  session_id: string;
  /** Presence key of the phone that pressed the button, so only it resets the model. */
  origin: string;
};

/** One scored window, published by the model worker. Mirrors the live API's shape. */
export type WindowMessage = {
  index: number;
  usable: boolean;
  reason: string | null;
  activity: ModelActivity | null;
  confidence: number;
  angles: Record<JointName, number[]>;
  summary: Record<JointName, { min: number; max: number; mean: number }>;
};

/** Broadcast event names. Kept here so the worker and the app cannot drift apart. */
export const EVENTS = {
  samples: 'samples',
  control: 'control',
  window: 'window',
} as const;

/** What a phone advertises about itself over presence. */
export type PhonePresence = {
  site: Site;
  /** Delivered sensor rate, so the UI can show when a phone is too slow for the model. */
  hz: number;
  /** True once motion permission is granted and events are arriving. */
  sensing: boolean;
};
