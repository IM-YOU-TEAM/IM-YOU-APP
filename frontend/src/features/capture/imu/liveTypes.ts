import type { MotionType } from '@/types';

/** What the live API can predict. The two ramp classes exist in the checkpoint but
 * were never performed on a phone, so the service does not report them. */
export type ModelActivity = 'walking' | 'ramp_ascent' | 'ramp_descent' | 'stair_ascent' | 'stair_descent';

export type JointName = 'hip_flexion_r' | 'knee_angle_r' | 'ankle_angle_r';

/** Sent once when a client connects, so the UI never hardcodes the model's shape. */
export type LiveContract = {
  type: 'hello';
  sample_rate_hz: number;
  window_samples: number;
  hop_samples: number;
  seconds_per_window: number;
  seconds_between_windows: number;
  classes: ModelActivity[];
  reported_classes: ModelActivity[];
  targets: JointName[];
  angle_units: 'degrees';
  checkpoint_sha256: string;
  caveats: string[];
};

export type LiveStatus = {
  type: 'status';
  receiver_connected: boolean;
  session_id: string | null;
  recording: boolean;
  observed_hz: Record<string, number>;
  windows_sent: number;
};

/** One 2.5 s window of results. `usable` is false when the motion gate rejected it. */
export type LiveWindow = {
  type: 'window';
  index: number;
  start_s: number;
  end_s: number;
  usable: boolean;
  reason: string | null;
  /** Null when the gate rejected the window: there is no activity to report. */
  activity: ModelActivity | null;
  activity_restricted: ModelActivity | '';
  activity_unrestricted: ModelActivity | '';
  confidence: number;
  scores: Record<string, number>;
  angles: Record<JointName, number[]>;
  summary: Record<JointName, { min: number; max: number; mean: number }>;
};

export type LiveMessage = LiveContract | LiveStatus | LiveWindow;

/** The model splits stairs by direction; the app asks for one 'stairs'. */
export const ACTIVITY_TO_MOTION: Record<ModelActivity, MotionType | null> = {
  walking: 'walking',
  stair_ascent: 'stairs',
  stair_descent: 'stairs',
  ramp_ascent: null,
  ramp_descent: null,
};

export const ACTIVITY_LABELS: Record<ModelActivity, string> = {
  walking: 'Walking',
  stair_ascent: 'Stairs up',
  stair_descent: 'Stairs down',
  ramp_ascent: 'Ramp up',
  ramp_descent: 'Ramp down',
};

/** Phone sensors cannot measure these: the model was never trained on them. */
export const IMU_SUPPORTED: MotionType[] = ['walking', 'stairs'];
