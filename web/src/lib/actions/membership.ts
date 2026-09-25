"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateStripeCustomerId } from "@/lib/stripe/customer";
import { stripe } from "@/lib/stripe/server";
import type Stripe from "stripe";

export type BillingCadence = "monthly" | "annual";

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
  planId: string,
  cadence: BillingCadence = "monthly"
): Promise<StartSubscriptionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: plan } = await supabase
    .from("membership_plans")
    .select("id, minimum_term_months, active, stripe_price_id, stripe_price_id_annual")
    .eq("id", planId)
    .single();

  if (!plan || !plan.active) {
    return { error: "That plan isn't available right now." };
  }
  const stripePriceId = cadence === "annual" ? plan.stripe_price_id_annual : plan.stripe_price_id;
  if (!stripePriceId) {
    return cadence === "annual"
      ? { error: "Annual billing isn't available for that plan yet. Contact us to join." }
      : { error: "That plan isn't ready for checkout yet. Contact us to join." };
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
    items: [{ price: stripePriceId }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.confirmation_secret"],
    metadata: {
      customer_id: user.id,
      plan_id: plan.id,
      minimum_term_months: String(plan.minimum_term_months),
      billing_cadence: cadence,
    },
  });

  const invoice = subscription.latest_invoice as Stripe.Invoice | null;
  const clientSecret = invoice?.confirmation_secret?.client_secret;

  if (!clientSecret) {
    return { error: "Could not start checkout. Please try again." };
  }

  return { clientSecret, subscriptionId: subscription.id };
}

export type MembershipActionResult = { error: string } | { success: true };

// Schedules cancellation for the end of the current billing period (rather
// than cancelling immediately) so the member keeps access/entitlements
// they've already paid for. The local `subscriptions` row is NOT updated
// here — the webhook's customer.subscription.updated handler syncs
// cancel_at_period_end once Stripe confirms the change.
export async function cancelSubscriptionAction(): Promise<MembershipActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, stripe_subscription_id, minimum_term_end, cancel_at_period_end")
    .eq("customer_id", user.id)
    .in("status", ["active", "past_due"])
    .maybeSingle();

  if (!subscription || !subscription.stripe_subscription_id) {
    return { error: "You don't have an active membership to cancel." };
  }
  if (subscription.cancel_at_period_end) {
    return { error: "Your membership is already scheduled to cancel." };
  }
  if (new Date(subscription.minimum_term_end) > new Date()) {
    return {
      error: `Your membership has a minimum term through ${new Date(
        subscription.minimum_term_end
      ).toLocaleDateString()}. You can cancel starting then.`,
    };
  }

  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  revalidatePath("/account/membership");
  return { success: true };
}

// Reverses a pending (not-yet-effective) cancellation.
export async function resumeSubscriptionAction(): Promise<MembershipActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, stripe_subscription_id, cancel_at_period_end")
    .eq("customer_id", user.id)
    .in("status", ["active", "past_due"])
    .maybeSingle();

  if (!subscription || !subscription.stripe_subscription_id || !subscription.cancel_at_period_end) {
    return { error: "Your membership isn't scheduled to cancel." };
  }

  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  revalidatePath("/account/membership");
  return { success: true };
}

export type RetryPaymentResult = { error: string } | { clientSecret: string };

// Returns a fresh client secret for the subscription's currently open
// invoice so the member can confirm it with a new payment method via Stripe
// Elements. Because subscriptions were created with
// payment_settings.save_default_payment_method: "on_subscription", a
// successful confirmation here also becomes the subscription's new default
// payment method — so future renewals use it automatically.
export async function retryPastDuePaymentAction(): Promise<RetryPaymentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("customer_id", user.id)
    .eq("status", "past_due")
    .maybeSingle();

  if (!subscription || !subscription.stripe_subscription_id) {
    return { error: "You don't have a past-due membership payment." };
  }

  const stripeSub = await stripe.subscriptions.retrieve(
    subscription.stripe_subscription_id,
    { expand: ["latest_invoice.confirmation_secret"] }
  );
  const invoice = stripeSub.latest_invoice as Stripe.Invoice | null;

  if (!invoice || invoice.status !== "open") {
    return { error: "No outstanding payment found. Try refreshing the page." };
  }

  const clientSecret = invoice.confirmation_secret?.client_secret;
  if (!clientSecret) {
    return { error: "Could not start payment. Please try again." };
  }

  return { clientSecret };
}
