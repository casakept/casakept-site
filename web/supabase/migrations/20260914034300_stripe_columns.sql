-- Stripe identifiers needed to wire up real payments.

-- One Stripe Customer per user, created lazily on first payment/subscription
-- and reused across both memberships and one-time booking charges (previously
-- only lived on subscriptions, which didn't help before a user's first plan).
alter table public.profiles
  add column stripe_customer_id text;

-- Each membership tier maps to a real recurring Stripe Price.
alter table public.membership_plans
  add column stripe_price_id text;
