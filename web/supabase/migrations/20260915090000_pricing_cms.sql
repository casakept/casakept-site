-- Makes /pricing (and the services list) read live from the catalog
-- instead of hardcoded JSX, so marketing copy can't drift from what
-- booking/billing actually charges. Two small additions to support the
-- non-numeric bits that aren't already represented:
--   - membership_plans.perks: the handful of per-plan marketing bullets
--     that aren't derivable from plan_entitlements/extra_services_discount_pct
--     (e.g. "Priority scheduling & the same crew every visit"). "Featured"
--     tier styling stays a slug check in app code (matches the existing
--     convention in account/membership/page.tsx), no new column for that.
--   - services.sort_order: a stable, intentional display order for the
--     one-time-services list, same pattern as membership_plans/checklist_items.
--
-- Also fixes a real (if previously unused) data gap: services.member_discount_pct
-- was 0 for every row even though the pricing copy has always advertised a
-- better member rate on laundry ($30/bag vs $35 base -- more generous than
-- any plan's blanket extra_services_discount_pct). That field was never
-- read anywhere in the booking price calculation either; this migration
-- sets the correct value and the app-code change in the same commit wires
-- createBookingAction/BookingWizard to actually apply it (the more
-- generous of the per-service rate or the plan's blanket discount), so the
-- marketing number and the real charge match.

alter table public.membership_plans add column perks text[] not null default '{}';
alter table public.services add column sort_order integer not null default 0;

update public.membership_plans set perks = array['Priority scheduling & the same crew every visit']
  where slug = 'casa-base';
update public.membership_plans set perks = array['Dedicated household manager']
  where slug = 'casa-completa';

update public.services set sort_order = 10 where service_type = 'standard_clean';
update public.services set sort_order = 20 where service_type = 'deep_clean';
update public.services set sort_order = 30 where service_type = 'move_out_clean';
update public.services set sort_order = 40 where service_type = 'carpet_cleaning';
update public.services set sort_order = 50 where service_type = 'window_cleaning';
update public.services set sort_order = 60 where service_type = 'organization';
update public.services set sort_order = 70 where service_type = 'laundry';
update public.services set sort_order = 80 where service_type = 'laundry_rush';
update public.services set sort_order = 90 where service_type = 'grocery';
update public.services set sort_order = 100 where service_type = 'fridge_restock';
update public.services set sort_order = 110 where service_type = 'cocina_meal';
update public.services set sort_order = 120 where service_type = 'errand' and name = 'Errands (3 stops)';
update public.services set sort_order = 130 where service_type = 'errand' and name = 'Errands, wait-at-home';

-- $35/bag base, $30/bag member rate -> 14.29% (rounds to exactly $30.00).
update public.services set member_discount_pct = 14.29 where service_type = 'laundry';
