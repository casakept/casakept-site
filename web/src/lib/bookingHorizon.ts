// "Priority scheduling" (see membership_plans.perks) -- members can plan
// further ahead than non-members. Shared between the booking wizard's date
// picker (BookingWizard.tsx) and the real server-side gate
// (createBookingAction) so the displayed limit and the enforced one can
// never drift apart; the picker's max is a courtesy, the server check is
// what actually stops a submitted date past it.
export const NON_MEMBER_BOOKING_HORIZON_DAYS = 14;
export const MEMBER_BOOKING_HORIZON_DAYS = 60;
