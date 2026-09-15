-- First CMS-editable content type: the Cocina weekly menu. Previously
-- hardcoded in src/app/cocina/page.tsx and requiring a code deploy to
-- change ("New menu posted every Sunday" -- a weekly cadence that
-- shouldn't require touching code). Seeded with the dishes that were
-- hardcoded on the page at the time of this migration so the public page
-- doesn't go blank at launch.

create table public.cocina_menu_items (
  id uuid primary key default gen_random_uuid(),
  dish_name text not null,
  description text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cocina_menu_items_active_sort_idx
  on public.cocina_menu_items (active, sort_order);

create trigger set_cocina_menu_items_updated_at
  before update on public.cocina_menu_items
  for each row
  execute function public.set_updated_at();

alter table public.cocina_menu_items enable row level security;

-- Same public-catalog pattern as services / membership_plans: anyone can
-- read active rows, only admins can write.
create policy cocina_menu_items_select_active
  on public.cocina_menu_items for select
  using (active = true or public.is_admin());

create policy cocina_menu_items_write_admin
  on public.cocina_menu_items for insert
  with check (public.is_admin());

create policy cocina_menu_items_update_admin
  on public.cocina_menu_items for update
  using (public.is_admin());

create policy cocina_menu_items_delete_admin
  on public.cocina_menu_items for delete
  using (public.is_admin());

insert into public.cocina_menu_items (dish_name, description, sort_order) values
  ('Caldo de res', 'slow-simmered beef & vegetables, arroz on the side', 1),
  ('Enchiladas verdes', 'roasted tomatillo salsa, crema, frijoles de la olla', 2),
  ('Pollo en mole', 'scratch-made mole, warm hand-made tortillas', 3),
  ('Picadillo Tuesdays', 'weeknight family classic, kid-approved', 4),
  ('Tamales by the dozen', 'seasonal — reserve early for the holidays', 5);
