import type { HostPairing } from './pairingApi';
import { SITES, type Site } from './protocol';

/**
 * The signed-in phone keeps its pairing between visits to the session screen, so a second
 * phone scanned once (before a demo, say) stays connected across recordings, trips to the
 * results page and reloads. The database keeps a redeemed pairing open for 12 hours.
 */
const KEY = 'imu-host-pairing';
const LIFETIME_MS = 11.5 * 60 * 60 * 1000;

type Stored = HostPairing & { userId: string; createdAt: number; site: Site | null };

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** This user's pairing and the spot this phone took, if still inside its lifetime. */
export function loadHostPairing(userId: string): { pairing: HostPairing; site: Site | null } | null {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<Stored>;
    if (
      stored.userId !== userId ||
      typeof stored.code !== 'string' ||
      typeof stored.topic !== 'string' ||
      typeof stored.expiresAt !== 'number' ||
      typeof stored.createdAt !== 'number' ||
      Date.now() - stored.createdAt > LIFETIME_MS
    ) {
      return null;
    }
    const site = stored.site != null && SITES.includes(stored.site) ? stored.site : null;
    return { pairing: { code: stored.code, topic: stored.topic, expiresAt: stored.expiresAt }, site };
  } catch {
    return null;
  }
}

/** Remember a pairing. A new topic restarts the lifetime; the same topic keeps its start. */
export function saveHostPairing(userId: string, pairing: HostPairing, site: Site | null): void {
  try {
    const previous = storage()?.getItem(KEY);
    const old = previous ? (JSON.parse(previous) as Partial<Stored>) : null;
    const createdAt = old?.topic === pairing.topic && typeof old.createdAt === 'number' ? old.createdAt : Date.now();
    const stored: Stored = { ...pairing, userId, createdAt, site };
    storage()?.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Private mode: the phone just pairs fresh next time.
  }
}

export function clearHostPairing(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Nothing stored to clear.
  }
}
