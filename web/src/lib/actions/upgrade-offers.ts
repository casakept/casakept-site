"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe/server";
import { getOrCreateStripeCustomerId } from "@/lib/stripe/customer";
import { expireDueUpgradeRequests } from "@/lib/upgradeExpiry";

export type UpgradeOfferResult = { error: string } | { success: true };
export type StartUpgradePaymentResult = { error: string } | { clientSecret: string };

// The customer's approve/decline page isn't behind a login: the
// unguessable token in the link is what authorizes it (same trust model as
// the visit survey), so these run on the service client and check the
// request's state themselves.

// Opens the payment for the upgrade. Refuses once the response window has
// closed or the request is no longer live, so a customer can't pay for an
// upgrade the crew has already moved on from.
export async function startUpgradePaymentAction(token: string): Promise<StartUpgradePaymentResult> {
  const supabase = createServiceClient();
  await expireDueUpgradeRequests(supabase, stripe, { token });

  const { data: request } = await supabase
    .from("upgrade_requests")
    .select("id, booking_id, status, amount_cents, expires_at, stripe_payment_intent_id")
    .eq("token", token)
    .maybeSingle();
  if (!request) return { error: "This link isn't valid." };
  if (request.status !== "link_sent") return { error: "This offer is no longer open." };
  if (!request.expires_at || new Date(request.expires_at).getTime() <= Date.now()) {
    return { error: "This offer has closed." };
  }

  // Reuse an open payment if the page was reloaded.
  if (request.stripe_payment_intent_id) {
    const existing = await stripe.paymentIntents.retrieve(request.stripe_payment_intent_id);
    if (existing.client_secret && ["requires_payment_method", "requires_confirmation", "requires_action"].includes(existing.status)) {
      return { clientSecret: existing.client_secret };
    }
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("customer_id")
    .eq("id", request.booking_id)
    .single();
  if (!booking) return { error: "We couldn't find that visit." };

  const { data: authUser } = await supabase.auth.admin.getUserById(booking.customer_id);
  const stripeCustomerId = await getOrCreateStripeCustomerId(supabase, booking.customer_id, authUser.user?.email);

  const intent = await stripe.paymentIntents.create({
    amount: request.amount_cents,
    currency: "usd",
    customer: stripeCustomerId,
    automatic_payment_methods: { enabled: true },
    metadata: {
      upgrade_request_id: request.id,
      booking_id: request.booking_id,
      customer_id: booking.customer_id,
    },
  });

  await supabase.from("payments").insert({
    customer_id: booking.customer_id,
    booking_id: request.booking_id,
    amount_cents: request.amount_cents,
    status: "pending",
    stripe_payment_intent_id: intent.id,
  });
  await supabase.from("upgrade_requests").update({ stripe_payment_intent_id: intent.id }).eq("id", request.id);

  if (!intent.client_secret) return { error: "Could not start payment. Please try again." };
  return { clientSecret: intent.client_secret };
}

export async function declineUpgradeAction(token: string): Promise<UpgradeOfferResult> {
  const supabase = createServiceClient();
  await expireDueUpgradeRequests(supabase, stripe, { token });

  const { data: declined, error } = await supabase
    .from("upgrade_requests")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("token", token)
    .eq("status", "link_sent")
    .select("stripe_payment_intent_id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!declined) return { error: "This offer is no longer open." };

  if (declined.stripe_payment_intent_id) {
    try {
      const intent = await stripe.paymentIntents.retrieve(declined.stripe_payment_intent_id);
      if (intent.status !== "succeeded" && intent.status !== "canceled" && intent.status !== "processing") {
        await stripe.paymentIntents.cancel(intent.id);
      }
    } catch (err) {
      console.error("declineUpgradeAction: couldn't cancel PaymentIntent", { token, err });
    }
  }

  revalidatePath(`/upgrade/${token}`);
  return { success: true };
}
