import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { MotionType } from '@/types';

export type ExerciseClip = { video: string; poster: string | null; credit: string };

const BUCKET = 'exercise-clips';

let loaded: Map<string, ExerciseClip> | null = null;
let request: Promise<Map<string, ExerciseClip>> | null = null;

async function fetchClips(): Promise<Map<string, ExerciseClip>> {
  const { data, error } = await supabase
    .from('exercise_clips')
    .select('movement_type, video_path, poster_path, credit');
  const clips = new Map<string, ExerciseClip>();
  if (error) {
    request = null;
    return clips;
  }
  for (const row of data) {
    const video = supabase.storage.from(BUCKET).getPublicUrl(row.video_path).data.publicUrl;
    const poster = row.poster_path
      ? supabase.storage.from(BUCKET).getPublicUrl(row.poster_path).data.publicUrl
      : null;
    clips.set(row.movement_type, { video, poster, credit: row.credit });
  }
  loaded = clips;
  return clips;
}

// The table holds one row per movement, so fetch it once and reuse it on every screen.
function loadClips(): Promise<Map<string, ExerciseClip>> {
  const pending = request ?? fetchClips();
  request = pending;
  return pending;
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
