-- Link a booking to a signed-in patient (PRD §6, §11). Anonymous intake
-- (user_id null) keeps working under the existing INSERT-only policy.
alter table public.aurora_bookings
  add column user_id uuid references auth.users (id) on delete set null;

-- A patient may read only their own linked bookings.
create policy "bookings: patient reads own" on public.aurora_bookings
  for select to authenticated using (user_id = auth.uid());

-- Allow authenticated users to insert their own booking with user_id set
-- to themselves (or null). The existing anon insert policy is unchanged.
create policy "bookings: authenticated inserts own" on public.aurora_bookings
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());
