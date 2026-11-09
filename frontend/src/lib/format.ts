// Small display formatters shared by screens. Dates are local ISO strings ("2026-11-07T09:30:00").

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2026-11-07T09:30:00" -> "2026-11-07" (key for comparing days). */
export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** A Date (e.g. a database timestamp) as a local ISO date-time, "2026-11-07T09:30:00". */
export function localIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Parse "YYYY-MM-DD" or a local ISO date-time without timezone drift. */
export function parseLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const [hh = 0, mm = 0, ss = 0] = iso.length > 10 ? iso.slice(11, 19).split(':').map(Number) : [];
  return new Date(y, m - 1, d, hh, mm, ss || 0);
}

/** "Nov 7" */
export function formatDate(iso: string): string {
  const d = parseLocal(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Sat, Nov 7" */
export function formatLongDate(iso: string): string {
  const d = parseLocal(iso);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Sat" */
export function formatWeekday(iso: string): string {
  return WEEKDAYS[parseLocal(iso).getDay()];
}

/** "9:30 AM" */
export function formatTime(iso: string): string {
  const d = parseLocal(iso);
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** 754 -> "12:34" */
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

/** "2026-11-07" + n days -> "YYYY-MM-DD" (n may be negative). */
export function addDays(day: string, n: number): string {
  const d = parseLocal(day);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
