import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { EVENTS, SITES, type PhonePresence, type Site } from './protocol';

export type PairGate =
  /** Waiting for a pairing topic, or joining its channel. */
  | 'connecting'
  /** The channel refused us, or the network is down. */
  | 'unreachable'
  /** On the channel; this phone has not taken a spot yet. */
  | 'choose-site'
  /** This phone has a spot; the other one has not arrived yet. */
  | 'waiting-for-peer'
  /** Both the thigh and the shin are present. The model can be fed. */
  | 'paired';

type Joined = 'connecting' | 'unreachable' | 'joined';

export type Pairing = {
  gate: PairGate;
  mySite: Site | null;
  /** Sites currently held by the other phone. */
  peerSites: Site[];
  /** Sites nobody holds yet, so a phone cannot claim an occupied one. */
  freeSites: Site[];
  claim: (site: Site) => Promise<void>;
  /** Publishes on the pairing topic. No-op before the channel is joined. */
  publish: (event: string, payload: object) => void;
};

/** One presence entry per connection, so two phones never collide on a key. */
function newKey(): string {
  const random = globalThis.crypto?.randomUUID?.();
  return random ?? `phone-${Math.random().toString(36).slice(2)}`;
}

/**
 * Joins a pairing's private Realtime topic and tracks which phone is where.
 *
 * The signed-in phone gets the topic when it creates the pairing; the scanned
 * phone gets it by redeeming the QR code. Each phone still says where it is
 * strapped, because the model needs the shank and thigh channels in a fixed order.
 */
export function usePairing(
  topic: string | null,
  onBroadcast?: (event: string, payload: unknown) => void,
  /** A spot this phone already took on this pairing, re-announced as soon as it joins. */
  initialSite: Site | null = null,
): Pairing {
  const [joined, setJoined] = useState<Joined>('connecting');
  const [mySite, setMySite] = useState<Site | null>(initialSite);
  const [peerSites, setPeerSites] = useState<Site[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const keyRef = useRef<string>(newKey());
  /** Survives a new topic, so a renewed code keeps this phone's spot. */
  const siteRef = useRef<Site | null>(initialSite);
  const onBroadcastRef = useRef(onBroadcast);
  onBroadcastRef.current = onBroadcast;

  useEffect(() => {
    if (!topic) {
      setJoined('connecting');
      return;
    }

    let stopped = false;
    let channel: RealtimeChannel | null = null;

    const join = async () => {
      // Private channels authorize against the access token held by the
      // realtime client, which is not refreshed for us on every join.
      await supabase.realtime.setAuth();
      if (stopped) return;

      channel = supabase.channel(topic, {
        config: {
          private: true,
          presence: { key: keyRef.current },
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
          const site = siteRef.current;
          if (site) {
            const presence: PhonePresence = { site };
            void channel?.track(presence);
          }
          setJoined('joined');
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setJoined('unreachable');
        }
      });
    };

    void join();

    return () => {
      stopped = true;
      if (channel) void supabase.removeChannel(channel);
      channelRef.current = null;
      setPeerSites([]);
      setJoined('connecting');
    };
  }, [topic]);

  const claim = useCallback(async (site: Site) => {
    const channel = channelRef.current;
    if (!channel) return;
    siteRef.current = site;
    const presence: PhonePresence = { site };
    await channel.track(presence);
    setMySite(site);
  }, []);

  const publish = useCallback((event: string, payload: object) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  // Memoised: callers keep this in effect dependencies, so a fresh array each render would loop.
  const freeSites = useMemo(() => SITES.filter((site) => !peerSites.includes(site)), [peerSites]);

  const other = mySite ? SITES.find((site) => site !== mySite) : undefined;
  const gate: PairGate =
    joined !== 'joined'
      ? joined
      : mySite == null
        ? 'choose-site'
        : other != null && peerSites.includes(other)
          ? 'paired'
          : 'waiting-for-peer';

  return { gate, mySite, peerSites, freeSites, claim, publish };
}

export { EVENTS };
