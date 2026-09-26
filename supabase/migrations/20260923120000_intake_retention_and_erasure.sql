-- Closes two gaps the cascade audit found (docs/DATA_CASCADE.md).
--
-- 1. An account deletion left personal data in the four public intake
--    tables. aurora_bookings was the worst of them: user_id is
--    ON DELETE SET NULL, so the row survived the deletion AND lost the
--    only handle that could ever find it again.
-- 2. Three retention periods have been stated in COMMENT strings and in
--    privacy notice v1.0 since July, and nothing enforces any of them —
--    a policy the organisation can be held to and cannot demonstrate.
--
-- NOT APPLIED AUTOMATICALLY. This deletes production rows on a schedule.
-- Review the windows below against the privacy notice, then apply.

-- ── 1. Erasure on account deletion ──────────────────────────────────
-- Redact rather than delete. A booking is an operational record of care
-- offered; the row's existence carries no personal data once the
-- identifiers are gone, and keeping it preserves the counts the service
-- is planned from. Art. 17 requires erasure of the personal data, not
-- destruction of the fact that an appointment slot was used.
--
-- Runs BEFORE the auth.users row goes, so it still sees the id; the
-- existing SET NULL on aurora_bookings.user_id then fires against a row
-- that is already anonymous.
create or replace function public.erase_person_for_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_email text; v_phone text;
begin
  select email into v_email from auth.users where id = old.id;
  select phone into v_phone from public.profiles where id = old.id;

  -- Linked by account.
  update public.aurora_bookings
     set full_name = '[erased]', phone = '[erased]', email = null,
         reason = null, date_of_birth = '1900-01-01'
   where user_id = old.id;

  -- Not linked by account — these flows accept anonymous intake, so the
  -- contact details are the only join available. Matching on them is
  -- why the redaction above must not run first on the same person.
  if v_email is not null then
    update public.aurora_bookings
       set full_name = '[erased]', phone = '[erased]', email = null,
           reason = null, date_of_birth = '1900-01-01'
     where email = v_email and user_id is null;
    update public.aurora_contacts
       set full_name = '[erased]', email = '[erased]', organisation = null, message = '[erased]'
     where email = v_email;
    update public.aurora_rights_requests
       set full_name = '[erased]', email = '[erased]', details = null
     where email = v_email;
  end if;
  if v_phone is not null then
    update public.aurora_home_visits
       set full_name = '[erased]', phone = '[erased]', address = '[erased]',
           mobility_note = null
     where phone = v_phone;
  end if;

  return old;
end $$;

create trigger users_erase_intake before delete on auth.users
  for each row execute function public.erase_person_for_user();

-- ── 2. Erasure for someone who never had an account ─────────────────
-- Most intake is anonymous, so most erasure requests will arrive from
-- people with no auth.users row at all. Without this, answering one
-- means hand-written UPDATEs against a live health database.
-- Returns the number of rows redacted so the rights-request record can
-- cite it.
create or replace function public.erase_person_by_contact(p_email text, p_phone text)
returns int language plpgsql security definer
set search_path = public, pg_temp as $$
declare n int := 0; m int;
begin
  if p_email is null and p_phone is null then
    raise exception 'give at least one of email or phone';
  end if;
  if p_email is not null then
    update public.aurora_bookings set full_name='[erased]', phone='[erased]', email=null,
           reason=null, date_of_birth='1900-01-01' where email = p_email;
    get diagnostics m = row_count; n := n + m;
    update public.aurora_contacts set full_name='[erased]', email='[erased]',
           organisation=null, message='[erased]' where email = p_email;
    get diagnostics m = row_count; n := n + m;
    update public.aurora_rights_requests set full_name='[erased]', email='[erased]',
           details=null where email = p_email;
    get diagnostics m = row_count; n := n + m;
  end if;
  if p_phone is not null then
    update public.aurora_bookings set full_name='[erased]', phone='[erased]', email=null,
           reason=null, date_of_birth='1900-01-01' where phone = p_phone;
    get diagnostics m = row_count; n := n + m;
    update public.aurora_home_visits set full_name='[erased]', phone='[erased]',
           address='[erased]', mobility_note=null where phone = p_phone;
    get diagnostics m = row_count; n := n + m;
  end if;
  return n;
end $$;

-- ── 3. The retention the notice already promises ────────────────────
-- Windows come from the COMMENT strings on the tables and privacy
-- notice v1.0. They are redactions, not deletes, for the same reason as
-- above — and because a hard delete of a clinical appointment record
-- may conflict with medical record-keeping obligations that outlive the
-- data-protection one. Confirm that with the DPO before changing it.
--
-- aurora_contacts has NO documented retention period. It is deliberately
-- absent below rather than given an invented one: choose a period, write
-- it into the privacy notice, then add it here.
create or replace function public.purge_intake_retention() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare n int := 0; m int;
begin
  update public.aurora_bookings
     set full_name='[retention]', phone='[retention]', email=null,
         reason=null, date_of_birth='1900-01-01'
   where appointment_date < (now() - interval '12 months')::date
     and full_name not in ('[erased]', '[retention]');
  get diagnostics m = row_count; n := n + m;

  update public.aurora_home_visits
     set full_name='[retention]', phone='[retention]', address='[retention]', mobility_note=null
   where visit_date < (now() - interval '12 months')::date
     and full_name not in ('[erased]', '[retention]');
  get diagnostics m = row_count; n := n + m;

  update public.aurora_rights_requests
     set full_name='[retention]', email='[retention]', details=null
   where closed_at is not null
     and closed_at < now() - interval '24 months'
     and full_name not in ('[erased]', '[retention]');
  get diagnostics m = row_count; n := n + m;

  return n;
end $$;

revoke execute on function
  public.erase_person_for_user(), public.erase_person_by_contact(text, text),
  public.purge_intake_retention()
from public, anon, authenticated;
grant execute on function
  public.erase_person_by_contact(text, text), public.purge_intake_retention()
to service_role;

-- 03:30 UTC = 23:30 GYT, after the two health jobs at 03:00 and 03:15.
select cron.schedule('intake-retention', '30 3 * * *', $$select public.purge_intake_retention()$$);
