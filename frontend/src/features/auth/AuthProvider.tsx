import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';

export type Role = 'patient' | 'clinician';

type AuthValue = {
  session: Session | null;
  /** Null when the profile row is missing or has not loaded yet. */
  role: Role | null;
  /** False until the stored session has been read, so routing does not flash. */
  ready: boolean;
  /**
   * True once the profile lookup has settled, whether or not it found a row.
   * Routing waits on this rather than on `role`, so a signed-in user with no
   * profile still lands somewhere instead of staring at a blank screen.
   */
  roleReady: boolean;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  role: null,
  ready: false,
  roleReady: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);
  const [roleReady, setRoleReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    // Calling back into supabase-js from this callback can deadlock it, so the
    // profile lookup lives in the effect below instead.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setRoleReady(false);
      return;
    }

    let current = true;
    setRoleReady(false);
    supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!current) return;
        setRole((data?.role as Role | undefined) ?? null);
        setRoleReady(true);
      });

    return () => {
      current = false;
    };
  }, [userId]);

  const value = useMemo(
    () => ({ session, role, ready, roleReady }),
    [session, role, ready, roleReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}

/** Where a signed-in user belongs. Clinicians get the dashboard, everyone else tracks. */
export function homeFor(role: Role | null): '/home' | '/dashboard' {
  return role === 'clinician' ? '/dashboard' : '/home';
}
