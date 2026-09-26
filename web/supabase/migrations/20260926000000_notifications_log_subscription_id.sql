-- Needed for the annual membership renewal reminder cron: dedup has to be
-- scoped per subscription, and per renewal cycle (an annual subscription
-- recurs every year, so a "has this template ever been sent to this
-- customer" check would correctly send the first year's reminder then
-- incorrectly block every year after). booking_id already plays this role
-- for booking-scoped notifications; this is the same pattern for
-- subscription-scoped ones. Mirrors payments.subscription_id.
alter table public.notifications_log
  add column subscription_id uuid references public.subscriptions (id) on delete set null;

create index notifications_log_subscription_id_idx on public.notifications_log (subscription_id);
