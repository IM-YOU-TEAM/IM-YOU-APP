// Session summaries in Supabase. Only scores, counts and the model's predicted joint angles are stored;
// video, landmarks and raw sensor samples never leave the device and the model service.
import { parseMethod, parseMotion } from '@/features/capture/params';
import { localIso, parseLocal } from '@/lib/format';
import { supabase } from '@/lib/supabase/client';
import type { Json, Tables } from '@/lib/supabase/database.types';
import type { Feedback, JointName, JointTrace, Session, SessionAssessmentMetric } from '@/types';

const SESSION_COLUMNS =
  'id, patient_id, motion, method, started_at, duration_sec, gait_score, cadence, symmetry, far_leg_hidden, step_count, reps, metrics';

type SessionRow = Pick<
  Tables<'sessions'>,
  | 'id'
  | 'patient_id'
  | 'motion'
  | 'method'
  | 'started_at'
  | 'duration_sec'
  | 'gait_score'
  | 'cadence'
  | 'symmetry'
  | 'far_leg_hidden'
  | 'step_count'
  | 'reps'
  | 'metrics'
>;

function toSession(row: SessionRow): Session {
  const motion = parseMotion(row.motion);
  const method = parseMethod(row.method);
  if (!motion || !method) throw new Error(`Session ${row.id} has an unknown motion or method.`);
  const assessment = parseAssessment(row.metrics);
  return {
    id: row.id,
    patientId: row.patient_id,
    date: localIso(new Date(row.started_at)),
    motion,
    method,
    durationSec: row.duration_sec,
    gaitScore: row.gait_score,
    cadence: Number(row.cadence),
    cadenceMeasured: method === 'cv' || Number(row.cadence) > 0,
    symmetry: row.symmetry == null ? 0 : Number(row.symmetry),
    symmetryMeasured: row.symmetry != null,
    farLegHidden: row.far_leg_hidden,
    ...(row.step_count != null ? { stepCount: row.step_count } : {}),
    ...(row.reps != null ? { reps: row.reps } : {}),
    ...assessment,
  };
}

/** A patient's sessions, oldest first. */
export async function fetchSessions(patientId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_COLUMNS)
    .eq('patient_id', patientId)
    .order('started_at', { ascending: true });
  if (error) throw error;
  return data.map(toSession);
}

/** Store a finished session's summary for the signed-in patient. Returns it with its database id. */
export async function saveSession(session: Session, patientId: string): Promise<Session> {
  // Session.date is when recording stopped; the database keeps when it started.
  const startedAt = new Date(parseLocal(session.date).getTime() - session.durationSec * 1000);
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      patient_id: patientId,
      motion: session.motion,
      method: session.method,
      started_at: startedAt.toISOString(),
      duration_sec: Math.round(session.durationSec),
      gait_score: Math.round(session.gaitScore),
      cadence: session.cadence,
      symmetry: session.symmetryMeasured === false ? null : session.symmetry,
      far_leg_hidden: session.farLegHidden ?? false,
      step_count: session.stepCount ?? null,
      reps: session.reps ?? null,
      metrics: {
        movementVerified: session.movementVerified ?? null,
        detectedMotion: session.detectedMotion ?? null,
        movementMatch: session.movementMatch ?? null,
        assessmentMetrics: session.assessmentMetrics ?? [],
        ...(session.jointAngles ? { jointAngles: session.jointAngles } : {}),
      },
    })
    .select(SESSION_COLUMNS)
    .single();
  if (error) throw error;
  if (session.jointTrace) await saveJointTrace(data.id, session.jointTrace);
  return toSession(data);
}

/**
 * Store a sensor session's whole timeline. The session row is already saved, so a failure here must not
 * fail the save (a retry would duplicate the session); screens fall back to its single saved window.
 */
async function saveJointTrace(sessionId: string, trace: JointTrace): Promise<void> {
  // The client reports failures in `error` instead of throwing, and that error is deliberately dropped.
  await supabase.from('session_joint_traces').insert({
    session_id: sessionId,
    sample_hz: trace.sampleHz,
    start_s: trace.startSec,
    hip: trace.angles.hip_flexion_r,
    knee: trace.angles.knee_angle_r,
    ankle: trace.angles.ankle_angle_r,
  });
}

/** A sensor session's whole timeline, or null for camera sessions and sessions saved before timelines. */
export async function fetchJointTrace(sessionId: string): Promise<JointTrace | null> {
  const { data, error } = await supabase
    .from('session_joint_traces')
    .select('sample_hz, start_s, hip, knee, ankle')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    sampleHz: data.sample_hz,
    startSec: data.start_s,
    angles: { hip_flexion_r: data.hip, knee_angle_r: data.knee, ankle_angle_r: data.ankle },
  };
}

function parseAssessment(metrics: Json): Partial<Session> {
  if (!isJsonRecord(metrics)) return {};

  const detectedMotion =
    typeof metrics.detectedMotion === 'string' ? parseMotion(metrics.detectedMotion) : null;
  const assessmentMetrics = Array.isArray(metrics.assessmentMetrics)
    ? metrics.assessmentMetrics.map(parseAssessmentMetric).filter((metric): metric is SessionAssessmentMetric => metric != null)
    : [];
  const jointAngles = parseJointAngles(metrics.jointAngles);

  return {
    ...(typeof metrics.movementVerified === 'boolean'
      ? { movementVerified: metrics.movementVerified }
      : {}),
    ...(detectedMotion ? { detectedMotion } : {}),
    ...(typeof metrics.movementMatch === 'number' ? { movementMatch: metrics.movementMatch } : {}),
    ...(assessmentMetrics.length > 0 ? { assessmentMetrics } : {}),
    ...(jointAngles ? { jointAngles } : {}),
  };
}

const JOINTS: JointName[] = ['hip_flexion_r', 'knee_angle_r', 'ankle_angle_r'];

function parseJointAngles(value: Json | undefined): Record<JointName, number[]> | null {
  if (value == null || !isJsonRecord(value)) return null;
  const series = JOINTS.map((joint) => {
    const raw = value[joint];
    return Array.isArray(raw) && raw.length > 1 && raw.every((v) => typeof v === 'number') ? (raw as number[]) : null;
  });
  const [hip, knee, ankle] = series;
  if (!hip || !knee || !ankle) return null;
  return { hip_flexion_r: hip, knee_angle_r: knee, ankle_angle_r: ankle };
}

function parseAssessmentMetric(value: Json): SessionAssessmentMetric | null {
  if (
    !isJsonRecord(value) ||
    typeof value.key !== 'string' ||
    typeof value.label !== 'string' ||
    typeof value.value !== 'number' ||
    typeof value.unit !== 'string'
  ) {
    return null;
  }
  return { key: value.key, label: value.label, value: value.value, unit: value.unit };
}

function isJsonRecord(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Clinician notes on a session, oldest first. */
export async function fetchNotes(sessionId: string): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from('session_notes')
    .select('id, session_id, body, created_at, clinician:profiles(display_name)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map((note) => ({
    id: note.id,
    sessionId: note.session_id,
    clinicianName: note.clinician?.display_name ?? 'Your clinician',
    date: localIso(new Date(note.created_at)),
    text: note.body,
  }));
}
