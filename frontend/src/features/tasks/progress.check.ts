import { progressLabel, taskStatuses, weekStart } from './progress';

function assert(ok: boolean, message: string): void {
  if (!ok) throw new Error(message);
}

// 2026-11-11 is a Wednesday.
assert(weekStart('2026-11-11') === '2026-11-09', 'weeks start on Monday');
assert(weekStart('2026-11-09') === '2026-11-09', 'Monday is its own week start');
assert(weekStart('2026-11-15') === '2026-11-09', 'Sunday closes the week');

const day = '2026-11-11';
const [daily, weekly] = taskStatuses(
  [
    { motion: 'walking', timesPerWeek: 7 },
    { motion: 'stairs', timesPerWeek: 3 },
  ],
  [
    { motion: 'stairs', date: '2026-11-09T08:00:00' },
    { motion: 'stairs', date: '2026-11-09T18:00:00' },
    { motion: 'stairs', date: '2026-11-02T08:00:00' },
  ],
  [{ motion: 'stairs', day: '2026-11-10' }],
  day,
);

assert(!daily.complete && !daily.doneToday, 'a daily task with nothing today is open');
assert(progressLabel(daily) === 'Not done today', 'daily label when open');
assert(weekly.daysThisWeek === 2, 'two sessions on one day count once, last week does not count');
assert(!weekly.complete, 'two of three days is not done');
assert(progressLabel(weekly) === '2 of 3 this week', 'weekly progress label');

const [ticked] = taskStatuses([{ motion: 'walking', timesPerWeek: 7 }], [], [{ motion: 'walking', day }], day);
assert(ticked.complete && ticked.tickedToday, 'a tick today completes a daily task and can be undone');

const [recorded] = taskStatuses([{ motion: 'walking', timesPerWeek: 7 }], [{ motion: 'walking', date: `${day}T07:00:00` }], [], day);
assert(recorded.complete && !recorded.tickedToday, 'a recording completes the task without a tick to undo');

const [met] = taskStatuses(
  [{ motion: 'running', timesPerWeek: 1 }],
  [{ motion: 'running', date: '2026-11-09T07:00:00' }],
  [],
  day,
);
assert(met.complete && !met.doneToday, 'a weekly target met earlier stays complete');
console.log('progress.check ok');
