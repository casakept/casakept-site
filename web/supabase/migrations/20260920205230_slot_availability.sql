-- Booking wizard capacity check: exposes, for a given date, whether at
-- least one active staff member is free for each time window -- without
-- loosening staff_availability/staff_time_off/bookings RLS (customers
-- can't otherwise read other people's staff schedule rows). Mirrors the
-- "any active staff available for the slot" fallback branch of
-- assign_booking_staff exactly, so what the wizard shows lines up with
-- what actual assignment will do.
create or replace function public.get_slot_availability(p_date date)
returns table (time_window public.schedule_window, available boolean)
language sql
security definer
set search_path = public
stable
as $$
  select w.time_window,
    exists (
      select 1
      from public.staff s
      join public.staff_availability a
        on a.staff_id = s.id
       and a.day_of_week = extract(dow from p_date)
       and a.time_window = w.time_window
      where s.active
        and not exists (
          select 1 from public.staff_time_off t
          where t.staff_id = s.id
            and p_date between t.start_date and t.end_date
        )
        and not exists (
          select 1 from public.bookings b
          where b.assigned_staff_id = s.id
            and b.scheduled_date = p_date
            and b.time_window = w.time_window
            and b.status <> 'cancelled'
        )
    ) as available
  from unnest(enum_range(null::public.schedule_window)) as w(time_window);
$$;

grant execute on function public.get_slot_availability(date) to authenticated;
