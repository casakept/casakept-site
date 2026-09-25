import type { Database } from "@/lib/supabase/database.types";

type EntitlementFrequency = Database["public"]["Enums"]["entitlement_frequency"];

// Wider frequency wins when a service_type has multiple plan_entitlements
// rows (not the case in current seed data, but keeps this correct if it
// ever happens) -- e.g. a quarterly allotment must not be reset by a
// monthly one for the same service.
const FREQUENCY_WIDTH: Record<EntitlementFrequency, number> = {
  weekly: 0,
  biweekly: 1,
  monthly: 2,
  quarterly: 3,
};

export function widestFrequency(frequencies: EntitlementFrequency[]): EntitlementFrequency {
  return frequencies.reduce((widest, f) =>
    FREQUENCY_WIDTH[f] > FREQUENCY_WIDTH[widest] ? f : widest
  );
}

// plan_entitlements quantities are defined as "total included per calendar
// month" for weekly/biweekly/monthly cadences, and "per quarter" for
// quarterly ones (e.g. Casa Completa's 1 free deep clean). Every frequency
// computes its own reset window anchored to the subscription's creation
// date, rather than trusting the Stripe billing period directly -- that
// used to be safe for non-quarterly frequencies only because billing was
// always monthly, so the Stripe period happened to equal one calendar
// month. Once annual billing exists, a year-long Stripe period would
// otherwise hand a member one calendar month's worth of entitlements for
// the whole year instead of resetting monthly, so this can't shortcut off
// currentPeriodStart/End for any frequency anymore.
const PERIOD_WIDTH_MONTHS: Record<EntitlementFrequency, number> = {
  weekly: 1,
  biweekly: 1,
  monthly: 1,
  quarterly: 3,
};

export function entitlementPeriodFor(
  frequency: EntitlementFrequency,
  subscriptionCreatedAt: string,
  currentPeriodStart: string
): { start: string; end: string } {
  const widthMonths = PERIOD_WIDTH_MONTHS[frequency];

  const anchor = new Date(subscriptionCreatedAt);
  const periodStart = new Date(currentPeriodStart);
  const monthsSinceAnchor =
    (periodStart.getFullYear() - anchor.getFullYear()) * 12 +
    (periodStart.getMonth() - anchor.getMonth());
  const windowIndex = Math.floor(monthsSinceAnchor / widthMonths);

  const windowStart = new Date(anchor);
  windowStart.setMonth(windowStart.getMonth() + windowIndex * widthMonths);
  const windowEnd = new Date(windowStart);
  windowEnd.setMonth(windowEnd.getMonth() + widthMonths);

  return { start: windowStart.toISOString(), end: windowEnd.toISOString() };
}
