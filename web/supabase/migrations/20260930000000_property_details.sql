-- Home size details captured when a customer adds a property. These will
-- drive per-visit pricing (extra bedrooms/bathrooms/rooms over the base
-- scope) in a later phase; sq ft is informational only.
--
-- Columns are nullable at the DB level (properties created by admin
-- tooling or older scripts won't have them) -- the self-serve add-property
-- form is what makes them mandatory.
alter table public.properties
  add column bedrooms smallint,
  add column bathrooms numeric(3, 1),
  -- Lower bound of the selected range: 0 = "Under 1,000", 1000-9500 =
  -- that value through +499, 10000 = "10,000+".
  add column sq_ft_min integer,
  add column extra_rooms text[] not null default '{}';

alter table public.properties
  add constraint properties_bedrooms_range
    check (bedrooms is null or bedrooms between 1 and 10),
  add constraint properties_bathrooms_range
    check (bathrooms is null or (bathrooms between 1 and 10 and mod(bathrooms * 2, 1) = 0)),
  add constraint properties_sq_ft_min_valid
    check (sq_ft_min is null or sq_ft_min = 0 or (sq_ft_min between 1000 and 10000 and mod(sq_ft_min, 500) = 0)),
  add constraint properties_extra_rooms_valid
    check (extra_rooms <@ array['office', 'den', 'extra_living_room', 'media_room']);
