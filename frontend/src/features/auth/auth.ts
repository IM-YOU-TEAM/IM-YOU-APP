import { FunctionsHttpError, type User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase/client';

export type Role = 'patient' | 'clinician';

let chosenRole: Role | null = null;

/** Remember whether someone came in as a patient or a professional, so first-time setup doesn't ask again. */
export function chooseRole(role: Role): void {
  chosenRole = role;
}

/** The role picked on the sign-in screen: saved with the sign-up, or picked during this visit. */
export function preferredRole(user: User | undefined): Role | null {
  const fromSignUp: unknown = user?.user_metadata.role;
  return parseRole(typeof fromSignUp === 'string' ? fromSignUp : null) ?? chosenRole;
}

/** Supabase calls Microsoft sign-in "azure". */
export type SocialProvider = 'apple' | 'google' | 'azure';

export type ProviderFlags = Record<SocialProvider, boolean>;

export const PROVIDER_LABELS: Record<SocialProvider, string> = {
  apple: 'Apple',
  google: 'Google',
  azure: 'Microsoft',
};

export function parseRole(value: string | null): Role | null {
  return value === 'patient' || value === 'clinician' ? value : null;
}

/** Where OAuth and email links return to. Each one must be listed in Supabase Auth > URL Configuration. */
export function authRedirectUrl(): string {
  if (Platform.OS === 'web') return typeof window === 'undefined' ? '' : window.location.origin;
  return Linking.createURL('/');
}

let providerFlags: Promise<ProviderFlags | null> | null = null;

/** Which social providers are switched on in the Supabase dashboard. Null when the check itself failed. */
export function getEnabledProviders(): Promise<ProviderFlags | null> {
  providerFlags ??= fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } })
    .then(async (res) => {
      if (!res.ok) throw new Error(`settings ${res.status}`);
      const settings: { external?: Partial<ProviderFlags> } = await res.json();
      const external = settings.external ?? {};
      return { apple: !!external.apple, google: !!external.google, azure: !!external.azure };
    })
    .catch(() => {
      providerFlags = null;
      return null;
    });
  return providerFlags;
}

/**
 * Web leaves the page for the provider and comes back with ?code=, which the client exchanges on load.
 * Native opens an in-app browser session and exchanges the code here.
 */
export async function signInWithProvider(provider: SocialProvider): Promise<'redirected' | 'signedIn' | 'cancelled'> {
  const redirectTo = authRedirectUrl();
  const scopes = provider === 'azure' ? 'email' : undefined;

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, scopes } });
    if (error) throw error;
    return 'redirected';
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, scopes, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return 'cancelled';
  await completeAuthFromUrl(result.url);
  return 'signedIn';
}

/** Finish a sign-in from a redirect URL (OAuth or an email link). False when the URL carries no auth code. */
export async function completeAuthFromUrl(url: string): Promise<boolean> {
  const { queryParams } = Linking.parse(url);
  const description = queryParams?.error_description;
  if (typeof description === 'string') throw new Error(description);
  const code = queryParams?.code;
  if (typeof code !== 'string') return false;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  return true;
}

// Keep in step with supabase/functions/create-account: a username signs in as <username>@users.imu.app.
const USERNAME_DOMAIN = 'users.imu.app';
export const MIN_PASSWORD = 6;

/** A username or an email, as typed on the sign-in screen. */
export function isValidLogin(login: string): boolean {
  const value = login.trim().toLowerCase();
  return value.includes('@') ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : /^[a-z0-9][a-z0-9._-]{2,23}$/.test(value);
}

function loginEmail(login: string): string {
  const value = login.trim().toLowerCase();
  return value.includes('@') ? value : `${value}@${USERNAME_DOMAIN}`;
}

/** Sign in with a username or an email. */
export async function signIn(login: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: loginEmail(login), password });
  if (error) throw error;
}

export type NewAccount =
  | { kind: 'clinician'; login: string; password: string; displayName: string }
  | { kind: 'patient'; login: string; password: string; fullName: string };

/** Creates a confirmed login. Patients can only be added by their signed-in clinician. */
export async function createAccount(account: NewAccount): Promise<void> {
  const { error } = await supabase.functions.invoke('create-account', { body: account });
  if (!error) return;
  // The function answers refusals with { code }, which friendlyError understands.
  if (error instanceof FunctionsHttpError) {
    const body: unknown = await error.context.json().catch(() => null);
    if (body && typeof body === 'object' && 'code' in body && typeof body.code === 'string') {
      throw Object.assign(new Error(body.code), { code: body.code });
    }
  }
  throw error;
}

/** A doctor or researcher creates their own account and is signed straight in. */
export async function signUpClinician(input: { login: string; password: string; displayName: string }): Promise<void> {
  await createAccount({ kind: 'clinician', ...input });
  await signIn(input.login, input.password);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

/** Set the role once. Patients may redeem a clinician's care code; clinicians may set the name patients see. */
export async function completeOnboarding(input: { role: Role; displayName?: string; careCode?: string }): Promise<void> {
  const { error } = await supabase.rpc('complete_onboarding', {
    p_role: input.role,
    p_display_name: input.displayName?.trim() || undefined,
    p_care_code: input.careCode?.trim() || undefined,
  });
  if (error) throw error;
}
