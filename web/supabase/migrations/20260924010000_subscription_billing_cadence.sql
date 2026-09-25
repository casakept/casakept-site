-- Records whether a subscription is billed monthly or annually, set from
-- the Stripe subscription's metadata.billing_cadence (see
-- startSubscriptionAction/syncSubscription). Without this, the "Your
-- membership" view had no way to tell an annual subscriber apart from a
-- monthly one and always showed the plan's monthly price/cadence, which
-- is wrong for anyone who paid annually.
alter table public.subscriptions
  add column billing_cadence text not null default 'monthly'
    check (billing_cadence in ('monthly', 'annual'));
