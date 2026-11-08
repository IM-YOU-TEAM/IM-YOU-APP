import { useEffect, useState } from 'react';

/**
 * Seconds of animation time for the live drawings (skeleton, waveform).
 * Advances ~30 times a second while `running`, freezes otherwise.
 * Pass running=false when Reduce Motion is on to get a still frame.
 */
export function usePhase(running: boolean, start = 0.3): number {
  const [t, setT] = useState(start);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      if (now - last >= 33) {
        const dt = Math.min(now - last, 100) / 1000; // cap so a background tab doesn't jump
        last = now;
        setT((v) => v + dt);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return t;
}
