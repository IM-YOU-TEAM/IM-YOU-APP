import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { connectLive, liveApiUrl } from './liveClient';
import type { JointName, LiveMessage, ModelActivity } from './liveTypes';
import { ACTIVITY_LABELS } from './liveTypes';
import { SITES, type PhonePresence, type Site } from './protocol';
import { patientImuTopic } from './topic';

export type LiveWatch = {
  gate: 'connecting' | 'forbidden' | 'waiting-for-phones' | 'waiting-for-model' | 'live';
  sites: Site[];
  modelConnected: boolean;
  recording: boolean;
  activity?: string;
  confidence: number;
  lowMotion: boolean;
  reason?: string;
  angles?: Record<JointName, number[]>;
  observedHz: Record<string, number>;
};

const EMPTY: LiveWatch = {
  gate: 'connecting',
  sites: [],
  modelConnected: false,
  recording: false,
  confidence: 0,
  lowMotion: false,
  observedHz: {},
};

/**
 * Clinician view of one patient's stream: presence of the two phones plus
 * scored windows from the inference service.
 */
export function useLiveWatch(patientId: string | undefined): LiveWatch {
  const [live, setLive] = useState<LiveWatch>(EMPTY);

  useEffect(() => {
    if (!patientId) {
      setLive({ ...EMPTY, gate: 'forbidden' });
      return;
    }

    let stopped = false;
    let channel: RealtimeChannel | null = null;
    setLive(EMPTY);

    const stopViewer = connectLive(liveApiUrl(), {
      onOpen: () => setLive((prev) => ({ ...prev, modelConnected: true })),
      onClose: () => setLive((prev) => ({ ...prev, modelConnected: false })),
      onMessage: (message: LiveMessage) => {
        if (message.type === 'status') {
          setLive((prev) => ({
            ...prev,
            recording: message.recording,
            observedHz: message.observed_hz,
          }));
          return;
        }
        if (message.type !== 'window') return;
        const activity = message.activity as ModelActivity | null;
        setLive((prev) => ({
          ...prev,
          gate: 'live',
          lowMotion: !message.usable,
          reason: message.reason ?? undefined,
          confidence: message.confidence,
          angles: message.angles,
          activity: activity ? ACTIVITY_LABELS[activity] : prev.activity,
        }));
      },
    });

    const join = async () => {
      const topic = await patientImuTopic(patientId);
      if (stopped) return;
      if (!topic) {
        setLive((prev) => ({ ...prev, gate: 'forbidden' }));
        return;
      }
      await supabase.realtime.setAuth();
      if (stopped) return;

      const joined = supabase.channel(topic, {
        config: { private: true, presence: { key: `clinician-${patientId}` } },
      });
      channel = joined;
      if (stopped) {
        void supabase.removeChannel(joined);
        return;
      }

      joined.on('presence', { event: 'sync' }, () => {
        const sites: Site[] = [];
        for (const entries of Object.values(joined.presenceState<PhonePresence>())) {
          for (const entry of entries) {
            if (entry.site && !sites.includes(entry.site)) sites.push(entry.site);
          }
        }
        setLive((prev) => ({
          ...prev,
          sites,
          gate:
            prev.angles != null
              ? 'live'
              : SITES.every((site) => sites.includes(site))
                ? 'waiting-for-model'
                : 'waiting-for-phones',
        }));
      });

      joined.subscribe();
    };

    void join();

    return () => {
      stopped = true;
      stopViewer();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [patientId]);

  return live;
}
