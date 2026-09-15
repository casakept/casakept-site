-- Walkthrough & Estimate Form: digitizes the in-person sales walkthrough
-- worksheet (contact/property intake, condition ratings, a priced
-- membership + one-time worksheet, and a scope acknowledgment with
-- signature) so estimators fill it on a tablet/laptop during the visit
-- instead of on paper. Admin-only internal tool -- there's no self-serve
-- public version and no auth account is required for the prospect (they
-- may not have signed up yet). Converting an approved estimate into a
-- real signup/subscription stays a manual, separate step for now.

create type public.product_preference as enum ('standard', 'hypoallergenic', 'pet_safe');

create type public.estimate_status as enum ('draft', 'sent', 'converted', 'declined');

create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  status public.estimate_status not null default 'draft',
  estimator_id uuid not null references public.profiles (id),
  customer_id uuid references public.profiles (id),

  -- 1: home & contact
  contact_name text not null,
  contact_phone text,
  contact_email text,
  address_line1 text not null,
  city text not null,
  state text not null default 'TX',
  zip text,
  approx_sq_ft integer check (approx_sq_ft is null or approx_sq_ft > 0),
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  bathrooms numeric(3, 1) check (bathrooms is null or bathrooms >= 0),
  stories integer check (stories is null or stories > 0),
  has_pets boolean not null default false,
  pets_notes text,
  has_alarm boolean not null default false,
  gate_code_needed boolean not null default false,
  preferred_entry text,
  product_preference public.product_preference not null default 'standard',

  -- 2: condition at walkthrough (1 = needs deep reset, 5 = well maintained)
  condition_kitchen smallint check (condition_kitchen is null or condition_kitchen between 1 and 5),
  condition_bathrooms smallint check (condition_bathrooms is null or condition_bathrooms between 1 and 5),
  condition_floors smallint check (condition_floors is null or condition_floors between 1 and 5),
  condition_dust smallint check (condition_dust is null or condition_dust between 1 and 5),
  condition_clutter smallint check (condition_clutter is null or condition_clutter between 1 and 5),
  condition_windows smallint check (condition_windows is null or condition_windows between 1 and 5),
  condition_notes text,

  -- 3: estimate worksheet -- membership priced from the catalog at write
  -- time (plan price + sq-ft size adjustment + optional onboarding deep
  -- clean); one-time items are a worksheet since real pricing varies
  -- (carpet addon vs. solo, move-out scoped per walkthrough, etc.), so
  -- each line keeps a server-validated total = unit_price_cents * qty
  -- but the unit price itself is an estimator-entered/edited figure.
  selected_plan_id uuid references public.membership_plans (id),
  size_adjustment_cents integer not null default 0 check (size_adjustment_cents >= 0),
  onboarding_deep_clean boolean not null default false,
  onboarding_deep_clean_cents integer not null default 0 check (onboarding_deep_clean_cents >= 0),
  monthly_total_cents integer not null default 0 check (monthly_total_cents >= 0),
  one_time_services jsonb not null default '[]'::jsonb,
  one_time_total_cents integer not null default 0 check (one_time_total_cents >= 0),
  preferred_days text[] not null default '{}',
  preferred_window public.schedule_window,
  target_start_date date,

  -- 4: scope acknowledgment
  ack_services_guide boolean not null default false,
  ack_membership_terms boolean not null default false,
  ack_guarantee boolean not null default false,
  ack_carpet_access boolean not null default false,
  ack_estimate_validity boolean not null default false,
  customer_signature text,
  customer_signed_at timestamptz,
  estimator_signed_at timestamptz,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.estimates is
  'Walkthrough & Estimate Form -- filled in-app by an estimator during an in-home sales visit.';

comment on column public.estimates.one_time_services is
  'Array of {service_id, service_type, name, qty, unit_price_cents, total_cents} worksheet lines.';

create index estimates_estimator_id_idx on public.estimates (estimator_id);
create index estimates_customer_id_idx on public.estimates (customer_id);

create trigger set_estimates_updated_at
  before update on public.estimates
  for each row
  execute function public.set_updated_at();

alter table public.estimates enable row level security;

-- Internal sales tool only -- no customer-facing exposure, so a single
-- admin-only policy is sufficient (unlike visit_checkins/visit_scores,
-- there's no "own records" case here since prospects aren't authenticated
-- users and estimators are admins).
create policy estimates_all_admin
  on public.estimates for all
  using (public.is_admin())
  with check (public.is_admin());
