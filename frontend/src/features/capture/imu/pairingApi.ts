import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase/client';

/** What the signed-in phone holds: the code it shows as a QR code, and the channel both phones meet on. */
export type HostPairing = {
  code: string;
  topic: string;
  /** Epoch ms. After this the code can no longer be scanned. */
  expiresAt: number;
};

/** A fresh one-time code. Retires this patient's earlier codes, so only the newest QR code works. */
export async function createPairing(): Promise<HostPairing | null> {
  const { data, error } = await supabase.rpc('create_imu_pairing');
  const row = data?.[0];
  if (error || !row) return null;
  return { code: row.code, topic: row.topic, expiresAt: Date.parse(row.code_expires_at) };
}

/** Redeems a scanned code for the channel topic. Null once it is used, replaced or past its 10 minutes. */
export async function claimPairing(code: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('claim_imu_pairing', { p_code: code });
  if (error) throw error;
  return typeof data === 'string' ? data : null;
}

/** The link inside the QR code. The iPhone camera opens it in Safari. */
export function pairingUrl(code: string): string {
  return Linking.createURL(`/pair/${code}`);
}
