-- Extensions and shared enum types for the CasaKept data model.

create extension if not exists "pgcrypto";

-- Roles: who a person is in the system.
create type public.user_role as enum ('customer', 'staff', 'admin');

-- What kind of service a booking/entitlement/catalog row refers to.
create type public.service_type as enum (
  'standard_clean',
  'deep_clean',
  'move_out_clean',
  'carpet_cleaning',
  'window_cleaning',
  'organization',
  'laundry',
  'laundry_rush',
  'grocery',
  'fridge_restock',
  'cocina_meal',
  'errand'
);

-- Recurrence cadence used by membership plan entitlements.
create type public.entitlement_frequency as enum ('weekly', 'biweekly', 'monthly', 'quarterly');

-- Fixed daily scheduling windows (no exact start times).
create type public.schedule_window as enum ('morning', 'midday', 'afternoon');

-- Lifecycle of a booking.
create type public.booking_status as enum (
  'pending',
  'confirmed',
  'assigned',
  'in_progress',
  'completed',
  'cancelled'
);

-- Lifecycle of a membership subscription.
create type public.subscription_status as enum (
  'active',
  'paused',
  'cancelled',
  'past_due'
);

-- Lifecycle of a payment/charge.
create type public.payment_status as enum (
  'pending',
  'succeeded',
  'failed',
  'refunded'
);

-- Notification delivery channel.
create type public.notification_channel as enum ('email', 'sms');
