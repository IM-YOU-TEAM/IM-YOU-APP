import { addDays, dayKey, parseLocal } from '@/lib/format';
import type { CareTask, MotionType, Session } from '@/types';

/** A patient's tick on a movement for one local day, "YYYY-MM-DD". */
export type TaskCheck = { motion: MotionType; day: string };

export type TaskStatus = {
  task: CareTask;
  /** Ticked by hand today, so tapping again unticks it. */
  tickedToday: boolean;
  /** Recorded or ticked today. */
  doneToday: boolean;
  /** Days from Monday to today with a recording or a tick. */
  daysThisWeek: number;
  /** Done today, or the week's target is already met. */
  complete: boolean;
};

/** Monday of the week that holds `day`. */
export function weekStart(day: string): string {
  return addDays(day, -((parseLocal(day).getDay() + 6) % 7));
}

/** Where each task stands on `day`. A recorded session counts the same as a tick. */
export function taskStatuses(
  tasks: CareTask[],
  sessions: Pick<Session, 'motion' | 'date'>[],
  checks: TaskCheck[],
  day: string,
): TaskStatus[] {
  const start = weekStart(day);
  return tasks.map((task) => {
    const days = new Set<string>();
    for (const s of sessions) if (s.motion === task.motion) days.add(dayKey(s.date));
    for (const c of checks) if (c.motion === task.motion) days.add(c.day);
    const daysThisWeek = [...days].filter((d) => d >= start && d <= day).length;
    const doneToday = days.has(day);
    return {
      task,
      tickedToday: checks.some((c) => c.motion === task.motion && c.day === day),
      doneToday,
      daysThisWeek,
      complete: doneToday || daysThisWeek >= task.timesPerWeek,
    };
  });
}

/** "Done today" for daily tasks, "1 of 3 this week" for the rest. */
export function progressLabel(status: TaskStatus): string {
  const target = status.task.timesPerWeek;
  if (target >= 7) return status.doneToday ? 'Done today' : 'Not done today';
  return `${Math.min(status.daysThisWeek, target)} of ${target} this week`;
}
