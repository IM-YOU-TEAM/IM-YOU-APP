import { router, usePathname, useSegments, type Href } from 'expo-router';
import { useEffect } from 'react';
import type { Role } from './auth';
import { useAuth, type AuthStatus } from './AuthProvider';

/** Where someone belongs right now, or null when the current screen is already right. */
function destination(status: AuthStatus, role: Role | null, group: string | undefined, pathname: string): Href | null {
  // The scanned second phone of a sensor session has no account, whoever is signed in on it.
  if (group === 'pair') return null;
  switch (status) {
    case 'loading':
    case 'error':
      return null;
    case 'signedOut':
      return pathname === '/login' ? null : '/login';
    case 'signedIn':
      if (role === null) return pathname === '/signup' ? null : '/signup';
      if (role === 'patient') return group === '(patient)' ? null : '/home';
      return group === '(clinician)' ? null : '/dashboard';
    default: {
      const unexpected: never = status;
      return unexpected;
    }
  }
}

/** Keeps each person on their side of the app: sign-in, role setup, patient, or clinician. */
export function useAuthGate(): void {
  const { status, profile } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const group = segments[0];
  const role = profile?.role ?? null;

  useEffect(() => {
    const target = destination(status, role, group, pathname);
    if (target) router.replace(target);
  }, [status, role, group, pathname]);
}
