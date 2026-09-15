-- Admin staff management needs to show/search by email, and profiles has no
-- email column (email lives only on auth.users, which admin dashboard
-- sessions can't query directly -- there's no PostgREST-exposed table for
-- it). Mirror it onto profiles the same way full_name/phone already are.
alter table public.profiles add column email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, sms_opt_in)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'sms_opt_in')::boolean, false)
  );
  return new;
end;
$$;
