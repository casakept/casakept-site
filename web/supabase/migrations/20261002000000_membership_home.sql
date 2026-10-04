-- A membership covers one home. Included visits (entitlements) apply only
-- at subscriptions.property_id, so a customer with several properties
-- can't have one membership cover them all.
--
-- home_size_addon_cents is the extra recurring amount charged on top of
-- the plan price for a home larger than the plan's included scope (the
-- per-visit home-size rate x the plan's included visits). It's the amount
-- per billing period: monthly for monthly members, yearly for annual ones.
-- Stripe is the source of truth for what's actually billed; this mirrors it
-- for display and the renewal reminder emails.
--
-- property_id is nullable: set null if the property is removed (the app
-- blocks removing the home of an active membership), and memberships that
-- predate this have none.
alter table public.subscriptions
  add column property_id uuid references public.properties (id) on delete set null,
  add column home_size_addon_cents integer not null default 0
    check (home_size_addon_cents >= 0);
