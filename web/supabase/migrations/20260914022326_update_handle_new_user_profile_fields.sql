-- The signup form collects phone and sms_opt_in alongside full_name; carry
-- them into the auto-provisioned profile row too (previously only
-- full_name was copied from auth.users.raw_user_meta_data).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, sms_opt_in)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'sms_opt_in')::boolean, false)
  );
  return new;
end;
$$;
