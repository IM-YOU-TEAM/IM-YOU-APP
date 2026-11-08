import { supabase } from '@/lib/supabase/client';
import type { Role } from './AuthProvider';

/**
 * The database raises these by name. Anything else is unexpected and its own
 * message is shown instead of being flattened into something vague.
 */
const MESSAGES: Record<string, string> = {
  invalid_code: 'That care code does not match an unclaimed patient record. Check it with your clinician.',
  already_linked: 'This account is already linked to a clinician.',
  role_already_set: 'This account already has a different role. Sign in again to continue.',
  patients_only: 'Care codes can only be redeemed by a patient account.',
  invalid_role: 'Pick whether you are a patient or a professional.',
  not_authenticated: 'Your session expired. Sign in again.',
};

export type Onboarding = {
  role: Role;
  /** Clinicians only. Patients never get a display name. */
  displayName?: string;
  /** Patients only, and optional: links this account to the clinician who issued it. */
  careCode?: string;
};

/**
 * Sets the role and, for patients, creates or claims the pseudonymous patient
 * record. `complete_onboarding` is the only way to set a role: the table itself
 * grants updates on `display_name` alone.
 *
 * Returns an empty string on success, or a message to show the person.
 */
export async function completeOnboarding({ role, displayName, careCode }: Onboarding): Promise<string> {
  const { error } = await supabase.rpc('complete_onboarding', {
    p_role: role,
    p_display_name: role === 'clinician' ? (displayName?.trim() ?? null) : null,
    p_care_code: role === 'patient' ? (careCode?.trim() ?? null) : null,
  });

  if (!error) return '';
  return MESSAGES[error.message] ?? error.message;
}
