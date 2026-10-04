-- Stripe can deliver customer.subscription.updated and invoice.paid for a
-- brand-new subscription at nearly the same instant, and the webhook
-- handler for each creates the local row if it isn't there yet -- so both
-- could pass the "no row yet" check and both insert, leaving one customer
-- with two active memberships (which breaks every page that reads their
-- membership). One local row per Stripe subscription, enforced by the
-- database. Multiple rows with no Stripe id are still allowed.
alter table public.subscriptions
  add constraint subscriptions_stripe_subscription_id_key unique (stripe_subscription_id);
