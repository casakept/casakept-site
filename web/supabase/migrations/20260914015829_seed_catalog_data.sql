-- Production catalog data, ported 1:1 from pricing.html so the site's
-- pricing page (and booking flow) can read it from the database instead
-- of hardcoded markup.

-- ---------------------------------------------------------------------
-- Services (a la carte / one-time prices)
-- ---------------------------------------------------------------------
insert into public.services
  (service_type, name, description, base_price_cents, default_duration_minutes)
values
  ('standard_clean', 'Standard clean', 'Covers homes up to 2,500 sq ft; add $30/visit per additional 500 sq ft.', 19900, null),
  ('deep_clean', 'Deep clean', 'Top-to-bottom reset. New members get 50% off their first deep clean ($325 -> $162).', 32500, null),
  ('move_out_clean', 'Move-in / move-out clean', 'Starting price; scopes above 2,500 sq ft priced per walkthrough.', 42500, null),
  ('carpet_cleaning', 'Carpet cleaning', '3-room minimum. $45/room as an add-on to another service; $60/room booked solo.', 4500, null),
  ('window_cleaning', 'Window cleaning, inside & out', 'Up to 15 windows.', 12500, null),
  ('organization', 'Home organization', '3-hour minimum, billed hourly.', 7500, 180),
  ('laundry', 'Laundry, per bag', '48-hour return. Bag holds ~15-18 lbs; comforters/oversized bedding priced per piece.', 3500, null),
  ('laundry_rush', 'Laundry, same-day rush', 'Same-day turnaround.', 4500, null),
  ('grocery', 'Grocery pickup + delivery', 'Excludes cost of groceries -- billed at actual cost with a receipt photo, no markup.', 4500, null),
  ('fridge_restock', 'Fridge cleanout + restock', 'Excludes cost of groceries -- billed at actual cost with a receipt photo, no markup.', 8500, null),
  ('cocina_meal', 'Cocina family meal drop', 'Feeds 4-5.', 7500, null),
  ('errand', 'Errands (3 stops)', 'Flat rate for up to 3 stops.', 3500, null),
  ('errand', 'Errands, wait-at-home', 'Hourly rate.', 3000, 60);

-- ---------------------------------------------------------------------
-- Membership plans
-- ---------------------------------------------------------------------
insert into public.membership_plans
  (slug, name, monthly_price_cents, description, extra_services_discount_pct, minimum_term_months, sort_order)
values
  ('casa-base', 'Casa Base', 19900,
    'For couples & "just keep it clean" homes. Your clean at the one-time price -- perks free.',
    10.00, 3, 1),
  ('casa-familia', 'Casa Familia', 44900,
    'For busy families who want the week handled. Save ~25% + perks.',
    15.00, 3, 2),
  ('casa-completa', 'Casa Completa', 94900,
    'The full household plan -- one text, all of it done. Save ~40% vs one-time.',
    20.00, 3, 3);

-- ---------------------------------------------------------------------
-- Plan entitlements (quantity = total included per calendar month;
-- frequency = the cadence the visits are spread across the month)
-- ---------------------------------------------------------------------

-- Casa Base: 1 standard clean/mo. (Member laundry rate of $30/bag and the
-- general 10% off other services are pricing discounts, not included
-- quantities, so they aren't modeled as entitlements.)
insert into public.plan_entitlements (plan_id, service_type, quantity, frequency)
select id, 'standard_clean', 1, 'monthly' from public.membership_plans where slug = 'casa-base';

-- Casa Familia: biweekly cleans + grocery runs (2/mo each), 2 laundry
-- bags/mo (biweekly pickup), 1 free errand/mo.
insert into public.plan_entitlements (plan_id, service_type, quantity, frequency)
select id, 'standard_clean'::service_type, 2, 'biweekly'::entitlement_frequency from public.membership_plans where slug = 'casa-familia'
union all
select id, 'grocery'::service_type, 2, 'biweekly'::entitlement_frequency from public.membership_plans where slug = 'casa-familia'
union all
select id, 'laundry'::service_type, 2, 'biweekly'::entitlement_frequency from public.membership_plans where slug = 'casa-familia'
union all
select id, 'errand'::service_type, 1, 'monthly'::entitlement_frequency from public.membership_plans where slug = 'casa-familia';

-- Casa Completa: weekly cleans/laundry/grocery (4/mo each), fridge
-- restock every other week (2/mo), 2 Cocina meal drops/mo, quarterly
-- deep clean, dedicated household manager (not a bookable entitlement).
insert into public.plan_entitlements (plan_id, service_type, quantity, frequency)
select id, 'standard_clean'::service_type, 4, 'weekly'::entitlement_frequency from public.membership_plans where slug = 'casa-completa'
union all
select id, 'laundry'::service_type, 4, 'weekly'::entitlement_frequency from public.membership_plans where slug = 'casa-completa'
union all
select id, 'grocery'::service_type, 4, 'weekly'::entitlement_frequency from public.membership_plans where slug = 'casa-completa'
union all
select id, 'fridge_restock'::service_type, 2, 'biweekly'::entitlement_frequency from public.membership_plans where slug = 'casa-completa'
union all
select id, 'cocina_meal'::service_type, 2, 'monthly'::entitlement_frequency from public.membership_plans where slug = 'casa-completa'
union all
select id, 'deep_clean'::service_type, 1, 'quarterly'::entitlement_frequency from public.membership_plans where slug = 'casa-completa';
