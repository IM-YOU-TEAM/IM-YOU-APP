-- Authorization for the live IMU channel.
--
-- Two phones signed into the same patient account stream raw accelerometer and
-- gyroscope samples over one private Realtime topic, and the clinician watches it.
-- The topic is keyed by the pseudonymous owner_link, not the auth user id, so a
-- channel name cannot be traced back to a login without the Vault key, and a
-- clinician can be authorized through the patients table they already own.
--
-- realtime.messages had RLS enabled and no policies, so no private channel worked
-- at all. Broadcast needs select to receive and insert to send.

create function public.my_imu_topic()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select 'imu:' || p.owner_link
  from public.patients p
  where p.owner_link = private.patient_link(auth.uid())
$$;

-- Null unless the caller is the clinician linked to that patient, so a clinician
-- can only ever watch their own patients' streams.
create function public.patient_imu_topic(p_patient_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select 'imu:' || p.owner_link
  from public.patients p
  where p.id = p_patient_id
    and p.clinician_id = auth.uid()
    and p.owner_link is not null
$$;

revoke execute on function public.my_imu_topic() from public, anon;
revoke execute on function public.patient_imu_topic(uuid) from public, anon;
grant execute on function public.my_imu_topic() to authenticated;
grant execute on function public.patient_imu_topic(uuid) to authenticated;

-- The patient's own phones: receive and send on their one topic.
create policy "Patients receive on their own IMU topic"
  on realtime.messages for select
  to authenticated
  using (realtime.topic() = (select public.my_imu_topic()));

create policy "Patients send on their own IMU topic"
  on realtime.messages for insert
  to authenticated
  with check (realtime.topic() = (select public.my_imu_topic()));

-- The clinician watches, and cannot inject samples or control the session.
create policy "Clinicians receive on their patients' IMU topics"
  on realtime.messages for select
  to authenticated
  using (
    realtime.topic() in (
      select 'imu:' || p.owner_link
      from public.patients p
      where p.clinician_id = (select auth.uid())
        and p.owner_link is not null
    )
  );
