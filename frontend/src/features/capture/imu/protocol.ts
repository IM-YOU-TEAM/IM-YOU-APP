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
  preview: 'preview',
  /** Clock sync: the scanned phone asks, the signed-in phone answers with its time. */
  syncPing: 'sync_ping',
  syncPong: 'sync_pong',
} as const;

/** One preview row: t, ax, ay, az, gx, gy, gz. Tuples keep each broadcast small. */
type PreviewRow = [number, number, number, number, number, number, number];

/**
 * The second phone's smoothed trace, sent so the signed-in phone can draw both legs.
 * Drawing only: the model gets the raw samples over its own socket.
 */
export type PreviewMessage = {
  site: Site;
  rows: PreviewRow[];
};

/** More than a few seconds of rows in one message is not a preview. */
const MAX_PREVIEW_ROWS = 300;

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;

export function encodePreview(site: Site, samples: ImuSample[]): PreviewMessage {
  return {
    site,
    rows: samples.map((s) => [
      round(s.t, 3),
      round(s.ax, 2),
      round(s.ay, 2),
      round(s.az, 2),
      round(s.gx, 1),
      round(s.gy, 1),
      round(s.gz, 1),
    ]),
  };
}

/** Null for anything that is not a well-formed preview, since the payload comes off the network. */
export function decodePreview(payload: unknown): { site: Site; samples: ImuSample[] } | null {
  if (payload == null || typeof payload !== 'object') return null;
  const { site, rows } = payload as Partial<PreviewMessage>;
  if (site == null || !SITES.includes(site) || !Array.isArray(rows) || rows.length > MAX_PREVIEW_ROWS) return null;
  const samples: ImuSample[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length !== 7 || !row.every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
    const [t, ax, ay, az, gx, gy, gz] = row;
    samples.push({ t, ax, ay, az, gx, gy, gz });
  }
  return { site, samples };
}

/**
 * What a phone advertises about itself over presence. Tracked once, when it picks a spot:
 * Realtime closes the channel on a client that re-tracks presence every second or so.
 */
export type PhonePresence = {
  site: Site;
};
