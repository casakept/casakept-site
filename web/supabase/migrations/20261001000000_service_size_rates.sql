-- Home-size pricing for whole-home cleanings. A service's catalog price
-- (services.base_price_cents) covers a home up to included_bedrooms /
-- included_bathrooms; each step beyond that adds the per-unit amounts
-- below. Square footage is informational only and doesn't affect price.
-- One row per service, so deep cleans and move-out cleans can be rated
-- differently from standard cleans; services without a row aren't
-- size-priced. Editable by admins without a code change.
create table public.service_size_rates (
  service_type public.service_type primary key,
  included_bedrooms smallint not null default 3
    check (included_bedrooms between 1 and 10),
  included_bathrooms numeric(3, 1) not null default 2
    check (included_bathrooms between 1 and 10 and mod(included_bathrooms * 2, 1) = 0),
  extra_bedroom_cents integer not null check (extra_bedroom_cents >= 0),
  -- Charged per half-bath step over the included count, so a full extra
  -- bathroom costs twice this.
  extra_half_bath_cents integer not null check (extra_half_bath_cents >= 0),
  -- Office, den, extra living room, media room -- each one.
  extra_room_cents integer not null check (extra_room_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_service_size_rates_updated_at
  before update on public.service_size_rates
  for each row
  execute function public.set_updated_at();

alter table public.service_size_rates enable row level security;

-- Public catalog data, same as services: anyone can read, only admins write.
create policy service_size_rates_select
  on public.service_size_rates for select
  using (true);

create policy service_size_rates_insert_admin
  on public.service_size_rates for insert
  with check (public.is_admin());

create policy service_size_rates_update_admin
  on public.service_size_rates for update
  using (public.is_admin());

create policy service_size_rates_delete_admin
  on public.service_size_rates for delete
  using (public.is_admin());

-- Standard: $50 per extra bedroom or room, $25 per half bath ($50 full).
-- Deep clean and move-out take roughly 1.6x as long, so they're rated higher.
insert into public.service_size_rates
  (service_type, extra_bedroom_cents, extra_half_bath_cents, extra_room_cents)
values
  ('standard_clean', 5000, 2500, 5000),
  ('deep_clean', 8000, 4000, 8000),
  ('move_out_clean', 8000, 4000, 8000);

-- The old descriptions quoted the square-footage rule this replaces.
update public.services
  set description = 'Includes up to 3 bedrooms and 2 bathrooms; larger homes are priced by bedrooms, bathrooms, and extra rooms.'
  where service_type = 'standard_clean';
update public.services
  set description = 'Top-to-bottom reset for up to 3 bedrooms and 2 bathrooms; larger homes are priced by room count. New members get 15% off their first deep clean.'
  where service_type = 'deep_clean';
update public.services
  set description = 'Starting price for up to 3 bedrooms and 2 bathrooms; larger homes are priced by room count.'
  where service_type = 'move_out_clean';
