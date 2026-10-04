import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

export type ExpireUnpaidResult = { removed: number; skipped: number };

// createBookingAction saves a booking as "pending" before the customer
// reaches the payment screen, so backing out leaves an unpaid booking
// behind. Those never became real bookings (no cleaner is assigned until
// payment succeeds), so once one has sat unpaid for a while this releases
// its PaymentIntent in Stripe and removes it entirely rather than leaving a
// "cancelled" row the customer never actually cancelled.
//
// The PaymentIntent is cancelled FIRST: once Stripe reports it cancelled it
// can no longer succeed, so a customer can't pay for a booking this job is
// about to delete. If a PaymentIntent has already succeeded or is
// processing (or Stripe can't be reached), the booking is skipped and left
// for the payment webhook to confirm.
export async function expireUnpaidBookings(
  supabase: SupabaseClient,
  stripe: Stripe,
  olderThanMs: number
): Promise<ExpireUnpaidResult> {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();

  const { data: stale, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("status", "pending")
    .eq("covered_by_entitlement", false)
    .lt("created_at", cutoff);
  if (error) throw error;

  let removed = 0;
  let skipped = 0;

  for (const booking of stale ?? []) {
    const { data: payments } = await supabase
      .from("payments")
      .select("id, status, stripe_payment_intent_id")
      .eq("booking_id", booking.id);

    if ((payments ?? []).some((p) => p.status === "succeeded" || p.status === "refunded")) {
      skipped++;
      continue;
    }

    let blocked = false;
    for (const payment of payments ?? []) {
      if (!payment.stripe_payment_intent_id) continue;
      try {
        const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
        if (intent.status === "succeeded" || intent.status === "processing") {
          blocked = true;
          break;
        }
        if (intent.status !== "canceled") {
          await stripe.paymentIntents.cancel(intent.id);
        }
      } catch (err) {
        console.error("expireUnpaidBookings: couldn't release PaymentIntent", { bookingId: booking.id, err });
        blocked = true;
        break;
      }
    }
    if (blocked) {
      skipped++;
      continue;
    }

    // payments has a check that a row needs a booking or a subscription, so
    // the unpaid payment rows have to go before the booking does.
    const { error: paymentDeleteError } = await supabase.from("payments").delete().eq("booking_id", booking.id);
    const { error: bookingDeleteError } = paymentDeleteError
      ? { error: paymentDeleteError }
      : await supabase.from("bookings").delete().eq("id", booking.id);
    if (bookingDeleteError) {
      console.error("expireUnpaidBookings: delete failed", { bookingId: booking.id, bookingDeleteError });
      skipped++;
      continue;
    }
    removed++;
  }

  return { removed, skipped };
}
