import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { EVENTS, SITES, type PhonePresence, type Site } from './protocol';
import { myImuTopic } from './topic';

export type PairGate =
  /** Resolving the topic and joining the channel. */
  | 'connecting'
  /** The account has no patient record, so there is no stream to join. */
  | 'not-a-patient'
  /** The channel refused us, or the network is down. */
  | 'unreachable'
  /** On the channel, waiting for this phone to be told where it is strapped. */
  | 'choose-site'
  /** This phone has a site; the other one has not arrived yet. */
  | 'waiting-for-peer'
  /** Both the thigh and the shin are present. The model can be fed. */
  | 'paired';

export type Pairing = {
  gate: PairGate;
  mySite: Site | null;
  /** Stable id for this tab, used so Start/Stop only reset the model once. */
  clientKey: string;
  /** Sites currently held by other phones on this account. */
  peerSites: Site[];
  /** Sites nobody holds yet, so a phone cannot claim an occupied one. */
  freeSites: Site[];
  claim: (site: Site) => Promise<void>;
  /** Updates what this phone advertises, e.g. its delivered sensor rate. */
  advertise: (patch: Partial<Omit<PhonePresence, 'site'>>) => Promise<void>;
  /** Publishes on the shared topic. No-op before the channel is joined. */
  publish: (event: string, payload: object) => void;
};

/** One presence entry per connection, so two phones never collide on a key. */
function newKey(): string {
  const random = globalThis.crypto?.randomUUID?.();
  return random ?? `phone-${Math.random().toString(36).slice(2)}`;
}

/**
 * Joins the patient's private IMU topic and tracks which phone is where.
 *
 * Pairing is implicit: both phones are signed into the same account, so they
 * resolve the same topic and find each other through presence. There is no code
 * to type. What each phone still has to say is where it is strapped, because
 * the model needs the shank and thigh channels in a fixed order.
 */
export function usePairing(
  enabled: boolean,
  onBroadcast?: (event: string, payload: unknown) => void,
): Pairing {
  const [gate, setGate] = useState<PairGate>('connecting');
  const [mySite, setMySite] = useState<Site | null>(null);
  const [peerSites, setPeerSites] = useState<Site[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const keyRef = useRef<string>(newKey());
  // Presence has to be re-tracked whenever we change what we advertise, so the
  // latest payload is kept here rather than read from stale state.
  const selfRef = useRef<PhonePresence | null>(null);
  const onBroadcastRef = useRef(onBroadcast);
  onBroadcastRef.current = onBroadcast;

  useEffect(() => {
    if (!enabled) {
      setGate('connecting');
      return;
    }

    let stopped = false;
    let channel: RealtimeChannel | null = null;

    const join = async () => {
      const topic = await myImuTopic();
      if (stopped) return;
      if (!topic) {
        setGate('not-a-patient');
        return;
      }

      // Private channels authorize against the access token held by the
      // realtime client, which is not refreshed for us on every join.
      await supabase.realtime.setAuth();
      if (stopped) return;

      channel = supabase.channel(topic, {
        config: {
          private: true,
          presence: { key: keyRef.current },
          // Our own samples are already in hand; echoing them back wastes the quota.
          broadcast: { self: false },
        },
      });
      channelRef.current = channel;

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel?.presenceState<PhonePresence>() ?? {};
        const peers: Site[] = [];
        for (const [key, entries] of Object.entries(state)) {
          if (key === keyRef.current) continue;
          for (const entry of entries) {
            if (entry.site) peers.push(entry.site);
          }
        }
        setPeerSites(peers);
      });

      for (const event of Object.values(EVENTS)) {
        channel.on('broadcast', { event }, (message) => {
          onBroadcastRef.current?.(event, message.payload);
        });
      }

      channel.subscribe((status) => {
        if (stopped) return;
        if (status === 'SUBSCRIBED') {
          setGate((prev) => (prev === 'connecting' || prev === 'unreachable' ? 'choose-site' : prev));
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setGate('unreachable');
        }
      });
    };

    void join();

    return () => {
      stopped = true;
      if (channel) void supabase.removeChannel(channel);
      channelRef.current = null;
      selfRef.current = null;
      setMySite(null);
      setPeerSites([]);
    };
  }, [enabled]);

  // Derived gate: a site of our own plus the other site present means paired.
  useEffect(() => {
    setGate((prev) => {
      if (prev === 'connecting' || prev === 'not-a-patient' || prev === 'unreachable') return prev;
      if (mySite == null) return 'choose-site';
      const other = SITES.find((site) => site !== mySite);
      return other != null && peerSites.includes(other) ? 'paired' : 'waiting-for-peer';
    });
  }, [mySite, peerSites]);

  const claim = useCallback(async (site: Site) => {
    const channel = channelRef.current;
    if (!channel) return;
    const next: PhonePresence = { site, hz: 0, sensing: false };
    selfRef.current = next;
    await channel.track(next);
    setMySite(site);
  }, []);

  const advertise = useCallback(async (patch: Partial<Omit<PhonePresence, 'site'>>) => {
    const channel = channelRef.current;
    const current = selfRef.current;
    if (!channel || !current) return;
    const next = { ...current, ...patch };
    selfRef.current = next;
    await channel.track(next);
  }, []);

  const publish = useCallback((event: string, payload: object) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  const freeSites = SITES.filter((site) => !peerSites.includes(site));

  return {
    gate,
    mySite,
    clientKey: keyRef.current,
    peerSites,
    freeSites,
    claim,
    advertise,
    publish,
  };
}

export { EVENTS };
