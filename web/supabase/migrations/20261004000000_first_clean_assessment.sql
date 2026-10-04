-- First standard clean at a home: the customer answers a few condition
-- questions, may be recommended a deep clean instead, and (if they keep the
-- standard clean) agrees that the crew may offer a deep-clean upgrade on
-- arrival. Stored on the booking so the crew sees the context and so there's
-- a record of exactly what the customer agreed to.
--
-- upgrade_max_cents is the most the upgrade could add (deep clean price
-- minus standard clean price for this home) at the moment they agreed.
-- Nothing is charged without the customer approving it at the time.
alter table public.bookings
  add column condition_answers jsonb,
  add column recommended_deep boolean,
  add column upgrade_consent_at timestamptz,
  add column upgrade_max_cents integer
    check (upgrade_max_cents is null or upgrade_max_cents >= 0);
