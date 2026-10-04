import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// An upgrade offer whose response window has passed is expired: the crew
// carries on with the standard scope, so the customer must no longer be able
// to pay for it. Expiry is applied whenever something looks at a request
// (crew screen refresh, the customer's page, the payment webhook) rather
// than by a timer, and the open PaymentIntent is cancelled so a late payment
// can't go through.
export async function expireDueUpgradeRequests(
  supabase: SupabaseClient<Database>,
  stripe: Stripe,
  filter?: { requestId?: string; token?: string; bookingIds?: string[] }
): Promise<number> {
  let query = supabase
    .from("upgrade_requests")
    .update({ status: "expired", responded_at: new Date().toISOString() })
    .eq("status", "link_sent")
    .lt("expires_at", new Date().toISOString());
  if (filter?.requestId) query = query.eq("id", filter.requestId);
  if (filter?.token) query = query.eq("token", filter.token);
  if (filter?.bookingIds) query = query.in("booking_id", filter.bookingIds);

  const { data: expired, error } = await query.select("id, stripe_payment_intent_id");
  if (error) {
    console.error("expireDueUpgradeRequests failed", error);
    return 0;
  }

  for (const request of expired ?? []) {
    if (!request.stripe_payment_intent_id) continue;
    try {
      const intent = await stripe.paymentIntents.retrieve(request.stripe_payment_intent_id);
      if (intent.status !== "succeeded" && intent.status !== "canceled" && intent.status !== "processing") {
        await stripe.paymentIntents.cancel(intent.id);
      }
    } catch (err) {
      console.error("expireDueUpgradeRequests: couldn't cancel PaymentIntent", { requestId: request.id, err });
    }
  }
  return expired?.length ?? 0;
}
