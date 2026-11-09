-- Clinicians choose which movements a patient can see and start.
-- Default is every movement; an empty list hides the track flow until the clinician assigns one.

alter table public.patients
  add column assigned_motions text[] not null default array['walking','running','stairs','sitToStand']::text[];

alter table public.patients
  add constraint patients_assigned_motions_valid check (
    assigned_motions <@ array['walking','running','stairs','sitToStand']::text[]
  );

create policy "Clinicians assign movements"
  on public.patients for update
  to authenticated
  using (clinician_id = (select auth.uid()))
  with check (clinician_id = (select auth.uid()));

grant update (assigned_motions) on public.patients to authenticated;
