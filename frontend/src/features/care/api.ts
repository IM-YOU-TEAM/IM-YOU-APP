// Clinician <-> patient linking. Patients are only ever a random id plus a care code.
import { localIso } from '@/lib/format';
import { supabase } from '@/lib/supabase/client';
import type { Patient, PatientStatus } from '@/types';

const ROSTER_COLUMNS =
  'id, care_code, owner_link, created_at, linked_at, total:sessions(count), latest:sessions(started_at, gait_score)';

type RosterRow = {
  id: string;
  care_code: string;
  owner_link: string | null;
  created_at: string;
  linked_at: string | null;
  total: { count: number }[];
  latest: { started_at: string; gait_score: number }[];
};

function statusOf(ownerLink: string | null): PatientStatus {
  if (ownerLink == null) return 'waiting';
  return ownerLink.startsWith('deleted:') ? 'closed' : 'linked';
}

function toPatient(row: RosterRow): Patient {
  const latest = row.latest[0];
  return {
    id: row.id,
    careCode: row.care_code,
    status: statusOf(row.owner_link),
    createdAt: localIso(new Date(row.created_at)),
    linkedAt: row.linked_at ? localIso(new Date(row.linked_at)) : null,
    sessionCount: row.total[0]?.count ?? 0,
    latest: latest ? { date: localIso(new Date(latest.started_at)), gaitScore: latest.gait_score } : null,
  };
}

/** The signed-in clinician's patients, newest profile first. */
export async function fetchRoster(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select(ROSTER_COLUMNS)
    .order('created_at', { ascending: false })
    .order('started_at', { referencedTable: 'latest', ascending: false })
    .limit(1, { referencedTable: 'latest' });
  if (error) throw error;
  return data.map(toPatient);
}

/** One patient on the signed-in clinician's roster, or null when it is not theirs. */
export async function fetchRosterPatient(id: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .select(ROSTER_COLUMNS)
    .eq('id', id)
    .order('started_at', { referencedTable: 'latest', ascending: false })
    .limit(1, { referencedTable: 'latest' })
    .maybeSingle();
  if (error) throw error;
  return data ? toPatient(data) : null;
}

/** New unclaimed patient profile. Hand its care code to the patient so they can join. */
export async function createPatientProfile(): Promise<{ id: string; careCode: string }> {
  const { data, error } = await supabase.rpc('create_patient_profile');
  if (error) throw error;
  return { id: data.id, careCode: data.care_code };
}

/** A signed-in patient redeems their clinician's care code. Earlier sessions move with them. */
export async function claimCareCode(code: string): Promise<void> {
  const { error } = await supabase.rpc('claim_care_code', { p_code: code });
  if (error) throw error;
}
