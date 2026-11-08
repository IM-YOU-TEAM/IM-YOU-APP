-- Doctors and researchers manage their patients by name.
--
-- Every patient belongs to a clinician, who creates the patient's login (username or email plus a
-- password) through the create-account Edge Function. The clinician's name for the patient is
-- readable only by that clinician and the patient, through the existing patients policies.

alter table public.patients
  add column full_name text check (char_length(btrim(full_name)) between 1 and 80);

-- Clinicians now create a login together with the profile, so bare care-code profiles are gone.
drop function public.create_patient_profile();

-- Called by the create-account Edge Function (service role) right after it creates the auth user.
create function public.provision_patient_account(p_user_id uuid, p_clinician_id uuid, p_full_name text)
returns public.patients
language plpgsql
security definer
set search_path = ''
as $$
declare
  created public.patients%rowtype;
begin
  if (select pr.role from public.profiles pr where pr.id = p_clinician_id) is distinct from 'clinician' then
    raise exception 'clinicians_only' using errcode = '42501';
  end if;
  if nullif(btrim(p_full_name), '') is null then
    raise exception 'full_name_required' using errcode = '22023';
  end if;

  insert into public.profiles (id, role) values (p_user_id, 'patient')
  on conflict (id) do update set role = 'patient', display_name = null;

  insert into public.patients (owner_link, clinician_id, full_name, linked_at)
  values (private.patient_link(p_user_id), p_clinician_id, btrim(p_full_name), now())
  returning * into created;
  return created;
end
$$;

revoke execute on function public.provision_patient_account(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.provision_patient_account(uuid, uuid, text) to service_role;

-- Patients no longer start on their own: without a care code there is no clinician to join.
create or replace function public.complete_onboarding(
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
  if p_role = 'patient' and nullif(btrim(p_care_code), '') is null then
    raise exception 'care_code_required' using errcode = '22023';
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
    perform public.claim_care_code(p_care_code);
  end if;
end
$$;
