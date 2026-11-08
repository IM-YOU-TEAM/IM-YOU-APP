import type { PoseSample } from './poseTypes';

/** Landmark timelines kept in memory, keyed by session id. Nothing is uploaded. */
const logs = new Map<string, PoseSample[]>();

export function savePoseLog(sessionId: string, samples: PoseSample[]): void {
  logs.set(sessionId, samples);
}

export function poseLogFor(sessionId: string): PoseSample[] {
  return logs.get(sessionId) ?? [];
}
