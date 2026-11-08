-- One row per auth user. `role` decides which workspace sign-in routes to.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'patient' check (role in ('patient', 'clinician')),
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Signup puts the chosen role in user metadata. Mirror it into a table so the
-- app can read it without parsing the JWT, and so later features can join on it.
--
-- The role is self-selected, exactly as the pre-auth screens did it. Anyone can
-- sign up as 'clinician'. Before this app holds real patient data, roles must be
-- granted by an admin or verified invite instead, and the clause below removed.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case
      when new.raw_user_meta_data ->> 'role' = 'clinician' then 'clinician'
      else 'patient'
    end,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
