-- QR pairing for the second phone.
--
-- The patient signs in on one phone only. That phone asks for a pairing and shows
-- its one-time code as a QR code; the second phone scans it with the iPhone camera
-- and redeems the code without signing in. Redeeming hands back the pairing's
-- Realtime topic, a random secret that is never in the QR code, so knowing the topic
-- is what lets a phone onto the session's channel. Only start / pause / stop and
-- each phone's spot travel on it: sensor samples go straight to the model, and the
-- signed-in phone is the only one that saves anything.

create table public.imu_pairings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  -- sha256 of the QR code, so reading this table cannot redeem a live code.
  code_hash text not null unique,
  topic text not null unique default 'pair:' || gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  -- Deadline to scan. A redeemed pairing then lasts for the session.
  code_expires_at timestamptz not null default now() + interval '10 minutes',
  claimed_at timestamptz,
  revoked_at timestamptz
);

create index imu_pairings_patient_id_idx on public.imu_pairings (patient_id);

-- Only the functions below read or write pairings.
alter table public.imu_pairings enable row level security;
revoke all on public.imu_pairings from anon, authenticated;

-- Called by the signed-in phone. A new pairing retires the patient's earlier ones,
-- so an old QR code on a screenshot stops working.
create function public.create_imu_pairing()
returns table (code text, topic text, code_expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := private.my_patient_id();
  fresh text := replace(gen_random_uuid()::text, '-', '');
  created public.imu_pairings%rowtype;
begin
  if me is null then
    raise exception 'patients_only' using errcode = '42501';
  end if;

  update public.imu_pairings p set revoked_at = now() where p.patient_id = me and p.revoked_at is null;
  delete from public.imu_pairings p where p.created_at < now() - interval '1 day';

  insert into public.imu_pairings (patient_id, code_hash)
  values (me, encode(sha256(convert_to(fresh, 'UTF8')), 'hex'))
  returning * into created;

  return query select fresh, created.topic, created.code_expires_at;
end
$$;

-- Called by the scanned phone, signed in or not. Null unless the code is unused,
-- not replaced, and inside its 10 minutes.
create function public.claim_imu_pairing(p_code text)
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  update public.imu_pairings p
  set claimed_at = now()
  where p.code_hash = encode(sha256(convert_to(coalesce(p_code, ''), 'UTF8')), 'hex')
    and p.claimed_at is null
    and p.revoked_at is null
    and p.code_expires_at > now()
  returning p.topic
$$;

-- Realtime evaluates this with realtime.topic() set to the channel being joined.
-- Called any other way the topic is null and the answer is false.
create function public.imu_pairing_topic_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.imu_pairings p
    where p.topic = realtime.topic()
      and p.revoked_at is null
      and p.created_at > now() - interval '12 hours'
  )
$$;

revoke execute on function public.create_imu_pairing() from public, anon;
grant execute on function public.create_imu_pairing() to authenticated;
revoke execute on function public.claim_imu_pairing(text) from public;
grant execute on function public.claim_imu_pairing(text) to anon, authenticated;
revoke execute on function public.imu_pairing_topic_open() from public;
grant execute on function public.imu_pairing_topic_open() to anon, authenticated;

-- Both phones, the scanned one with no account: receive and send on an open pairing topic.
create policy "Paired phones receive on their pairing topic"
  on realtime.messages for select
  to anon, authenticated
  using ((select public.imu_pairing_topic_open()));

create policy "Paired phones send on their pairing topic"
  on realtime.messages for insert
  to anon, authenticated
  with check ((select public.imu_pairing_topic_open()));
