-- Phase 2 of the Crew Performance Scorecard: GPS check-in/out (so a QA
-- reviewer has real arrival/departure data when scoring Timeliness,
-- instead of guessing against the morning/midday/afternoon window) and
-- automatic score events (no-show / re-clean callback / safety
-- violation) that force a visit's bonus to $0 regardless of its numeric
-- subscores -- these should never earn a bonus even if a reviewer's
-- manual entry looks fine. Photo checklists and CSAT texting are a
-- later phase (need a storage/SMS-provider decision); payroll stays
-- informational-only, per the phase 1 decision.

create type public.visit_score_event as enum ('none', 'no_show', 'callback', 'safety_violation');

alter table public.visit_scores
  add column event_type public.visit_score_event not null default 'none';

comment on column public.visit_scores.event_type is
  'Automatic score event overriding bonus eligibility for this visit, independent of the numeric subscores.';

-- One row per booking. Staff record their own via the browser Geolocation
-- API when starting/finishing a visit; there is no automatic scoring
-- formula derived from this data yet, that judgment call stays manual.
create table public.visit_checkins (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,
  check_in_at timestamptz,
  check_in_lat double precision,
  check_in_lng double precision,
  check_out_at timestamptz,
  check_out_lat double precision,
  check_out_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.visit_checkins is
  'Phase 2 of the Crew Performance Scorecard -- GPS-stamped check-in/out per visit.';

create index visit_checkins_staff_id_idx on public.visit_checkins (staff_id);

create trigger set_visit_checkins_updated_at
  before update on public.visit_checkins
  for each row
  execute function public.set_updated_at();

alter table public.visit_checkins enable row level security;

-- Staff can only check into/out of bookings actually assigned to them --
-- staff_id = auth.uid() alone would let them attribute a checkin row to
-- themselves against someone else's booking, so the write side also
-- requires assigned_staff_id to match.
create policy visit_checkins_select_own
  on public.visit_checkins for select
  using (staff_id = auth.uid());

create policy visit_checkins_write_own_assigned
  on public.visit_checkins for insert
  with check (
    staff_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = visit_checkins.booking_id
        and b.assigned_staff_id = auth.uid()
    )
  );

create policy visit_checkins_update_own_assigned
  on public.visit_checkins for update
  using (staff_id = auth.uid())
  with check (
    staff_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = visit_checkins.booking_id
        and b.assigned_staff_id = auth.uid()
    )
  );

create policy visit_checkins_all_admin
  on public.visit_checkins for all
  using (public.is_admin())
  with check (public.is_admin());
