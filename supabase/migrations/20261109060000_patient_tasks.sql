-- Assigned movements become tasks: the clinician sets how often each one must be recorded,
-- and the patient ticks tasks off. A recorded session of that movement also counts.

-- Movement -> times per week, 1 to 7 (7 = every day). A movement with no entry is every day.
create function private.valid_task_frequency(plan jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(plan) = 'object' and coalesce(bool_and(
    e.key in ('walking', 'running', 'stairs', 'sitToStand')
    and jsonb_typeof(e.value) = 'number'
    and e.value::numeric in (1, 2, 3, 4, 5, 6, 7)
  ), true)
  from jsonb_each(case when jsonb_typeof(plan) = 'object' then plan else '{}'::jsonb end) e
$$;

revoke execute on function private.valid_task_frequency(jsonb) from public, anon;
grant execute on function private.valid_task_frequency(jsonb) to authenticated;

alter table public.patients
  add column task_frequency jsonb not null default '{}'::jsonb
  constraint patients_task_frequency_valid check (private.valid_task_frequency(task_frequency));

-- The "Clinicians assign movements" update policy already limits this to the patient's clinician.
grant update (task_frequency) on public.patients to authenticated;

-- One tick per movement per local day.
create table public.task_checks (
  patient_id uuid not null references public.patients (id) on delete cascade,
  motion text not null check (motion in ('walking', 'running', 'stairs', 'sitToStand')),
  done_on date not null,
  created_at timestamptz not null default now(),
  primary key (patient_id, motion, done_on)
);

alter table public.task_checks enable row level security;

create policy "Read task checks of visible patients"
  on public.task_checks for select
  to authenticated
  using (
    patient_id in (
      select p.id from public.patients p
      where p.clinician_id = (select auth.uid())
        or p.owner_link = (select private.my_patient_link())
    )
  );

create policy "Patients tick their own tasks"
  on public.task_checks for insert
  to authenticated
  with check (patient_id = (select private.my_patient_id()));

create policy "Patients untick their own tasks"
  on public.task_checks for delete
  to authenticated
  using (patient_id = (select private.my_patient_id()));

revoke all on public.task_checks from anon, authenticated;
grant select, delete on public.task_checks to authenticated;
grant insert (patient_id, motion, done_on) on public.task_checks to authenticated;
