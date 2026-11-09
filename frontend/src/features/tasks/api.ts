// Task ticks in Supabase. Patients tick and untick their own; their clinician can read them.
import { parseMotion } from '@/features/capture/params';
import { supabase } from '@/lib/supabase/client';
import type { MotionType } from '@/types';
import type { TaskCheck } from './progress';

/** A patient's ticks from `since` ("YYYY-MM-DD") on. */
export async function fetchTaskChecks(patientId: string, since: string): Promise<TaskCheck[]> {
  const { data, error } = await supabase
    .from('task_checks')
    .select('motion, done_on')
    .eq('patient_id', patientId)
    .gte('done_on', since);
  if (error) throw error;
  return data.flatMap((row) => {
    const motion = parseMotion(row.motion);
    return motion ? [{ motion, day: row.done_on }] : [];
  });
}

export async function tickTask(patientId: string, motion: MotionType, day: string): Promise<void> {
  const { error } = await supabase
    .from('task_checks')
    .upsert({ patient_id: patientId, motion, done_on: day }, { ignoreDuplicates: true });
  if (error) throw error;
}

export async function untickTask(patientId: string, motion: MotionType, day: string): Promise<void> {
  const { error } = await supabase
    .from('task_checks')
    .delete()
    .eq('patient_id', patientId)
    .eq('motion', motion)
    .eq('done_on', day);
  if (error) throw error;
}
