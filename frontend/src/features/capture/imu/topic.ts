import { supabase } from '@/lib/supabase/client';

/**
 * The private Realtime topic for a patient's live IMU stream.
 *
 * Both functions are database side, because the topic is keyed by the
 * pseudonymous `owner_link` and only the Vault key can derive it. Null means
 * the caller is not allowed to be on that channel, which the UI treats as a
 * gate rather than an error.
 */
export async function myImuTopic(): Promise<string | null> {
  const { data, error } = await supabase.rpc('my_imu_topic');
  if (error) return null;
  return data ?? null;
}

/** For a clinician watching one of their own patients. Null for anyone else. */
export async function patientImuTopic(patientId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('patient_imu_topic', { p_patient_id: patientId });
  if (error) return null;
  return data ?? null;
}
