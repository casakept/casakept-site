-- Preferred-cleaner-with-fallback auto-assignment. Called by trusted
-- backend code (via the service-role client) right after a booking
-- transitions into 'confirmed' -- either immediately in createBookingAction
-- (entitlement-covered/free bookings) or from the Stripe
-- payment_intent.succeeded webhook handler (paid bookings). Not a trigger:
-- assignment should only run once a booking is actually confirmed, not
-- while still 'pending' awaiting payment.
--
-- Rules (per the "same cleaner every visit, falls back if unavailable"
-- product decision):
--   1. Cleaning visits (standard_clean/deep_clean) with a preferred_staff_id
--      use that cleaner if they're available for the slot.
--   2. Otherwise (no preference, preferred unavailable, or a non-cleaning
--      service type) fall back to any active staff member available for
--      the slot, picking whoever has the fewest jobs that day.
--   3. If nobody is available, the booking is left unassigned for an admin
--      to sort out manually -- same as today's default state.
--
-- "Available for the slot" means: active, has a standing staff_availability
-- row for that day-of-week/time-window, isn't on staff_time_off covering
-- the date, and isn't already assigned to another (non-cancelled) booking
-- in that same date+window.
--
-- Known limitation: this does a single row-locked read of the target
-- booking but does NOT lock candidate staff rows, so two bookings racing
-- for the same slot in the same request window could both pick the same
-- staff member. Acceptable at current booking volume -- admin can
-- reassign from the bookings queue same as any other misassignment.
create or replace function public.assign_booking_staff(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_day_of_week integer;
  v_chosen uuid;
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found or v_booking.assigned_staff_id is not null then
    return v_booking.assigned_staff_id;
  end if;

  v_day_of_week := extract(dow from v_booking.scheduled_date);

  if v_booking.preferred_staff_id is not null
     and v_booking.service_type in ('standard_clean', 'deep_clean')
     and exists (
       select 1
       from public.staff s
       join public.staff_availability a
         on a.staff_id = s.id
        and a.day_of_week = v_day_of_week
        and a.time_window = v_booking.time_window
       where s.id = v_booking.preferred_staff_id
         and s.active
         and not exists (
           select 1 from public.staff_time_off t
           where t.staff_id = s.id
             and v_booking.scheduled_date between t.start_date and t.end_date
         )
         and not exists (
           select 1 from public.bookings b2
           where b2.assigned_staff_id = s.id
             and b2.scheduled_date = v_booking.scheduled_date
             and b2.time_window = v_booking.time_window
             and b2.status <> 'cancelled'
             and b2.id <> v_booking.id
         )
     )
  then
    v_chosen := v_booking.preferred_staff_id;
  end if;

  if v_chosen is null then
    select s.id into v_chosen
    from public.staff s
    join public.staff_availability a
      on a.staff_id = s.id
     and a.day_of_week = v_day_of_week
     and a.time_window = v_booking.time_window
    where s.active
      and not exists (
        select 1 from public.staff_time_off t
        where t.staff_id = s.id
          and v_booking.scheduled_date between t.start_date and t.end_date
      )
      and not exists (
        select 1 from public.bookings b2
        where b2.assigned_staff_id = s.id
          and b2.scheduled_date = v_booking.scheduled_date
          and b2.time_window = v_booking.time_window
          and b2.status <> 'cancelled'
          and b2.id <> v_booking.id
      )
    order by (
      select count(*) from public.bookings b3
      where b3.assigned_staff_id = s.id
        and b3.scheduled_date = v_booking.scheduled_date
        and b3.status <> 'cancelled'
    ) asc, s.id asc
    limit 1;
  end if;

  if v_chosen is not null then
    update public.bookings
    set assigned_staff_id = v_chosen,
        status = case when status = 'confirmed' then 'assigned' else status end
    where id = v_booking.id;
  end if;

  return v_chosen;
end;
$$;

revoke all on function public.assign_booking_staff(uuid) from public;
grant execute on function public.assign_booking_staff(uuid) to service_role;
