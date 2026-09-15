-- Phase 1 of the Crew Performance Scorecard: digitizes the 100-point
-- visit score (Quality 40 / Customer 25 / Timeliness 20 / Professionalism
-- 15, per the internal scorecard doc) so it's visible in-app instead of
-- calculated by hand. Scores are entered manually by an admin/QA reviewer
-- for now -- the automated inputs the full scorecard describes (photo
-- checklist verification, GPS check-in/out, CSAT texts) don't exist yet
-- and are a later phase. One row per booking; upserted by booking_id so
-- re-scoring a visit corrects the existing row instead of duplicating it.

create table public.visit_scores (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,
  quality_score smallint not null check (quality_score between 0 and 40),
  customer_score smallint not null check (customer_score between 0 and 25),
  timeliness_score smallint not null check (timeliness_score between 0 and 20),
  professionalism_score smallint not null check (professionalism_score between 0 and 15),
  total_score smallint generated always as (
    quality_score + customer_score + timeliness_score + professionalism_score
  ) stored,
  notes text,
  scored_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.visit_scores is
  'Phase 1 (manual entry) of the Crew Performance Scorecard -- one row per completed booking.';

create index visit_scores_staff_id_idx on public.visit_scores (staff_id);

create trigger set_visit_scores_updated_at
  before update on public.visit_scores
  for each row
  execute function public.set_updated_at();

alter table public.visit_scores enable row level security;

-- Staff can see their own scores (to know where they stand); everything
-- else, including writes, is admin-only -- there's no customer-facing
-- exposure of this internal ops document.
create policy visit_scores_select_own
  on public.visit_scores for select
  using (staff_id = auth.uid());

create policy visit_scores_all_admin
  on public.visit_scores for all
  using (public.is_admin())
  with check (public.is_admin());
