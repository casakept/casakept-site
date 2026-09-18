-- Catalog updates per business decision (2026-09-17): CasaKept is focusing
-- on household upkeep only, pausing anything food/meal-related, plus a
-- couple of naming/pricing corrections.

-- 1. Pause Cocina meal drops -- reversible (active flag, not a delete) so
-- the row/history survives if food service ever comes back. Also drop it
-- from Casa Completa's included entitlements, since a paused service
-- shouldn't still be advertised as "included" on a membership tier.
update public.services set active = false where service_type = 'cocina_meal';

delete from public.plan_entitlements
where service_type = 'cocina_meal'
  and plan_id = (select id from public.membership_plans where slug = 'casa-completa');

-- 2 & 3. Rename the two errand catalog rows and clarify their scope in
-- the description -- no dollar figure baked in here, that stays computed
-- from base_price_cents wherever it's displayed (see the pricing_cms
-- migration's reasoning for why hardcoded price strings are avoided).
update public.services
set name = 'Errands - To Go',
    description = 'Within a 25-mile radius, up to 3 stops.'
where service_type = 'errand' and name = 'Errands (3 stops)';

update public.services
set name = 'Errands - Wait at Home',
    description = 'Booked at an hourly rate.'
where service_type = 'errand' and name = 'Errands, wait-at-home';

-- 4. First-deep-clean discount drops from 50% to 15%. No dollar amount
-- stored here either -- every page that shows this promo computes the
-- discounted price live from services.base_price_cents.
update public.services
set description = 'Top-to-bottom reset. New members get 15% off their first deep clean.'
where service_type = 'deep_clean';
