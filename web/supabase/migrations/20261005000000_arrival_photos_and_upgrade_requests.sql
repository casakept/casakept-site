-- Arrival photos: what the home looked like when the crew got there. Taken
-- on a visit in progress, stored in the private visit-photos bucket under
-- {booking_id}/arrival/..., which the existing staff storage policies
-- already cover (they key off the first path segment).
create table public.visit_arrival_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,
  photo_path text not null,
  created_at timestamptz not null default now()
);

create index visit_arrival_photos_booking_id_idx on public.visit_arrival_photos (booking_id);

alter table public.visit_arrival_photos enable row level security;

create policy visit_arrival_photos_select_own
  on public.visit_arrival_photos for select
  using (staff_id = auth.uid());

create policy visit_arrival_photos_insert_own_assigned
  on public.visit_arrival_photos for insert
  with check (
    staff_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.assigned_staff_id = auth.uid()
    )
  );

create policy visit_arrival_photos_all_admin
  on public.visit_arrival_photos for all
  using (public.is_admin())
  with check (public.is_admin());

-- A crew member's recommendation that a standard clean be upgraded to a deep
-- clean, and the customer's response.
--   flagged   - crew filed it; they must now phone the customer
--   link_sent - the customer has the approve/decline link; the response
--               window (expires_at) is running
--   approved  - the customer paid for the upgrade
--   declined  - the customer said no (on the call or on the page)
--   expired   - no answer inside the window; the crew does the standard scope
--   cancelled - the crew withdrew it
create type public.upgrade_request_status as enum (
  'flagged',
  'link_sent',
  'approved',
  'declined',
  'expired',
  'cancelled'
);

create table public.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,
  -- Authorizes the customer's approve/decline page; they don't log in.
  token text not null unique,
  status public.upgrade_request_status not null default 'flagged',
  reasons text[] not null,
  notes text,
  -- The arrival photos as they stood when this was filed, so later photos
  -- can't change what the customer was shown.
  photo_paths text[] not null,
  -- What the customer pays: capped at the maximum they agreed to when they
  -- booked (bookings.upgrade_max_cents).
  amount_cents integer not null check (amount_cents >= 0),
  called_at timestamptz,
  call_outcome text check (call_outcome in ('no_answer', 'spoke')),
  link_sent_at timestamptz,
  expires_at timestamptz,
  responded_at timestamptz,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index upgrade_requests_booking_id_idx on public.upgrade_requests (booking_id);

-- One live request per visit, and at most one approved upgrade.
create unique index upgrade_requests_one_active_per_booking
  on public.upgrade_requests (booking_id)
  where status in ('flagged', 'link_sent');
create unique index upgrade_requests_one_approved_per_booking
  on public.upgrade_requests (booking_id)
  where status = 'approved';

create trigger set_upgrade_requests_updated_at
  before update on public.upgrade_requests
  for each row
  execute function public.set_updated_at();

alter table public.upgrade_requests enable row level security;

-- Crew can see and file their own requests. There is deliberately no staff
-- UPDATE policy: moving a request forward (and above all marking it
-- approved) happens only in server code that checks payment, so a crew
-- member can't approve an upgrade the customer never paid for.
create policy upgrade_requests_select_own
  on public.upgrade_requests for select
  using (staff_id = auth.uid());

create policy upgrade_requests_insert_own_assigned
  on public.upgrade_requests for insert
  with check (
    staff_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.assigned_staff_id = auth.uid()
    )
  );

create policy upgrade_requests_all_admin
  on public.upgrade_requests for all
  using (public.is_admin())
  with check (public.is_admin());
