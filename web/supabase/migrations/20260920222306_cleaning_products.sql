-- Lets customers know what products are used in their home and pick a
-- scent per product category. Categories are a fixed enum (business
-- decision, not admin-configurable); the specific products/scents within
-- each category are admin-managed and expected to change over time.
create type public.cleaning_product_category as enum (
  'all_purpose_cleaner',
  'hard_floor_cleaner',
  'carpet_cleaner',
  'glass_cleaner',
  'laundry_detergent',
  'fabric_softener'
);

create table public.cleaning_products (
  id uuid primary key default gen_random_uuid(),
  category public.cleaning_product_category not null,
  name text not null,
  is_default boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cleaning_products_category_idx on public.cleaning_products (category);

-- At most one default per category -- the app clears the previous default
-- before setting a new one, and this is the safety net against a bug (or a
-- race) ever leaving two.
create unique index cleaning_products_one_default_per_category
  on public.cleaning_products (category)
  where is_default;

create trigger set_cleaning_products_updated_at
  before update on public.cleaning_products
  for each row
  execute function public.set_updated_at();

-- One selected product per category per booking. FK to cleaning_products
-- is intentionally ON DELETE RESTRICT (the default) rather than cascade --
-- products are soft-deactivated, never hard-deleted, specifically so a
-- past booking's recorded selection is never silently lost.
create table public.booking_product_selections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  category public.cleaning_product_category not null,
  product_id uuid not null references public.cleaning_products (id),
  created_at timestamptz not null default now(),
  unique (booking_id, category)
);

create index booking_product_selections_booking_id_idx on public.booking_product_selections (booking_id);

alter table public.cleaning_products enable row level security;
alter table public.booking_product_selections enable row level security;

-- Non-sensitive catalog data (product/scent names) -- readable by anyone,
-- same reasoning as the public services/membership_plans catalog.
create policy cleaning_products_select_all
  on public.cleaning_products for select
  using (true);

create policy cleaning_products_write_admin
  on public.cleaning_products for insert
  with check (public.is_admin());

create policy cleaning_products_update_admin
  on public.cleaning_products for update
  using (public.is_admin());

create policy booking_product_selections_select_own
  on public.booking_product_selections for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.customer_id = auth.uid()
    )
  );

create policy booking_product_selections_insert_own
  on public.booking_product_selections for insert
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.customer_id = auth.uid()
    )
  );

create policy booking_product_selections_select_assigned_staff
  on public.booking_product_selections for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.assigned_staff_id = auth.uid()
    )
  );

create policy booking_product_selections_all_admin
  on public.booking_product_selections for all
  using (public.is_admin())
  with check (public.is_admin());

-- Placeholder starter catalog -- three scent options per category, ready
-- to rename/replace from the admin products page once real products are
-- picked.
insert into public.cleaning_products (category, name, is_default, sort_order) values
  ('all_purpose_cleaner', 'All-purpose cleaner: Scent 1', true, 1),
  ('all_purpose_cleaner', 'All-purpose cleaner: Scent 2', false, 2),
  ('all_purpose_cleaner', 'All-purpose cleaner: Scent 3', false, 3),
  ('hard_floor_cleaner', 'Hard floor cleaner: Scent 1', true, 1),
  ('hard_floor_cleaner', 'Hard floor cleaner: Scent 2', false, 2),
  ('hard_floor_cleaner', 'Hard floor cleaner: Scent 3', false, 3),
  ('carpet_cleaner', 'Carpet cleaner: Scent 1', true, 1),
  ('carpet_cleaner', 'Carpet cleaner: Scent 2', false, 2),
  ('carpet_cleaner', 'Carpet cleaner: Scent 3', false, 3),
  ('glass_cleaner', 'Glass cleaner: Scent 1', true, 1),
  ('glass_cleaner', 'Glass cleaner: Scent 2', false, 2),
  ('glass_cleaner', 'Glass cleaner: Scent 3', false, 3),
  ('laundry_detergent', 'Laundry detergent: Scent 1', true, 1),
  ('laundry_detergent', 'Laundry detergent: Scent 2', false, 2),
  ('laundry_detergent', 'Laundry detergent: Scent 3', false, 3),
  ('fabric_softener', 'Fabric softener: Scent 1', true, 1),
  ('fabric_softener', 'Fabric softener: Scent 2', false, 2),
  ('fabric_softener', 'Fabric softener: Scent 3', false, 3);
