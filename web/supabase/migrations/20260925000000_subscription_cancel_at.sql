-- Tracks Stripe's own subscription.cancel_at (a specific future timestamp),
-- distinct from cancel_at_period_end (which only ever means "stop at the
-- very next renewal"). Needed so a monthly membership's minimum-term
-- commitment can be enforced correctly: cancelling early doesn't refund
-- anything or end access immediately (see cancelSubscriptionAction) -- it
-- keeps renewing and billing normally through the minimum term, then
-- Stripe auto-cancels exactly at that date. Annual subscriptions skip the
-- minimum term entirely and just use their existing current_period_end.
alter table public.subscriptions
  add column cancel_at timestamptz;

comment on column public.subscriptions.cancel_at is
  'Mirrors Stripe subscription.cancel_at. Non-null = scheduled to cancel on this date (may be mid-cycle relative to a monthly billing period, when enforcing a minimum-term commitment). Null = not scheduled to cancel.';
