-- Per-account consent record (PRD §6, §12; PDR §9.1): timestamp + notice
-- version + scope, one row per capture, withdrawable by re-capturing.
create table public.account_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  notice_version text not null,
  scope jsonb not null,
  captured_at timestamptz not null default now()
);
alter table public.account_consents enable row level security;

create policy "consents: read own" on public.account_consents
  for select to authenticated using (auth.uid() = user_id);
create policy "consents: insert own" on public.account_consents
  for insert to authenticated with check (auth.uid() = user_id);
