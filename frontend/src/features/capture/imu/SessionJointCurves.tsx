import { fetchJointTrace } from '@/features/results/api';
import { useLoader } from '@/lib/useLoader';
import type { Session } from '@/types';
import { JointCurves } from './JointCurves';
import { padTrace, traceFromWindow } from './jointTrace';

type Props = {
  session: Pick<Session, 'id' | 'method' | 'motion' | 'jointAngles' | 'durationSec'> | undefined;
  /** Shown when there is no sensor session with joint angles. */
  caption?: string;
};

/** A sensor session's whole-session joint angles. Older sessions show their one saved 2.5 s window. */
export function SessionJointCurves({ session, caption }: Props) {
  const id = session?.method === 'imu' ? session.id : undefined;
  const loaded = useLoader(() => (id ? fetchJointTrace(id) : Promise.resolve(null)), [id]);

  if (!session || session.method !== 'imu') return <JointCurves trace={null} caption={caption} />;
  if (loaded.data === undefined && loaded.error == null) return <JointCurves trace={undefined} />;
  // The chart spans the whole recording, even where the model scored nothing.
  if (loaded.data) return <JointCurves key={session.id} trace={padTrace(loaded.data, session.durationSec)} motion={session.motion} />;
  if (session.jointAngles) return <JointCurves key={session.id} trace={traceFromWindow(session.jointAngles)} motion={session.motion} excerpt />;
  return <JointCurves trace={null} caption={caption ?? 'This session has no joint angles.'} />;
}
