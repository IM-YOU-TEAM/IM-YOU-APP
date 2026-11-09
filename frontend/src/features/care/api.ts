// Clinician <-> patient records. Clinicians create their patients' logins and see them by name.
import { createAccount } from '@/features/auth/auth';
import { parseTasks } from '@/lib/data';
import { localIso } from '@/lib/format';
import { supabase } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/database.types';
import type { CareTask, Patient, PatientStatus } from '@/types';

const ROSTER_COLUMNS =
  'id, full_name, care_code, owner_link, created_at, linked_at, assigned_motions, task_frequency, total:sessions(count), latest:sessions(started_at, gait_score)';

type RosterRow = {
  id: string;
  full_name: string | null;
  care_code: string;
  owner_link: string | null;
  created_at: string;
  linked_at: string | null;
  assigned_motions: string[];
  task_frequency: Json;
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
    name: row.full_name,
    careCode: row.care_code,
    status: statusOf(row.owner_link),
    createdAt: localIso(new Date(row.created_at)),
    linkedAt: row.linked_at ? localIso(new Date(row.linked_at)) : null,
    sessionCount: row.total[0]?.count ?? 0,
    latest: latest ? { date: localIso(new Date(latest.started_at)), gaitScore: latest.gait_score } : null,
    tasks: parseTasks(row.assigned_motions, row.task_frequency),
  };
}

/** The signed-in clinician sets which recordings this patient must do and how often. */
export async function setTasks(patientId: string, tasks: CareTask[]): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .update({
      assigned_motions: tasks.map((task) => task.motion),
      task_frequency: Object.fromEntries(tasks.map((task) => [task.motion, task.timesPerWeek])),
    })
    .eq('id', patientId);
  if (error) throw error;
}

/** The name to show for a patient. The care code is a link secret, never a stand-in for a name. */
export function patientName(patient: Pick<Patient, 'name'>): string {
  return patient.name ?? 'Unnamed patient';
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

/** The signed-in clinician adds a patient with a ready-to-use login to hand over. */
export async function addPatient(input: { fullName: string; login: string; password: string }): Promise<void> {
  await createAccount({ kind: 'patient', ...input });
}

/** A signed-in patient redeems their clinician's care code. Earlier sessions move with them. */
export async function claimCareCode(code: string): Promise<void> {
  const { error } = await supabase.rpc('claim_care_code', { p_code: code });
  if (error) throw error;
}
