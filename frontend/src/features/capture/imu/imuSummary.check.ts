import { cadenceFromKnee } from './imuSummary';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function sineKnee(cycles: number, points = 100): number[] {
  return Array.from({ length: points }, (_, i) => 20 + 25 * Math.sin((2 * Math.PI * cycles * i) / (points - 1)));
}

function checkCadenceFromKnee(): void {
  const walking = cadenceFromKnee(sineKnee(2), 2.5);
  assert(walking != null && walking >= 88 && walking <= 104, `2 cycles in 2.5 s should be ~96 steps/min, got ${walking}`);

  const still = cadenceFromKnee(Array.from({ length: 80 }, () => 22), 2.5);
  assert(still == null, 'a flat knee curve is not a cadence');

  const tiny = cadenceFromKnee(sineKnee(2).map((value) => value * 0.1), 2.5);
  assert(tiny == null, 'less than 8° of knee motion is noise, not steps');
}

checkCadenceFromKnee();
console.log('imu summary ok');
