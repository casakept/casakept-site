// Shared between cancelSubscriptionAction (which actually schedules it with
// Stripe) and the account page (which needs to preview it before the
// customer confirms) -- kept as one function so the preview can never say
// something different from what actually happens.
//
// Annual: already paid in full for the year, so cancelling just stops at
// the existing current_period_end -- the minimum term is redundant for
// them and skipped entirely. Monthly: keeps renewing/billing normally
// through the minimum term commitment if it hasn't been reached yet,
// otherwise it's just their next normal renewal date.
export function effectiveCancelDate(params: {
  billingCadence: string;
  minimumTermEnd: string;
  currentPeriodEnd: string;
}): Date {
  const minimumTermEnd = new Date(params.minimumTermEnd);
  const currentPeriodEnd = new Date(params.currentPeriodEnd);
  return params.billingCadence === "annual" || minimumTermEnd <= new Date()
    ? currentPeriodEnd
    : minimumTermEnd;
}
