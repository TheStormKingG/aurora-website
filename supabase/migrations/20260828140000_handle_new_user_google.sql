-- Populate profiles.full_name from Google's metadata too: Google supplies the
-- display name under 'name' (and usually 'full_name'); email signup uses
-- 'full_name'. COALESCE covers both. dob/phone stay null for Google users
-- (Google doesn't provide them) — collected at the completion step.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, dob, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    nullif(new.raw_user_meta_data->>'dob','')::date,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end; $$;
