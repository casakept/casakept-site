-- Lets a re-do visit point back at the original booking it's making good
-- on, so the staff app can show a clear "Re-do visit" tag instead of
-- relying on the free-text notes field. Self-referencing FK on bookings,
-- not a reverse lookup through redo_requests, so the staff jobs query
-- (already scoped to bookings via existing RLS) can read it directly
-- without a new redo_requests policy for staff.
alter table public.bookings
  add column redo_of_booking_id uuid references public.bookings (id) on delete set null;
