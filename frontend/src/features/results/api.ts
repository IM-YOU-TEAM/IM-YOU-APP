// Session summaries in Supabase. Only scores and counts are stored; video and landmarks stay on the device.
import { parseMethod, parseMotion } from '@/features/capture/params';
import { localIso, parseLocal } from '@/lib/format';
import { supabase } from '@/lib/supabase/client';
import type { Json, Tables } from '@/lib/supabase/database.types';
import type { Feedback, Session, SessionAssessmentMetric } from '@/types';

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
      },
    })
    .select(SESSION_COLUMNS)
    .single();
  if (error) throw error;
  return toSession(data);
}

function parseAssessment(metrics: Json): Partial<Session> {
  if (!isJsonRecord(metrics)) return {};

  const detectedMotion =
    typeof metrics.detectedMotion === 'string' ? parseMotion(metrics.detectedMotion) : null;
  const assessmentMetrics = Array.isArray(metrics.assessmentMetrics)
    ? metrics.assessmentMetrics.map(parseAssessmentMetric).filter((metric): metric is SessionAssessmentMetric => metric != null)
    : [];

  return {
    ...(typeof metrics.movementVerified === 'boolean'
      ? { movementVerified: metrics.movementVerified }
      : {}),
    ...(detectedMotion ? { detectedMotion } : {}),
    ...(typeof metrics.movementMatch === 'number' ? { movementMatch: metrics.movementMatch } : {}),
    ...(assessmentMetrics.length > 0 ? { assessmentMetrics } : {}),
  };
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
