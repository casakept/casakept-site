-- The 24-hour re-do guarantee. Two distinct request kinds sharing one
-- table (they're reported through the same survey-page flow and admin
-- queue, and differ mainly in fields/handling, not identity):
--   redo   -- something on the checklist wasn't done to standard. Tied to
--            specific checklist_items on the visit, required photo (this
--            is what makes a free re-clean defensible), has a turnaround
--            SLA (due_by) since it's a promise to act, not just a record.
--   damage -- something was damaged. No baseline/before photo exists
--            today to establish fault, so this is admin-judgment-based
--            and carries no SLA -- a "redo" can't undo damage the way it
--            can redo a missed task.
--
-- Reported through /survey/[token] (the existing CSAT page, unauthenticated
-- -- the token is the authorization boundary, same reasoning as
-- csat_responses/csat.ts) within 24 hours of the visit's check_out_at.
-- Redo requests carry a 48-hour turnaround from reported_at to complete.
create type public.redo_request_kind as enum ('redo', 'damage');
create type public.redo_request_status as enum ('open', 'scheduled', 'resolved', 'denied');

create table public.redo_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  kind public.redo_request_kind not null,
  -- Which checklist items the customer flagged (redo only) -- soft
  -- reference, not a join table, since this is a small picked set shown
  -- back verbatim, never queried by item across requests.
  checklist_item_ids uuid[] not null default '{}',
  description text not null,
  photo_path text,
  status public.redo_request_status not null default 'open',
  reported_at timestamptz not null default now(),
  -- Only meaningful for kind = 'redo'; null for damage (no SLA promise).
  due_by timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id),
  -- The $0 follow-up visit created when a redo is scheduled.
  redo_booking_id uuid references public.bookings (id),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint redo_requires_photo check (kind <> 'redo' or photo_path is not null),
  constraint redo_requires_items check (kind <> 'redo' or array_length(checklist_item_ids, 1) > 0)
);

comment on table public.redo_requests is
  '24-hour re-do guarantee: redo (missed checklist item, required photo, 48h turnaround SLA) and damage (no SLA, admin-judged) reports, both filed via the CSAT survey page.';

create index redo_requests_booking_id_idx on public.redo_requests (booking_id);
create index redo_requests_customer_id_idx on public.redo_requests (customer_id);
create index redo_requests_status_idx on public.redo_requests (status);

create trigger set_redo_requests_updated_at
  before update on public.redo_requests
  for each row
  execute function public.set_updated_at();

alter table public.redo_requests enable row level security;

-- Customers can see their own request history (e.g. a future "past visits"
-- status view) -- but not write directly; every write goes through the
-- token-authenticated survey flow via the service client, same reasoning
-- as csat_responses having no anon/authenticated write policies.
create policy redo_requests_select_own
  on public.redo_requests for select
  using (customer_id = auth.uid());

create policy redo_requests_all_admin
  on public.redo_requests for all
  using (public.is_admin())
  with check (public.is_admin());
