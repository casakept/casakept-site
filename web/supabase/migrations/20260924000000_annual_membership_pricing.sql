-- Adds an annual billing option alongside the existing monthly one.
-- Stored the same way monthly_price_cents/stripe_price_id already are --
-- an explicit price + Stripe Price id per plan, not a discount percentage
-- computed at display/checkout time -- so a future per-plan rate change
-- doesn't require touching application code, and what's shown in the UI
-- can never drift from what Stripe actually charges.
--
-- Both columns are nullable: a plan with no annual price configured yet
-- simply doesn't offer annual billing (startSubscriptionAction checks
-- stripe_price_id_annual before allowing the annual cadence).
alter table public.membership_plans
  add column annual_price_cents integer check (annual_price_cents >= 0),
  add column stripe_price_id_annual text;

comment on column public.membership_plans.annual_price_cents is
  'Full annual price in cents (already discounted, not monthly_price_cents * 12). Null = annual billing not offered for this plan.';
comment on column public.membership_plans.stripe_price_id_annual is
  'Stripe recurring Price id (interval=year) matching annual_price_cents.';
