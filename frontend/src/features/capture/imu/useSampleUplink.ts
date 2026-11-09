import { useCallback, useEffect, useRef, useState } from 'react';
import { connectSocket, liveSocketUrl, type LiveSocket } from './liveClient';
import type { MotionStream } from './motionTypes';
import { DEVICE_ID, type ImuSample, type Site } from './protocol';

const BATCH_SIZE = 10;
const BATCH_MS = 80;

/**
 * This phone's socket to the model, fed in small batches while `streaming()` is true.
 * The raw samples go nowhere else and are never kept.
 *
 * `clockShift()` returns the seconds to add to this phone's sample times to put them
 * on the signed-in phone's clock (0 on that phone), or null while it is unknown:
 * samples are held back then, since misaligned legs would mislead the model.
 */
export function useSampleUplink(
  enabled: boolean,
  site: Site | null,
  subscribe: MotionStream['subscribe'],
  streaming: () => boolean,
  clockShift: () => number | null = () => 0,
) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<LiveSocket | null>(null);
  const batchRef = useRef<ImuSample[]>([]);
  const siteRef = useRef(site);
  siteRef.current = site;
  const streamingRef = useRef(streaming);
  streamingRef.current = streaming;
  const clockShiftRef = useRef(clockShift);
  clockShiftRef.current = clockShift;

  const flush = useCallback(() => {
    const samples = batchRef.current;
    const at = siteRef.current;
    if (samples.length === 0 || at == null) return;
    batchRef.current = [];
    socketRef.current?.send({
      type: 'samples',
      device_id: DEVICE_ID[at],
      accel_units: 'm/s^2',
      gyro_units: 'deg/s',
      samples: samples.map((sample) => ({
        common_timestamp: sample.t,
        ax: sample.ax,
        ay: sample.ay,
        az: sample.az,
        gx: sample.gx,
        gy: sample.gy,
        gz: sample.gz,
      })),
    });
  }, []);

  const send = useCallback((message: object) => {
    socketRef.current?.send(message);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const socket = connectSocket(liveSocketUrl('/phone'), {
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
    });
    socketRef.current = socket;
    const timer = setInterval(flush, BATCH_MS);
    return () => {
      clearInterval(timer);
      socket.stop();
      socketRef.current = null;
      batchRef.current = [];
      setConnected(false);
    };
  }, [enabled, flush]);

  useEffect(() => {
    return subscribe((sample) => {
      if (!streamingRef.current()) return;
      const shift = clockShiftRef.current();
      if (shift == null) return;
      batchRef.current.push(shift === 0 ? sample : { ...sample, t: sample.t + shift });
      if (batchRef.current.length >= BATCH_SIZE) flush();
    });
  }, [subscribe, flush]);

  return { connected, send, flush };
}
