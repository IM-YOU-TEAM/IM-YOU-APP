// Identity and timestamps for a recorded session. Shared by both capture methods
// so a camera session and a sensor session are stamped the same way.

/** e.g. "cv-9f3d…" or "imu-9f3d…". Falls back to the clock where randomUUID is missing. */
export function sessionId(prefix: string): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && 'randomUUID' in cryptoObj) return `${prefix}-${cryptoObj.randomUUID()}`;
  return `${prefix}-${Date.now()}`;
}

/** Local ISO date-time without a zone, e.g. "2026-11-08T09:30:00". */
export function localDateTime(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
