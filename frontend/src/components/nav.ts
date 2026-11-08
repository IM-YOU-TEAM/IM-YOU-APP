import type { Href } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import type { IconName } from '@/types';

export type NavItem = {
  label: string;
  icon: IconName;
  href: Href;
  active?: boolean;
};

/** Sign out; the auth gate then shows /login. */
export const logout = () => {
  supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
};
