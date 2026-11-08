import { useCallback, useRef, useState } from 'react';
import { LOCAL_PATIENT_ID } from '@/lib/data';
import type { MotionType } from '@/types';
import { createPoseAccumulator, type LiveReadout, type PoseAccumulator, type RecordedSession } from './metrics';
import type { PoseFrame } from './poseTypes';

function sameReadout(a: LiveReadout, b: LiveReadout): boolean {
  return (
    a.count === b.count &&
    a.unit === b.unit &&
    a.inFrame === b.inFrame &&
    a.seenPerson === b.seenPerson &&
    a.cue?.text === b.cue?.text &&
    a.cue?.tone === b.cue?.tone
  );
}

/** Records landmark frames for one session and turns them into the numbers Results shows. */
export function usePoseSession(motion: MotionType | null) {
  const resolved = motion ?? 'walking';
  const acc = useRef<PoseAccumulator>(createPoseAccumulator(resolved));
  if (acc.current.motion !== resolved) acc.current = createPoseAccumulator(resolved);

  const [live, setLive] = useState<LiveReadout>(() => acc.current.readout());

  const onFrame = useCallback((frame: PoseFrame | null) => {
    const next = acc.current.push(frame);
    setLive((prev) => (sameReadout(prev, next) ? prev : next));
  }, []);

  const finish = useCallback(
    (durationSec: number): RecordedSession | null => {
      if (motion == null) return null;
      return acc.current.finish(durationSec, LOCAL_PATIENT_ID);
    },
    [motion],
  );

  return { ...live, onFrame, finish };
}
