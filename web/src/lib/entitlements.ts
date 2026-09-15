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
// month" for weekly/biweekly/monthly cadences, so those just reset with the
// subscription's own (monthly) Stripe billing period. Quarterly entitlements
// (e.g. Casa Completa's 1 free deep clean) need their own wider window --
// otherwise keying usage off the monthly billing period would hand out a
// fresh "quarterly" allowance every single month. That window is anchored
// to the subscription's creation date so it stays stable across renewals.
export function entitlementPeriodFor(
  frequency: EntitlementFrequency,
  subscriptionCreatedAt: string,
  currentPeriodStart: string,
  currentPeriodEnd: string
): { start: string; end: string } {
  if (frequency !== "quarterly") {
    return { start: currentPeriodStart, end: currentPeriodEnd };
  }

  const anchor = new Date(subscriptionCreatedAt);
  const periodStart = new Date(currentPeriodStart);
  const monthsSinceAnchor =
    (periodStart.getFullYear() - anchor.getFullYear()) * 12 +
    (periodStart.getMonth() - anchor.getMonth());
  const quarterIndex = Math.floor(monthsSinceAnchor / 3);

  const quarterStart = new Date(anchor);
  quarterStart.setMonth(quarterStart.getMonth() + quarterIndex * 3);
  const quarterEnd = new Date(quarterStart);
  quarterEnd.setMonth(quarterEnd.getMonth() + 3);

  return { start: quarterStart.toISOString(), end: quarterEnd.toISOString() };
}
