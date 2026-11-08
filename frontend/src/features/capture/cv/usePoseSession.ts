import { useCallback, useEffect, useRef, useState } from 'react';
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
    a.framing === b.framing &&
    a.movementState === b.movementState &&
    a.detectedMotion === b.detectedMotion &&
    a.captureStarted === b.captureStarted
  );
}

/** Records landmark frames for one session and turns them into the numbers Results shows. */
export function usePoseSession(motion: MotionType | null, paused: boolean) {
  const resolved = motion ?? 'walking';
  const acc = useRef<PoseAccumulator>(createPoseAccumulator(resolved));
  if (acc.current.motion !== resolved) acc.current = createPoseAccumulator(resolved);

  const [live, setLive] = useState<LiveReadout>(() => acc.current.readout());

  useEffect(() => {
    acc.current.setPaused(paused);
  }, [motion, paused]);

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
