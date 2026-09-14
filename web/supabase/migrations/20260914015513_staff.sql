-- Staff records, recurring weekly availability, and time off.
-- Staff are generalists (no per-service specialization field) and
-- scheduling uses the fixed morning/midday/afternoon windows.

create table public.staff (
  id uuid primary key references public.profiles (id) on delete cascade,
  active boolean not null default true,
  hire_date date not null default current_date,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.staff is 'Extends a profile with role=staff; generalist crew, no service specialization.';

create trigger set_staff_updated_at
  before update on public.staff
  for each row
  execute function public.set_updated_at();

-- Recurring weekly availability, e.g. "Tuesdays, morning + midday".
create table public.staff_availability (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  time_window public.schedule_window not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (staff_id, day_of_week, time_window)
);

create index staff_availability_staff_id_idx on public.staff_availability (staff_id);

-- One-off exceptions to availability (vacation, sick days, etc.).
create table public.staff_time_off (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  reason text,
  created_at timestamptz not null default now()
);

create index staff_time_off_staff_id_idx on public.staff_time_off (staff_id);

alter table public.staff enable row level security;
alter table public.staff_availability enable row level security;
alter table public.staff_time_off enable row level security;
