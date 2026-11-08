// Small pure helpers that turn sessions into what the Home and Results screens show.
// They take plain arrays, so screens pass in whatever they loaded from Supabase.
import type { ChartPoint } from '@/components';
import { MOTION_LABELS, METHOD_LABELS } from '@/lib/data';
import { addDays, dayKey, formatDate, formatLongDate, formatTime, formatWeekday } from '@/lib/format';
import type { Patient, PatientStatus, Session } from '@/types';

// ---------- Home ----------

/** "Good morning" / "Good afternoon" / "Good evening" for an hour 0-23. */
export function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Sessions per day for the 7 days ending on `endDay` (YYYY-MM-DD). The last point is endDay. */
export function weekCounts(list: Session[], endDay: string): ChartPoint[] {
  const days = Array.from({ length: 7 }, (_, i) => addDays(endDay, i - 6));
  return days.map((day) => ({
    label: formatWeekday(day),
    value: list.filter((x) => dayKey(x.date) === day).length,
  }));
}

/** Newest first, at most `limit`. */
export function recentSessions(list: Session[], limit = 5): Session[] {
  return [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/** Last few cadence values, oldest first, for the hero tile's waveform. */
export function cadenceTrend(list: Session[], count = 12): number[] {
  return list.slice(-count).map((x) => x.cadence);
}

// ---------- Results ----------

export type Range = 'week' | 'month';

/** Gait score per session within the last 7 or 30 days ending on `endDay`, oldest first. */
export function gaitSeries(list: Session[], range: Range, endDay: string): ChartPoint[] {
  const start = addDays(endDay, range === 'week' ? -6 : -29);
  return list
    .filter((x) => dayKey(x.date) >= start && dayKey(x.date) <= endDay)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((x) => ({
      label: range === 'week' ? formatWeekday(x.date) : formatDate(x.date),
      value: x.gaitScore,
    }));
}

/** "Sat, Nov 7 · 9:30 AM" */
export function sessionWhen(s: Session): string {
  return `${formatLongDate(s.date)} · ${formatTime(s.date)}`;
}

/** List row text for a session, e.g. { title: "Walking", subtitle: "Sat, Nov 7 · Camera" }. */
export function sessionRow(s: Session): { title: string; subtitle: string } {
  return { title: MOTION_LABELS[s.motion], subtitle: `${formatLongDate(s.date)} · ${METHOD_LABELS[s.method]}` };
}

// ---------- Clinician roster ----------

export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  waiting: 'Waiting to join',
  linked: 'Linked',
  closed: 'Account closed',
};

/** "Linked · 3 sessions" */
export function patientSummary(p: Patient): string {
  const count = p.sessionCount === 1 ? '1 session' : `${p.sessionCount} sessions`;
  return p.status === 'waiting' ? PATIENT_STATUS_LABELS.waiting : `${PATIENT_STATUS_LABELS[p.status]} · ${count}`;
}
