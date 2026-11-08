import { useEffect, useState } from 'react';
import { publicFileUrl, selectRows } from '@/lib/supabase';
import type { MotionType } from '@/types';

export type ExerciseClip = { video: string; poster: string | null; credit: string };

type ClipRow = { movement_type: string; video_path: string; poster_path: string | null; credit: string };

const BUCKET = 'exercise-clips';

let loaded: Map<string, ExerciseClip> | null = null;
let request: Promise<Map<string, ExerciseClip>> | null = null;

// The table holds one row per movement, so fetch it once and reuse it on every screen.
function loadClips(): Promise<Map<string, ExerciseClip>> {
  request ??= selectRows<ClipRow>('exercise_clips', 'select=movement_type,video_path,poster_path,credit').then((rows) => {
    const clips = new Map<string, ExerciseClip>();
    for (const row of rows ?? []) {
      const video = publicFileUrl(BUCKET, row.video_path);
      if (!video) continue;
      const poster = row.poster_path ? publicFileUrl(BUCKET, row.poster_path) : null;
      clips.set(row.movement_type, { video, poster, credit: row.credit });
    }
    if (rows) loaded = clips;
    else request = null; // offline or misconfigured: try again on the next screen
    return clips;
  });
  return request;
}

/** The demonstration clip for a movement: undefined while loading, null when it has none. */
export function useExerciseClip(motion: MotionType | null): ExerciseClip | null | undefined {
  const [clip, setClip] = useState<ExerciseClip | null | undefined>(() =>
    motion && loaded ? (loaded.get(motion) ?? null) : undefined,
  );

  useEffect(() => {
    if (!motion) return;
    let alive = true;
    loadClips().then((clips) => {
      if (alive) setClip(clips.get(motion) ?? null);
    });
    return () => {
      alive = false;
    };
  }, [motion]);

  return clip;
}
