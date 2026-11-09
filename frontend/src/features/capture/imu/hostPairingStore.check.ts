import { clearHostPairing, loadHostPairing, saveHostPairing } from './hostPairingStore';

function assert(ok: boolean, message: string): void {
  if (!ok) throw new Error(message);
}

// Node has no localStorage: a small in-memory stand-in.
const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  },
});

const pairing = { code: 'abc', topic: 'pair:1', expiresAt: Date.now() + 600_000 };

saveHostPairing('user-a', pairing, null);
assert(loadHostPairing('user-a')?.pairing.topic === 'pair:1', 'reused by the same account');
assert(loadHostPairing('user-b') === null, 'another account never gets it');

saveHostPairing('user-a', pairing, 'thigh');
assert(loadHostPairing('user-a')?.site === 'thigh', 'remembers the spot');

const stored = JSON.parse(memory.get('imu-host-pairing')!);
memory.set('imu-host-pairing', JSON.stringify({ ...stored, createdAt: Date.now() - 12 * 3600_000 }));
assert(loadHostPairing('user-a') === null, 'expires before the database closes it');

memory.set('imu-host-pairing', '{not json');
assert(loadHostPairing('user-a') === null, 'corrupt storage is ignored');

saveHostPairing('user-a', pairing, null);
clearHostPairing();
assert(loadHostPairing('user-a') === null, 'cleared');

console.log('host pairing store ok');
