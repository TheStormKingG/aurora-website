-- Patient/account identity layer (PRD §5, §11). NO clinical data here.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'patient'
    check (role in ('patient','corporate_admin','staff','admin')),
  full_name text,
  dob date,
  phone text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.profiles is
  'Account identity + role. Row per auth.users. No special-category data (PDR §11).';

alter table public.profiles enable row level security;

-- A user may read and update only their own profile.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Create the profile row automatically on signup, from user metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, dob, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    nullif(new.raw_user_meta_data->>'dob','')::date,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Anti-privilege-escalation (PRD §5): only the service role may set a
-- privileged role. Non-service updates that try to reach staff/admin fail.
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql as $$
begin
  if new.role in ('staff','admin')
     and new.role is distinct from old.role
     and (select auth.role()) <> 'service_role' then
    raise exception 'role escalation not allowed';
  end if;
  return new;
end; $$;

create trigger profiles_no_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();
