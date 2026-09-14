alter table public.subscriptions
  add column cancel_at_period_end boolean not null default false;
