import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** Any valid Ionicons name, e.g. 'walk' or 'chevron-forward'. */
export type IconName = ComponentProps<typeof Ionicons>['name'];

export type MotionType = 'walking' | 'running' | 'stairs' | 'sitToStand';

/** 'cv' = phone camera (computer vision), 'imu' = phone motion sensors. */
export type CaptureMethod = 'cv' | 'imu';

/** 'waiting' = created by a clinician, not claimed yet. 'closed' = the patient deleted their account. */
export type PatientStatus = 'waiting' | 'linked' | 'closed';

/** A patient as their clinician sees them. Only the clinician and the patient can read the name. */
export type Patient = {
  id: string;
  /** Null only for profiles made before clinicians named their patients. */
  name: string | null;
  careCode: string;
  status: PatientStatus;
  createdAt: string; // local ISO date-time
  linkedAt: string | null; // local ISO date-time
  sessionCount: number;
  latest: { date: string; gaitScore: number } | null;
};

export type Session = {
  id: string;
  patientId: string;
  date: string; // local ISO date-time, e.g. "2026-11-07T09:30:00"
  motion: MotionType;
  method: CaptureMethod;
  durationSec: number;
  gaitScore: number; // 0-100, in-app summary of this recording
  cadence: number; // steps/min (reps/min for sit-to-stand)
  symmetry: number; // left/right symmetry, %. 0 when it was not measured
  /** False when left and right were not compared. */
  symmetryMeasured?: boolean;
  /** True when a person was in frame but the far leg stayed hidden. */
  farLegHidden?: boolean;
  stepCount?: number; // walking, running, stairs
  reps?: number; // sit-to-stand
};

export type Feedback = {
  id: string;
  sessionId: string;
  clinicianName: string;
  date: string; // local ISO date-time
  text: string;
};

/** A label for every value of a union, e.g. Labels<MotionType>. */
export type Labels<T extends string> = Record<T, string>;
