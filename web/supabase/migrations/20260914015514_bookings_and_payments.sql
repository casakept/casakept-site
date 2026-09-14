-- Bookings, payments, and notification delivery log.

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete restrict,
  service_type public.service_type not null,
  service_id uuid references public.services (id),
  subscription_id uuid references public.subscriptions (id),
  scheduled_date date not null,
  time_window public.schedule_window not null,
  status public.booking_status not null default 'pending',
  -- "Preferred cleaner with fallback" only applies to cleaning visits;
  -- other service types are simple next-available assignment.
  preferred_staff_id uuid references public.staff (id),
  assigned_staff_id uuid references public.staff (id),
  price_cents integer not null default 0 check (price_cents >= 0),
  covered_by_entitlement boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint preferred_staff_only_for_cleaning check (
    preferred_staff_id is null
    or service_type in ('standard_clean', 'deep_clean')
  )
);

create index bookings_customer_id_idx on public.bookings (customer_id);
create index bookings_assigned_staff_id_idx on public.bookings (assigned_staff_id);
create index bookings_scheduled_date_idx on public.bookings (scheduled_date);

create trigger set_bookings_updated_at
  before update on public.bookings
  for each row
  execute function public.set_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  status public.payment_status not null default 'pending',
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_has_a_target check (
    booking_id is not null or subscription_id is not null
  )
);

create index payments_customer_id_idx on public.payments (customer_id);

create trigger set_payments_updated_at
  before update on public.payments
  for each row
  execute function public.set_updated_at();

-- Delivery log for confirmations/reminders. Email is the default channel
-- for everyone; SMS only fires when profiles.sms_opt_in is true.
create table public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  channel public.notification_channel not null,
  template text not null,
  sent_at timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index notifications_log_customer_id_idx on public.notifications_log (customer_id);

alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.notifications_log enable row level security;
