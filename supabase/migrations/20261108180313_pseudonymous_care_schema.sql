-- Pseudonymous care records.
--
-- Patients are never stored by name, email, birth date or diagnosis. A patient is a random
-- subject id plus a short care code that their clinician files in their own records.
-- The login -> patient link is an HMAC of the auth user id keyed by a Vault secret, so the
-- patients table cannot be joined back to auth.users (or an email) without that key.
-- Camera footage and pose landmarks never leave the device: sessions hold summary metrics only.

-- First-draft tables. They were empty, unreachable (RLS without policies) and held identifying fields.
drop table if exists public.movement_recordings;
drop table if exists public.patient_profiles;
drop table if exists public.profiles;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ---------- Link key ----------

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'patient_link_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'patient_link_key',
      'HMAC key linking a login to its pseudonymous patient record. Rotating it orphans every link.'
    );
  end if;
end
$$;

create function private.patient_link(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(extensions.hmac(uid::text, s.decrypted_secret, 'sha256'), 'hex')
  from vault.decrypted_secrets s
  where s.name = 'patient_link_key'
$$;

create function private.my_patient_link()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select private.patient_link(auth.uid())
$$;

-- 8 characters from an alphabet without look-alikes (no 0/O, 1/I/L), shown as XXXX-XXXX.
create function private.new_care_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  code text;
begin
  loop
    bytes := extensions.gen_random_bytes(8);
    code := '';
    for i in 0..7 loop
      code := code || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
    end loop;
    code := substr(code, 1, 4) || '-' || substr(code, 5, 4);
    exit when not exists (select 1 from public.patients p where p.care_code = code);
  end loop;
  return code;
end
$$;

-- ---------- Tables ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Null until the person picks a role after their first sign-in.
  role text check (role in ('patient', 'clinician')),
  -- Shown to linked patients, e.g. "Dr. Rivera". Patients never have one.
  display_name text check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  constraint profiles_display_name_clinician_only check (display_name is null or role = 'clinician')
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  care_code text not null unique default private.new_care_code(),
  -- private.patient_link(auth user id). Null while a clinician-created profile is unclaimed.
  owner_link text unique,
  -- The clinician who created the profile or whose code the patient redeemed.
  clinician_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  linked_at timestamptz
);

create index patients_clinician_id_idx on public.patients (clinician_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  motion text not null check (motion in ('walking', 'running', 'stairs', 'sitToStand')),
  method text not null check (method in ('cv', 'imu')),
  started_at timestamptz not null,
  duration_sec integer not null check (duration_sec between 0 and 86400),
  gait_score smallint not null check (gait_score between 0 and 100),
  cadence numeric(6, 2) not null check (cadence >= 0),
  -- Null when left and right were not compared.
  symmetry numeric(5, 2) check (symmetry between 0 and 100),
  far_leg_hidden boolean not null default false,
  step_count integer check (step_count >= 0),
  reps integer check (reps >= 0),
  -- Extra derived numbers only. Never frames, landmarks or anything that can rebuild a body.
  metrics jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metrics) = 'object' and pg_column_size(metrics) <= 16384),
  created_at timestamptz not null default now()
);

create index sessions_patient_started_idx on public.sessions (patient_id, started_at desc);

create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  clinician_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index session_notes_session_id_idx on public.session_notes (session_id);
create index session_notes_clinician_id_idx on public.session_notes (clinician_id);

create function private.my_patient_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.patients p where p.owner_link = private.patient_link(auth.uid())
$$;

-- ---------- Row level security ----------

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.sessions enable row level security;
alter table public.session_notes enable row level security;

create policy "Read own profile and own clinician"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or id in (
      select p.clinician_id from public.patients p
      where p.owner_link = (select private.my_patient_link())
    )
  );

create policy "Update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Clinicians and the patient read a patient"
  on public.patients for select
  to authenticated
  using (
    clinician_id = (select auth.uid())
    or owner_link = (select private.my_patient_link())
  );

create policy "Clinicians remove unclaimed profiles"
  on public.patients for delete
  to authenticated
  using (clinician_id = (select auth.uid()) and owner_link is null);

create policy "Read sessions of visible patients"
  on public.sessions for select
  to authenticated
  using (
    patient_id in (
      select p.id from public.patients p
      where p.clinician_id = (select auth.uid())
        or p.owner_link = (select private.my_patient_link())
    )
  );

create policy "Patients record their own sessions"
  on public.sessions for insert
  to authenticated
  with check (patient_id = (select private.my_patient_id()));

create policy "Patients delete their own sessions"
  on public.sessions for delete
  to authenticated
  using (patient_id = (select private.my_patient_id()));

create policy "Read notes on visible sessions"
  on public.session_notes for select
  to authenticated
  using (session_id in (select s.id from public.sessions s));

create policy "Clinicians note their patients' sessions"
  on public.session_notes for insert
  to authenticated
  with check (
    clinician_id = (select auth.uid())
    and session_id in (
      select s.id
      from public.sessions s
      join public.patients p on p.id = s.patient_id
      where p.clinician_id = (select auth.uid())
    )
  );

create policy "Clinicians edit their own notes"
  on public.session_notes for update
  to authenticated
  using (clinician_id = (select auth.uid()))
  with check (clinician_id = (select auth.uid()));

create policy "Clinicians delete their own notes"
  on public.session_notes for delete
  to authenticated
  using (clinician_id = (select auth.uid()));

-- ---------- Grants ----------
-- Roles and links change only through the functions below, never by direct writes.

revoke all on public.profiles, public.patients, public.sessions, public.session_notes from anon, authenticated;

grant select on public.profiles, public.patients, public.sessions, public.session_notes to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant delete on public.patients to authenticated;
grant insert (patient_id, motion, method, started_at, duration_sec, gait_score, cadence, symmetry,
              far_leg_hidden, step_count, reps, metrics)
  on public.sessions to authenticated;
grant delete on public.sessions to authenticated;
grant insert (session_id, body) on public.session_notes to authenticated;
grant update (body) on public.session_notes to authenticated;
grant delete on public.session_notes to authenticated;

-- ---------- Account lifecycle ----------

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Self-made records go with the account. Clinician-made ones keep their pseudonymous history
-- and get a random tombstone so the care code can never be claimed again.
create function private.handle_deleted_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  link text := private.patient_link(old.id);
begin
  delete from public.patients where owner_link = link and clinician_id is null;
  update public.patients set owner_link = 'deleted:' || gen_random_uuid() where owner_link = link;
  return old;
end
$$;

create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function private.handle_deleted_user();

-- ---------- Client functions ----------

create function public.claim_care_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  link text;
  normalized text;
  target_id uuid;
  mine public.patients%rowtype;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if (select pr.role from public.profiles pr where pr.id = uid) is distinct from 'patient' then
    raise exception 'patients_only' using errcode = '42501';
  end if;

  normalized := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if char_length(normalized) <> 8 then
    raise exception 'invalid_code' using errcode = '22023';
  end if;
  normalized := substr(normalized, 1, 4) || '-' || substr(normalized, 5, 4);
  link := private.patient_link(uid);

  select p.id into target_id
  from public.patients p
  where p.care_code = normalized and p.owner_link is null and p.clinician_id is not null
  for update;
  if target_id is null then
    raise exception 'invalid_code' using errcode = '22023';
  end if;

  -- A patient who tracked on their own first keeps that history under the clinician's profile.
  select * into mine from public.patients p where p.owner_link = link for update;
  if found then
    if mine.clinician_id is not null then
      raise exception 'already_linked' using errcode = '22023';
    end if;
    update public.sessions set patient_id = target_id where patient_id = mine.id;
    delete from public.patients where id = mine.id;
  end if;

  update public.patients set owner_link = link, linked_at = now() where id = target_id;
  return target_id;
end
$$;

create function public.complete_onboarding(
  p_role text,
  p_display_name text default null,
  p_care_code text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  existing_role text;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_role is null or p_role not in ('patient', 'clinician') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;

  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  select pr.role into existing_role from public.profiles pr where pr.id = uid for update;
  if existing_role is not null and existing_role <> p_role then
    raise exception 'role_already_set' using errcode = '22023';
  end if;

  update public.profiles pr
     set role = p_role,
         display_name = case
           when p_role = 'clinician' then coalesce(nullif(btrim(p_display_name), ''), pr.display_name)
         end
   where pr.id = uid;

  if p_role = 'patient' then
    if nullif(btrim(p_care_code), '') is not null then
      perform public.claim_care_code(p_care_code);
    else
      insert into public.patients (owner_link) values (private.patient_link(uid))
      on conflict (owner_link) do nothing;
    end if;
  end if;
end
$$;

create function public.create_patient_profile()
returns public.patients
language plpgsql
security definer
set search_path = ''
as $$
declare
  created public.patients%rowtype;
begin
  if (select pr.role from public.profiles pr where pr.id = auth.uid()) is distinct from 'clinician' then
    raise exception 'clinicians_only' using errcode = '42501';
  end if;
  insert into public.patients (clinician_id) values (auth.uid()) returning * into created;
  return created;
end
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.my_patient_link(), private.my_patient_id() to authenticated;

revoke execute on function public.claim_care_code(text) from public, anon;
revoke execute on function public.complete_onboarding(text, text, text) from public, anon;
revoke execute on function public.create_patient_profile() from public, anon;
grant execute on function public.claim_care_code(text) to authenticated;
grant execute on function public.complete_onboarding(text, text, text) to authenticated;
grant execute on function public.create_patient_profile() to authenticated;
