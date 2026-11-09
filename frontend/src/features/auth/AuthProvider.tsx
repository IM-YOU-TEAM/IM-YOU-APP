import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { parseTasks } from '@/lib/data';
import { supabase } from '@/lib/supabase/client';
import type { CareTask } from '@/types';
import { completeAuthFromUrl, parseRole, type Role } from './auth';

export type Profile = {
  id: string;
  role: Role | null;
  displayName: string | null;
};

/** The signed-in patient's record, created by their clinician. */
export type MyPatient = {
  id: string;
  fullName: string | null;
  careCode: string;
  clinicianId: string | null;
  clinicianName: string | null;
  tasks: CareTask[];
};

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'error';

type Account = { userId: string; profile: Profile | null; patient: MyPatient | null; failed: boolean };

type AuthValue = {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  patient: MyPatient | null;
  /** Re-read the profile and patient record, e.g. after onboarding or linking a clinician. */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('id, role, display_name').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, role: parseRole(data.role), displayName: data.display_name } : null;
}

async function fetchMyPatient(): Promise<MyPatient | null> {
  // RLS only returns the caller's own record to a patient.
  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, care_code, clinician_id, assigned_motions, task_frequency, clinician:profiles(display_name)')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    fullName: data.full_name,
    careCode: data.care_code,
    clinicianId: data.clinician_id,
    clinicianName: data.clinician?.display_name ?? null,
    tasks: parseTasks(data.assigned_motions, data.task_frequency),
  };
}

async function loadAccount(userId: string): Promise<Account> {
  const profile = await fetchProfile(userId);
  const patient = profile?.role === 'patient' ? await fetchMyPatient() : null;
  return { userId, profile, patient, failed: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionKnown, setSessionKnown] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionKnown(true);
    });
    // Keep this callback synchronous: calling Supabase from inside it can deadlock the auth client.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionKnown(true);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Email confirmation links opened on the phone come back as imu://?code=...
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handle = (url: string | null) => {
      if (url) completeAuthFromUrl(url).catch(() => undefined);
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  const load = useCallback(async (id: string) => {
    try {
      setAccount(await loadAccount(id));
    } catch {
      setAccount({ userId: id, profile: null, patient: null, failed: true });
    }
  }, []);

  useEffect(() => {
    if (userId) load(userId);
    else setAccount(null);
  }, [userId, load]);

  const refresh = useCallback(async () => {
    if (userId) await load(userId);
  }, [userId, load]);

  const value = useMemo<AuthValue>(() => {
    let status: AuthStatus;
    if (!sessionKnown) status = 'loading';
    else if (!userId) status = 'signedOut';
    else if (account?.userId !== userId) status = 'loading';
    else if (account.failed) status = 'error';
    else status = 'signedIn';

    const current = account?.userId === userId ? account : null;
    return {
      status,
      session,
      profile: current?.profile ?? null,
      patient: current?.patient ?? null,
      refresh,
    };
  }, [account, refresh, session, sessionKnown, userId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
