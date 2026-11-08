import { Redirect } from 'expo-router';
import { homeFor, useAuth } from '@/features/auth/AuthProvider';

export default function Index() {
  const { session, role, ready, roleReady } = useAuth();

  // Hold the Honeydew background until the stored session is known, so a
  // signed-in user never sees the login screen flash past.
  if (!ready) return null;
  if (!session) return <Redirect href="/login" />;
  // The profile lookup lands a moment after the session does.
  if (!roleReady) return null;
  // Signed in but never finished setup: the role is still null in the database.
  if (role == null) return <Redirect href="/onboarding" />;

  return <Redirect href={homeFor(role)} />;
}
