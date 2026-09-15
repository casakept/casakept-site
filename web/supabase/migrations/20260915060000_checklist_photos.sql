-- Phase 3a of the Crew Performance Scorecard: photo checklist verification.
-- Staff check off catalog checklist items per visit and, for items that
-- require it, attach a photo as evidence. This feeds the admin's manual
-- Quality subscore on /admin/scores as supporting evidence -- it does not
-- auto-calculate the score itself.

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  deep_clean_only boolean not null default false,
  requires_photo boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.checklist_items is
  'Catalog of quality-checklist items shown to staff during a cleaning visit. Seeded via migration only -- no admin CRUD UI in v1, same precedent as services/membership_plans.';

comment on column public.checklist_items.deep_clean_only is
  'True for items that only apply to deep_clean/move_out_clean visits (e.g. baseboards, inside oven). Standard cleans only show items where this is false.';

-- One row per (booking, checklist_item), upserted by the assigned staff
-- member as they work through the catalog for that visit. No pre-
-- population -- the staff UI renders the full active catalog joined
-- against whatever entries already exist for the booking.
create table public.visit_checklist_entries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  checklist_item_id uuid not null references public.checklist_items (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,
  completed boolean not null default false,
  photo_path text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, checklist_item_id)
);

comment on table public.visit_checklist_entries is
  'Per-visit checklist completion + optional photo evidence.';

comment on column public.visit_checklist_entries.photo_path is
  'Object path within the private visit-photos storage bucket, e.g. {booking_id}/{checklist_item_id}-{filename}. Null until a photo is uploaded.';

create index visit_checklist_entries_booking_id_idx on public.visit_checklist_entries (booking_id);
create index visit_checklist_entries_staff_id_idx on public.visit_checklist_entries (staff_id);

create trigger set_visit_checklist_entries_updated_at
  before update on public.visit_checklist_entries
  for each row
  execute function public.set_updated_at();

alter table public.checklist_items enable row level security;
alter table public.visit_checklist_entries enable row level security;

-- Catalog is readable by anyone (staff need it to render the checklist);
-- only admins can write, matching the services/membership_plans pattern.
create policy checklist_items_select_active
  on public.checklist_items for select
  using (active = true or public.is_admin());

create policy checklist_items_all_admin
  on public.checklist_items for all
  using (public.is_admin())
  with check (public.is_admin());

-- Same shape as visit_checkins: staff_id = auth.uid() alone would let a
-- staff member attribute an entry row to themselves against someone
-- else's booking, so writes also require the booking to be assigned to
-- them.
create policy visit_checklist_entries_select_own
  on public.visit_checklist_entries for select
  using (staff_id = auth.uid());

create policy visit_checklist_entries_write_own_assigned
  on public.visit_checklist_entries for insert
  with check (
    staff_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = visit_checklist_entries.booking_id
        and b.assigned_staff_id = auth.uid()
    )
  );

create policy visit_checklist_entries_update_own_assigned
  on public.visit_checklist_entries for update
  using (staff_id = auth.uid())
  with check (
    staff_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = visit_checklist_entries.booking_id
        and b.assigned_staff_id = auth.uid()
    )
  );

create policy visit_checklist_entries_all_admin
  on public.visit_checklist_entries for all
  using (public.is_admin())
  with check (public.is_admin());

-- Seed catalog. No itemized checklist exists in the source scorecard doc
-- (it's a scoring-weight summary, not a per-item list) -- this is modeled
-- after the estimate walkthrough's condition categories plus the
-- scorecard's "deep-clean items done to standard" / "home secured on
-- exit" language.
insert into public.checklist_items (name, deep_clean_only, requires_photo, sort_order) values
  ('Kitchen counters & sink', false, false, 10),
  ('Kitchen appliance exteriors', false, false, 20),
  ('Bathrooms (toilet, tub/shower, sink)', false, true, 30),
  ('Floors vacuumed/mopped', false, false, 40),
  ('Dusting (surfaces, fans, blinds)', false, false, 50),
  ('Trash emptied', false, false, 60),
  ('Beds made / linens tidied', false, false, 70),
  ('Home secured on exit (doors, alarm, pets)', false, true, 80),
  ('Baseboards', true, false, 90),
  ('Inside oven', true, true, 100),
  ('Inside refrigerator', true, true, 110),
  ('Interior windows', true, false, 120),
  ('Light fixtures & ceiling fans (detail)', true, false, 130);

-- Private bucket for checklist evidence photos -- not publicly readable.
-- The admin view fetches thumbnails via signed URLs generated server-side
-- with the service-role client (see ScoreBookingRow), so the direct-
-- access policies below only need to cover staff upload/view.
insert into storage.buckets (id, name, public)
values ('visit-photos', 'visit-photos', false)
on conflict (id) do nothing;

-- Object path convention: {booking_id}/{checklist_item_id}-{filename}.
-- (storage.foldername(name))[1] is the first path segment, i.e. the
-- booking_id, so this mirrors the visit_checkins RLS pattern: staff can
-- only read/write into the folder for a booking assigned to them.
create policy visit_photos_staff_read_own_assigned
  on storage.objects for select
  using (
    bucket_id = 'visit-photos'
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and b.assigned_staff_id = auth.uid()
    )
  );

create policy visit_photos_staff_write_own_assigned
  on storage.objects for insert
  with check (
    bucket_id = 'visit-photos'
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and b.assigned_staff_id = auth.uid()
    )
  );

create policy visit_photos_admin_all
  on storage.objects for all
  using (bucket_id = 'visit-photos' and public.is_admin())
  with check (bucket_id = 'visit-photos' and public.is_admin());
