// The only tracked movement is one we can show with a real, public-domain clip.
import type { MotionType } from '@/types';

export type Protocol = {
  summary: string;
  /** Short citation shown on the card. */
  source: string;
  /** Coaching line on the live session screen. */
  cue: string;
  /** CDC STEADI demonstration. US government work, public domain. */
  video: { webm: string; mov: string };
};

/**
 * 30-second chair stand: Jones, Rikli & Beam, RQES 1999; filmed by CDC STEADI.
 * Phone-at-the-waist timing for this movement: Marques et al., Sensors 2021.
 */
export const PROTOCOLS: Record<MotionType, Protocol> = {
  chairStand: {
    summary: 'Arms folded, as many full stands as you can in 30 seconds',
    source: '30-second chair stand · Jones 1999',
    cue: 'Stand and sit as many times as you can. This test lasts 30 seconds.',
    video: {
      webm: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/30-Second_Chair_Stand_Test.webm',
      mov: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/d/d5/30-Second_Chair_Stand_Test.webm/30-Second_Chair_Stand_Test.webm.360p.mpeg4.mov',
    },
  },
};

export const PROTOCOL_ORDER: MotionType[] = ['chairStand'];
