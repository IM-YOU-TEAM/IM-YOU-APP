import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** Any valid Ionicons name, e.g. 'walk' or 'chevron-forward'. */
export type IconName = ComponentProps<typeof Ionicons>['name'];

export type MotionType = 'walking' | 'running' | 'stairs' | 'sitToStand';

/** 'cv' = phone camera (computer vision), 'imu' = phone motion sensors. */
export type CaptureMethod = 'cv' | 'imu';

export type Exercise = {
  id: string;
  name: string;
  dosage: string; // e.g. "3 x 10 reps, daily"
  icon: IconName;
};

export type Patient = {
  id: string;
  name: string;
  age: number;
  condition: string;
  adherence: number; // % of prescribed sessions completed, 0-100
  exercises: Exercise[];
};

export type Clinician = {
  id: string;
  name: string;
  title: string;
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
  patientId: string;
  clinicianName: string;
  date: string; // local ISO date-time
  text: string;
};

/** A label for every value of a union, e.g. Labels<MotionType>. */
export type Labels<T extends string> = Record<T, string>;
