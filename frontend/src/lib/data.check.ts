import { ALL_MOTIONS, parseAssignedMotions } from './data';

function assert(ok: boolean, message: string): void {
  if (!ok) throw new Error(message);
}

assert(parseAssignedMotions(undefined).join() === ALL_MOTIONS.join(), 'missing assignments mean every movement');
assert(parseAssignedMotions(['running', 'walking']).join() === 'walking,running', 'known names keep picker order');
assert(parseAssignedMotions([]).length === 0, 'an empty list hides every movement');
assert(parseAssignedMotions(['running', 'nope', 'running']).join() === 'running', 'unknown names and duplicates drop out');
console.log('data.check ok');
