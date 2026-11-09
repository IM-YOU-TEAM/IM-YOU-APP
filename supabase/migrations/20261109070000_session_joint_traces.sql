-- The whole sensor session's predicted joint angles, not one 2.5 s window.
-- Overlapping model windows are averaged onto one timeline at sample_hz. Values keep the model's
-- own signs (OpenSim: knee flexion is negative); the app flips the knee for display.
-- Kept out of sessions.metrics so session lists stay small; a screen loads one trace at a time.

create table public.session_joint_traces (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  sample_hz smallint not null check (sample_hz between 1 and 100),
  -- Seconds from the start of recording to the first value.
  start_s real not null default 0 check (start_s >= 0),
  -- Null elements are gaps the model did not score (paused, or the motion gate rejected the window).
  hip real[] not null,
  knee real[] not null,
  ankle real[] not null,
  created_at timestamptz not null default now(),
  constraint session_joint_traces_shape check (
    cardinality(hip) between 2 and 72000
    and cardinality(knee) = cardinality(hip)
    and cardinality(ankle) = cardinality(hip)
  )
);

alter table public.session_joint_traces enable row level security;

-- Visible exactly when the session is: sessions RLS already limits it to the patient and their clinician.
create policy "Read traces of visible sessions"
  on public.session_joint_traces for select
  to authenticated
  using (session_id in (select s.id from public.sessions s));

create policy "Patients store traces of their own sessions"
  on public.session_joint_traces for insert
  to authenticated
  with check (
    session_id in (select s.id from public.sessions s where s.patient_id = (select private.my_patient_id()))
  );

revoke all on public.session_joint_traces from anon, authenticated;
grant select on public.session_joint_traces to authenticated;
grant insert (session_id, sample_hz, start_s, hip, knee, ankle) on public.session_joint_traces to authenticated;
