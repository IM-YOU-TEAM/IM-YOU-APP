import { useCallback, useEffect, useRef, useState } from 'react';
import { TRACE_SECONDS } from './motionTypes';
import { decodePreview, EVENTS, type ImuSample, type Site } from './protocol';

/** Played this far behind the newest sample, so 200 ms batches scroll instead of jumping. */
const LAG_S = 0.35;
/** Further behind than this (a slow network, or a resume) and playback skips ahead. */
const MAX_LAG_S = 1;
const FRAME_MS = 33;

type Playback = { site: Site | null; samples: ImuSample[]; end: number };

const IDLE: Playback = { site: null, samples: [], end: 0 };

/**
 * The other phone's trace as it arrives over the pairing channel, replayed on a
 * steady clock while `active` so the signed-in phone can draw both legs before Start.
 * Pass `listen` to the pairing as its broadcast handler.
 */
export function usePeerTrace(active: boolean) {
  const buffer = useRef<ImuSample[]>([]);
  const siteRef = useRef<Site | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [playback, setPlayback] = useState<Playback>(IDLE);

  const listen = useCallback((event: string, payload: unknown) => {
    if (event !== EVENTS.preview || !activeRef.current) return;
    const preview = decodePreview(payload);
    if (!preview) return;
    if (preview.site !== siteRef.current) {
      siteRef.current = preview.site;
      buffer.current = [];
    }
    const samples = buffer.current;
    for (const sample of preview.samples) {
      if (samples.length === 0 || sample.t > samples[samples.length - 1].t) samples.push(sample);
    }
    const keepFrom = samples[samples.length - 1].t - TRACE_SECONDS - MAX_LAG_S;
    const stale = samples.findIndex((sample) => sample.t >= keepFrom);
    if (stale > 0) samples.splice(0, stale);
  }, []);

  useEffect(() => {
    buffer.current = [];
    setPlayback(IDLE);
    if (!active) return;

    let playhead: number | null = null;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - last) / 1000;
      last = now;
      const samples = buffer.current;
      if (samples.length === 0) return;
      const newest = samples[samples.length - 1].t;
      const next = playhead == null || newest - playhead > MAX_LAG_S ? newest - LAG_S : Math.min(playhead + elapsed, newest);
      if (next === playhead) return;
      playhead = next;
      const from = next - TRACE_SECONDS;
      setPlayback({
        site: siteRef.current,
        samples: samples.filter((sample) => sample.t >= from && sample.t <= next),
        end: next,
      });
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [active]);

  return { ...playback, listen };
}
