-- Booking wizard security hardening:
-- (1) bookings_insert_own didn't verify the referenced property actually
--     belongs to the inserting customer, only that customer_id matched.
-- (2) Customers need to see active staff names to pick a "preferred
--     cleaner", but profiles RLS only lets a customer read their own row
--     (or a staff member's row once assigned to one of their bookings).
--     A security definer function exposes a narrow, name-only slice of
--     active staff without loosening profiles RLS itself.

drop policy bookings_insert_own on public.bookings;

create policy bookings_insert_own
  on public.bookings for insert
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.properties p
      where p.id = property_id and p.customer_id = auth.uid()
    )
  );

create or replace function public.active_staff_directory()
returns table (id uuid, full_name text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name
  from public.staff s
  join public.profiles p on p.id = s.id
  where s.active = true
  order by p.full_name;
$$;

grant execute on function public.active_staff_directory() to authenticated;
