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

/** Right-leg joints the phone-sensor model predicts, named as its export names them. */
export type JointName = 'hip_flexion_r' | 'knee_angle_r' | 'ankle_angle_r';

export type SessionAssessmentMetric = {
  key: string;
  label: string;
  value: number;
  unit: string;
};

export type Session = {
  id: string;
  patientId: string;
  date: string; // local ISO date-time, e.g. "2026-11-07T09:30:00"
  motion: MotionType;
  method: CaptureMethod;
  durationSec: number;
  gaitScore: number; // 0-100 movement summary retained under the legacy field name
  cadence: number; // steps/min (reps/min for sit-to-stand)
  symmetry: number; // left/right symmetry, %. 0 when it was not measured
  /** False when left and right were not compared. */
  symmetryMeasured?: boolean;
  /** True when a person was in frame but the far leg stayed hidden. */
  farLegHidden?: boolean;
  stepCount?: number; // walking, running, stairs
  reps?: number; // sit-to-stand
  /** Whether the captured pose matched the movement selected before recording. */
  movementVerified?: boolean;
  /** Best heuristic match when enough movement was visible. */
  detectedMotion?: MotionType;
  /** 0-100 strength of the movement-pattern match; not a clinical confidence score. */
  movementMatch?: number;
  /** Motion-specific, descriptive measurements. They have no clinical pass/fail thresholds. */
  assessmentMetrics?: SessionAssessmentMetric[];
  /** Sensor sessions: the model's predicted angles in degrees over its most confident 2.5 s window. */
  jointAngles?: Record<JointName, number[]>;
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
