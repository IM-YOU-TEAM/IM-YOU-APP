import { ALL_MOTIONS, frequencyLabel, parseAssignedMotions, parseTasks } from './data';

function assert(ok: boolean, message: string): void {
  if (!ok) throw new Error(message);
}

assert(parseAssignedMotions(undefined).join() === ALL_MOTIONS.join(), 'missing assignments mean every movement');
assert(parseAssignedMotions(['running', 'walking']).join() === 'walking,running', 'known names keep picker order');
assert(parseAssignedMotions([]).length === 0, 'an empty list hides every movement');
assert(parseAssignedMotions(['running', 'nope', 'running']).join() === 'running', 'unknown names and duplicates drop out');

const tasks = parseTasks(['stairs', 'walking'], { walking: 3, stairs: 9, running: 2 });
assert(tasks.map((t) => `${t.motion}:${t.timesPerWeek}`).join() === 'walking:3,stairs:7', 'frequency per assigned movement, bad values mean every day');
assert(parseTasks(['walking'], null)[0].timesPerWeek === 7, 'no plan means every day');
assert(parseTasks(['walking'], { walking: 2.5 })[0].timesPerWeek === 7, 'fractions are not a frequency');
assert(parseTasks([], { walking: 3 }).length === 0, 'unassigned movements are not tasks');

assert(frequencyLabel(7) === 'Every day', 'daily label');
assert(frequencyLabel(1) === 'Once a week', 'weekly label');
assert(frequencyLabel(3) === '3 times a week', 'n times label');
console.log('data.check ok');
