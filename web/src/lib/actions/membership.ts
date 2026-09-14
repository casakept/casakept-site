"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrCreateStripeCustomerId } from "@/lib/stripe/customer";
import { stripe } from "@/lib/stripe/server";
import type Stripe from "stripe";

export type StartSubscriptionResult =
  | { error: string }
  | { clientSecret: string; subscriptionId: string };

// Starts a real Stripe Subscription checkout (payment_behavior:
// default_incomplete) and returns the PaymentIntent client secret for the
// customer to confirm via Stripe Elements. The local `subscriptions` row is
// NOT created here — it's created by the /api/webhooks/stripe handler once
// Stripe confirms the subscription is actually active (see
// customer.subscription.updated in that route), since that's the only
// trustworthy signal that payment succeeded.
export async function startSubscriptionAction(
  planId: string
): Promise<StartSubscriptionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: plan } = await supabase
    .from("membership_plans")
    .select("id, minimum_term_months, active, stripe_price_id")
    .eq("id", planId)
    .single();

  if (!plan || !plan.active) {
    return { error: "That plan isn't available right now." };
  }
  if (!plan.stripe_price_id) {
    return { error: "That plan isn't ready for checkout yet. Contact us to join." };
  }

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("customer_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return { error: "You already have an active membership. Contact us to change plans." };
  }

  const stripeCustomerId = await getOrCreateStripeCustomerId(
    supabase,
    user.id,
    user.email
  );

  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: plan.stripe_price_id }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.confirmation_secret"],
    metadata: {
      customer_id: user.id,
      plan_id: plan.id,
      minimum_term_months: String(plan.minimum_term_months),
    },
  });

  const invoice = subscription.latest_invoice as Stripe.Invoice | null;
  const clientSecret = invoice?.confirmation_secret?.client_secret;

  if (!clientSecret) {
    return { error: "Could not start checkout. Please try again." };
  }

  return { clientSecret, subscriptionId: subscription.id };
}
