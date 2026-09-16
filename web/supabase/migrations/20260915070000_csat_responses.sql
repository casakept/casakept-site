-- Phase 3b of the Crew Performance Scorecard: automated CSAT survey.
-- The reference doc calls for "automated CSAT text", but this project has
-- no SMS provider account -- per decision, this ships as an emailed
-- survey via Resend instead, reusing existing email infra. A daily cron
-- job sends one per completed visit; the customer rates 1-5 via a public,
-- token-gated link (no login). Like the checklist photos, the response is
-- shown to the admin as evidence for the manual Customer subscore -- it
-- does not auto-populate it.

create table public.csat_responses (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  rating smallint check (rating between 1 and 5),
  comment text,
  sent_at timestamptz not null default now(),
  responded_at timestamptz
);

comment on table public.csat_responses is
  'One row per completed-visit CSAT survey sent. token is the sole auth boundary for the public /survey/[token] response page -- there is no customer session on that flow, so writes to this table only ever happen through the service-role client (the sending cron job, and the token-validated response Server Action), mirroring how notifications_log is written by backend jobs.';

create index csat_responses_customer_id_idx on public.csat_responses (customer_id);

alter table public.csat_responses enable row level security;

create policy csat_responses_select_own
  on public.csat_responses for select
  using (customer_id = auth.uid());

create policy csat_responses_all_admin
  on public.csat_responses for all
  using (public.is_admin())
  with check (public.is_admin());
