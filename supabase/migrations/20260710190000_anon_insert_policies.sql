-- Static-deployment write path (GitHub Pages): the site submits forms
-- directly from the browser with the publishable (anon) key
-- (src/lib/submit.ts). The policies below allow INSERT ONLY — with no
-- select/update/delete policies, submitted rows are unreadable and
-- immutable from the public key; staff read via service-role tooling.
--
-- The WITH CHECK clauses mirror the zod schema caps so the database
-- keeps a validation floor even if client-side checks are bypassed.

create policy "public can submit bookings"
  on public.aurora_bookings
  for insert to anon
  with check (
    char_length(reference) <= 24
    and char_length(full_name) between 2 and 120
    and char_length(phone) between 7 and 20
    and (email is null or char_length(email) <= 254)
    and (reason is null or char_length(reason) <= 400)
    and appointment_date >= current_date
    and status = 'new'
  );

create policy "public can submit home visits"
  on public.aurora_home_visits
  for insert to anon
  with check (
    char_length(reference) <= 24
    and char_length(full_name) between 2 and 120
    and char_length(phone) between 7 and 20
    and char_length(address) between 8 and 240
    and char_length(area) between 2 and 120
    and (mobility_note is null or char_length(mobility_note) <= 300)
    and visit_date >= current_date
    and status = 'new'
  );

create policy "public can submit contact enquiries"
  on public.aurora_contacts
  for insert to anon
  with check (
    char_length(reference) <= 24
    and char_length(full_name) between 2 and 120
    and char_length(email) <= 254
    and (organisation is null or char_length(organisation) <= 160)
    and char_length(message) between 10 and 2000
    and status = 'open'
  );

create policy "public can open rights requests"
  on public.aurora_rights_requests
  for insert to anon
  with check (
    char_length(reference) <= 24
    and char_length(full_name) between 2 and 120
    and char_length(email) <= 254
    and (details is null or char_length(details) <= 1500)
    and status = 'open'
  );
