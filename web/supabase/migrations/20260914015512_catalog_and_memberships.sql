-- Customer properties, service catalog, membership plans/entitlements,
-- subscriptions, and per-cycle entitlement usage tracking.

-- A customer can have multiple serviced addresses.
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null default 'TX',
  zip text not null,
  access_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_customer_id_idx on public.properties (customer_id);

create trigger set_properties_updated_at
  before update on public.properties
  for each row
  execute function public.set_updated_at();

-- A la carte service catalog (also priced as one-off add-ons for members).
create table public.services (
  id uuid primary key default gen_random_uuid(),
  service_type public.service_type not null,
  name text not null,
  description text,
  base_price_cents integer not null check (base_price_cents >= 0),
  default_duration_minutes integer,
  member_discount_pct numeric(5, 2) not null default 0 check (member_discount_pct between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_services_updated_at
  before update on public.services
  for each row
  execute function public.set_updated_at();

-- Membership tiers (Casa Base / Familia / Completa).
create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  description text,
  -- Discount applied to a la carte services not covered by entitlements
  -- (e.g. Casa Base: 10% off; Casa Familia: 15% off deep cleans/meals/
  -- organization; Casa Completa: 20% off extras).
  extra_services_discount_pct numeric(5, 2) not null default 0
    check (extra_services_discount_pct between 0 and 100),
  minimum_term_months integer not null default 3,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_membership_plans_updated_at
  before update on public.membership_plans
  for each row
  execute function public.set_updated_at();

-- What each plan includes: quantity of a service type per billing cadence.
create table public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.membership_plans (id) on delete cascade,
  service_type public.service_type not null,
  quantity integer not null check (quantity > 0),
  frequency public.entitlement_frequency not null,
  created_at timestamptz not null default now(),
  unique (plan_id, service_type, frequency)
);

create index plan_entitlements_plan_id_idx on public.plan_entitlements (plan_id);

-- A customer's active/past membership subscription.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.membership_plans (id),
  status public.subscription_status not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  minimum_term_end timestamptz not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_customer_id_idx on public.subscriptions (customer_id);

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

-- Tracks how much of a per-cycle entitlement a subscription has used, e.g.
-- "2 of 2 grocery runs used this billing period".
create table public.entitlement_usage (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  service_type public.service_type not null,
  billing_period_start timestamptz not null,
  billing_period_end timestamptz not null,
  included_count integer not null check (included_count >= 0),
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, service_type, billing_period_start)
);

create index entitlement_usage_subscription_id_idx on public.entitlement_usage (subscription_id);

create trigger set_entitlement_usage_updated_at
  before update on public.entitlement_usage
  for each row
  execute function public.set_updated_at();

alter table public.properties enable row level security;
alter table public.services enable row level security;
alter table public.membership_plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlement_usage enable row level security;
