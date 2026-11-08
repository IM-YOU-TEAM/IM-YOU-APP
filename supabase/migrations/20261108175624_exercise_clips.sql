-- Short demonstration clips, one per movement type. Movements without a row show the setup drawing.
create table public.exercise_clips (
  movement_type text primary key check (movement_type in ('walking', 'running', 'stairs', 'sitToStand')),
  video_path text not null,
  poster_path text,
  credit text not null,
  source_url text not null,
  created_at timestamptz not null default now()
);

alter table public.exercise_clips enable row level security;

create policy "Anyone can read exercise clips"
  on public.exercise_clips for select
  to anon, authenticated
  using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-clips', 'exercise-clips', true, 5242880, array['video/mp4', 'image/jpeg'])
on conflict (id) do nothing;

insert into public.exercise_clips (movement_type, video_path, poster_path, credit, source_url)
values (
  'sitToStand',
  'sit-to-stand.mp4',
  'sit-to-stand.jpg',
  'CDC STEADI chair stand demonstration (public domain)',
  'https://commons.wikimedia.org/wiki/File:30-Second_Chair_Stand_Test.webm'
);
