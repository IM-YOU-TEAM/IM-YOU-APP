import { useEffect, useRef } from 'react';
import { EVENTS, encodePreview, type ImuSample, type Site } from './protocol';
import type { Pairing } from './usePairing';

/** Five broadcasts a second per pair keeps well inside the Realtime message quota. */
const SEND_MS = 200;

/**
 * Sends this phone's smoothed trace to the signed-in phone while `active`, so it can
 * draw both legs. Broadcast relays it without storing it.
 */
export function useTraceSender(active: boolean, site: Site | null, recent: ImuSample[], publish: Pairing['publish']) {
  const recentRef = useRef(recent);
  recentRef.current = recent;
  const publishRef = useRef(publish);
  publishRef.current = publish;

  useEffect(() => {
    if (!active || site == null) return;
    // From now on only: the trace already on screen here predates Start or the resume.
    let sent = recentRef.current[recentRef.current.length - 1]?.t ?? 0;
    const id = setInterval(() => {
      const fresh = recentRef.current.filter((sample) => sample.t > sent);
      if (fresh.length === 0) return;
      sent = fresh[fresh.length - 1].t;
      publishRef.current(EVENTS.preview, encodePreview(site, fresh));
    }, SEND_MS);
    return () => clearInterval(id);
  }, [active, site]);
}
