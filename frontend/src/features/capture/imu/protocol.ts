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

/** Sent by the signed-in phone, which has the only controls. The scanned phone follows it. */
export type ControlMessage = {
  action: 'start' | 'stop' | 'pause' | 'resume';
};

/** Broadcast event names, kept in one place so the two phones cannot drift apart. */
export const EVENTS = {
  control: 'control',
} as const;

/**
 * What a phone advertises about itself over presence. Tracked once, when it picks a spot:
 * Realtime closes the channel on a client that re-tracks presence every second or so.
 */
export type PhonePresence = {
  site: Site;
};
