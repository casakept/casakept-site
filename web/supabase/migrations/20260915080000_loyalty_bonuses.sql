-- Phase 3c of the Crew Performance Scorecard: loyalty & retention bonuses.
-- Ledger of computed bonus entitlements (90-day, anniversary, household
-- retention, crew of the month, referral) -- payroll stays informational-
-- only per the phase 1 decision, so this table records what's owed and
-- lets an admin mark it paid; it never moves money itself.

create type public.staff_bonus_type as enum (
  '90_day',
  'anniversary',
  'household_retention',
  'crew_of_month',
  'referral'
);

alter table public.staff
  add column referred_by_staff_id uuid references public.staff (id);

comment on column public.staff.referred_by_staff_id is
  'The existing staff member who referred this hire, if any -- set optionally at invite time. Feeds the referral bonus once this hire passes 90 days.';

create table public.staff_bonuses (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  bonus_type public.staff_bonus_type not null,
  -- 'YYYY' for anniversary, 'YYYY-MM' for household_retention/crew_of_month;
  -- null for 90_day and referral (one-time, deduped on staff_id/related_staff_id instead).
  period_label text,
  -- For 'referral' only: the referred hire whose 90-day mark triggered this
  -- bonus -- staff_id above is the referrer being paid, not the hire.
  related_staff_id uuid references public.staff (id),
  amount_cents integer not null check (amount_cents >= 0),
  computed_at timestamptz not null default now(),
  paid boolean not null default false,
  paid_at timestamptz
);

comment on table public.staff_bonuses is
  'Computed loyalty/retention bonus ledger, informational only -- the compute-bonuses cron inserts rows (idempotently, checking for an existing row first rather than a DB constraint, same pattern as the other cron jobs'' notifications_log dedup), an admin marks them paid once handled outside the app.';

create index staff_bonuses_staff_id_idx on public.staff_bonuses (staff_id);

alter table public.staff_bonuses enable row level security;

create policy staff_bonuses_select_own
  on public.staff_bonuses for select
  using (staff_id = auth.uid());

create policy staff_bonuses_all_admin
  on public.staff_bonuses for all
  using (public.is_admin())
  with check (public.is_admin());
