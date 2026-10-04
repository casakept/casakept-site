import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import { sendNotificationEmail } from "@/lib/email/send";
import {
  bookingConfirmedEmail,
  bookingPaymentFailedEmail,
  membershipActiveEmail,
  membershipPastDueEmail,
  upgradeApprovedEmail,
  upgradeRefundedEmail,
} from "@/lib/email/templates";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/productCategories";
import { addOnCentsFromItems } from "@/lib/membershipAddOn";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

type ServiceClient = ReturnType<typeof createServiceClient>;

// This API version moved subscription billing periods onto subscription
// items (not the subscription itself) — see SubscriptionItem.current_period_*.
const SUBSCRIPTION_STATUS_MAP: Record<
  Stripe.Subscription.Status,
  Database["public"]["Enums"]["subscription_status"] | null
> = {
  active: "active",
  trialing: "active",
  past_due: "past_due",
  paused: "paused",
  canceled: "cancelled",
  unpaid: "past_due",
  incomplete: null,
  incomplete_expired: null,
};

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await syncSubscription(supabase, event.data.object);
      break;

    case "customer.subscription.deleted": {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", event.data.object.id);
      if (error) console.error("subscription.deleted update failed:", error);
      break;
    }

    case "invoice.paid":
      await recordInvoicePayment(supabase, event.data.object);
      break;

    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(supabase, event.data.object);
      break;

    case "payment_intent.payment_failed": {
      const { data: payment, error } = await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("stripe_payment_intent_id", event.data.object.id)
        .select("customer_id, booking_id")
        .maybeSingle();
      if (error) console.error("payment_intent.payment_failed update failed:", error);

      if (payment?.booking_id) {
        const { data: booking } = await supabase
          .from("bookings")
          .select("service_type, scheduled_date")
          .eq("id", payment.booking_id)
          .maybeSingle();
        if (booking) {
          const { subject, html } = bookingPaymentFailedEmail({
            serviceLabel: SERVICE_LABELS[booking.service_type] ?? booking.service_type,
            scheduledDate: booking.scheduled_date,
          });
          await sendNotificationEmail({
            customerId: payment.customer_id,
            bookingId: payment.booking_id,
            template: "booking_payment_failed",
            subject,
            html,
          });
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

async function syncSubscription(supabase: ServiceClient, sub: Stripe.Subscription) {
  const mappedStatus = SUBSCRIPTION_STATUS_MAP[sub.status];
  // incomplete / incomplete_expired — payment never went through, nothing
  // to reflect locally yet.
  if (!mappedStatus) return;

  const item = sub.items.data[0];
  if (!item) return;
  const periodStart = new Date(item.current_period_start * 1000);
  const periodEnd = new Date(item.current_period_end * 1000);

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, status, customer_id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: mappedStatus,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        // Was never actually synced here before -- cancel_at_period_end
        // stayed at its insert-time default forever, so the "your
        // membership is set to end on..." UI could never have reflected
        // a real cancellation. cancel_at is the new minimum-term-aware
        // mechanism (see cancelSubscriptionAction); both get synced from
        // whatever Stripe reports as the source of truth.
        cancel_at_period_end: sub.cancel_at_period_end,
        cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
        // Stripe is the source of truth for what's billed, so this follows
        // the add-on line however it got there (signup or a re-price).
        home_size_addon_cents: addOnCentsFromItems(sub),
      })
      .eq("id", existing.id);
    if (error) console.error("syncSubscription update failed:", error);

    // Only alert on the transition into past_due, not on every webhook
    // delivery while it stays past_due.
    if (mappedStatus === "past_due" && existing.status !== "past_due") {
      const { subject, html } = membershipPastDueEmail();
      await sendNotificationEmail({
        customerId: existing.customer_id,
        template: "membership_past_due",
        subject,
        html,
      });
    }
    return;
  }

  const customerId = sub.metadata.customer_id;
  const planId = sub.metadata.plan_id;
  if (!customerId || !planId) {
    console.error("syncSubscription: missing customer_id/plan_id metadata", {
      subId: sub.id,
      metadata: sub.metadata,
    });
    return;
  }

  const minimumTermMonths = Number(sub.metadata.minimum_term_months ?? "3");
  const minimumTermEnd = new Date(periodStart);
  minimumTermEnd.setMonth(minimumTermEnd.getMonth() + minimumTermMonths);
  const billingCadence = sub.metadata.billing_cadence === "annual" ? "annual" : "monthly";

  const { error } = await supabase.from("subscriptions").insert({
    customer_id: customerId,
    plan_id: planId,
    status: mappedStatus,
    stripe_customer_id:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    current_period_start: periodStart.toISOString(),
    current_period_end: periodEnd.toISOString(),
    minimum_term_end: minimumTermEnd.toISOString(),
    billing_cadence: billingCadence,
    property_id: sub.metadata.property_id || null,
    home_size_addon_cents: addOnCentsFromItems(sub),
  });
  if (error) {
    // 23505 = the unique stripe_subscription_id rule: another webhook
    // delivery for this same subscription (e.g. invoice.paid racing
    // customer.subscription.updated) created the row first. That one owns
    // the first-signup side effects below, so this one just steps aside.
    if (error.code !== "23505") console.error("syncSubscription insert failed:", error);
    return;
  }

  // This insert only runs the very first time a customer's subscription
  // goes active (see the `existing` guard above) -- the one trustworthy
  // "initial signup payment succeeded" signal, so it's the correct place
  // to attempt a founding-member grant. See grant_founding_member for the
  // 100-slot cap, address dedup, and why it's safe to call unconditionally
  // on every new subscription (idempotent for a returning member).
  const { error: foundingErr } = await supabase.rpc("grant_founding_member", {
    p_customer_id: customerId,
  });
  if (foundingErr) console.error("grant_founding_member failed:", foundingErr);

  const { data: plan } = await supabase
    .from("membership_plans")
    .select("name, monthly_price_cents, annual_price_cents")
    .eq("id", planId)
    .maybeSingle();
  if (plan) {
    const isAnnual = billingCadence === "annual";
    const { subject, html } = membershipActiveEmail({
      planName: plan.name,
      priceCents: isAnnual ? (plan.annual_price_cents ?? plan.monthly_price_cents) : plan.monthly_price_cents,
      period: isAnnual ? "yr" : "mo",
      homeSizeAddOnCents: addOnCentsFromItems(sub),
    });
    await sendNotificationEmail({
      customerId,
      template: "membership_active",
      subject,
      html,
    });
  }
}

async function recordInvoicePayment(supabase: ServiceClient, invoiceStub: Stripe.Invoice) {
  const subscriptionRef = invoiceStub.parent?.subscription_details?.subscription;
  const stripeSubscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
  if (!stripeSubscriptionId) return;

  let { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, customer_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (!subscription) {
    // Webhook delivery order isn't guaranteed — invoice.paid can arrive
    // before customer.subscription.updated has synced the local row. Sync
    // it directly here rather than silently dropping this payment.
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    await syncSubscription(supabase, stripeSub);
    ({ data: subscription } = await supabase
      .from("subscriptions")
      .select("id, customer_id")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle());
  }
  if (!subscription) return;

  // confirmation_secret isn't included in the default webhook payload —
  // refetch the invoice with it explicitly expanded.
  const invoice = await stripe.invoices.retrieve(invoiceStub.id!, {
    expand: ["confirmation_secret"],
  });
  const paymentIntentId = invoice.confirmation_secret?.client_secret
    ? invoice.confirmation_secret.client_secret.split("_secret_")[0]
    : null;

  if (paymentIntentId) {
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();
    if (existingPayment) return;
  }

  const { error } = await supabase.from("payments").insert({
    customer_id: subscription.customer_id,
    subscription_id: subscription.id,
    amount_cents: invoice.amount_paid,
    status: "succeeded",
    stripe_payment_intent_id: paymentIntentId,
  });
  if (error) console.error("recordInvoicePayment insert failed:", error);
}

// A customer paid to upgrade a standard clean to a deep clean (see
// upgrade_requests). The payment only counts if the offer is still open
// inside its response window -- by then the crew may already have carried
// on with the standard scope -- so a late payment, or one for an offer that
// was declined or withdrawn, is refunded in full instead.
async function handleUpgradePayment(supabase: ServiceClient, paymentIntent: Stripe.PaymentIntent) {
  const requestId = paymentIntent.metadata.upgrade_request_id;
  const now = new Date().toISOString();

  await supabase.from("payments").update({ status: "succeeded" }).eq("stripe_payment_intent_id", paymentIntent.id);

  const { data: approved } = await supabase
    .from("upgrade_requests")
    .update({ status: "approved", responded_at: now })
    .eq("id", requestId)
    .eq("status", "link_sent")
    .gt("expires_at", now)
    .select("booking_id, amount_cents")
    .maybeSingle();

  if (approved) {
    const [{ data: booking }, { data: deepService }] = await Promise.all([
      supabase.from("bookings").select("customer_id, price_cents").eq("id", approved.booking_id).single(),
      supabase.from("services").select("id").eq("service_type", "deep_clean").eq("active", true).limit(1).maybeSingle(),
    ]);
    if (booking) {
      // The visit becomes a deep clean: the crew's checklist switches to the
      // deep-clean items and the price reflects what was charged.
      const { error } = await supabase
        .from("bookings")
        .update({
          service_type: "deep_clean",
          service_id: deepService?.id ?? null,
          price_cents: booking.price_cents + approved.amount_cents,
        })
        .eq("id", approved.booking_id);
      if (error) console.error("handleUpgradePayment: booking update failed", error);

      const { subject, html } = upgradeApprovedEmail({ amountCents: approved.amount_cents });
      await sendNotificationEmail({
        customerId: booking.customer_id,
        bookingId: approved.booking_id,
        template: "upgrade_approved",
        subject,
        html,
      });
    }
    return;
  }

  // Not approved just now. If a redelivery of this same event already
  // approved it, there's nothing to do.
  const { data: request } = await supabase
    .from("upgrade_requests")
    .select("status, stripe_payment_intent_id, booking_id, amount_cents")
    .eq("id", requestId)
    .maybeSingle();
  if (request?.status === "approved" && request.stripe_payment_intent_id === paymentIntent.id) return;

  try {
    await stripe.refunds.create(
      { payment_intent: paymentIntent.id },
      { idempotencyKey: `upgrade-refund-${paymentIntent.id}` }
    );
  } catch (err) {
    console.error("handleUpgradePayment: refund failed", { paymentIntentId: paymentIntent.id, err });
    return;
  }
  await supabase.from("payments").update({ status: "refunded" }).eq("stripe_payment_intent_id", paymentIntent.id);

  if (request) {
    const { data: booking } = await supabase.from("bookings").select("customer_id").eq("id", request.booking_id).single();
    if (booking) {
      const { subject, html } = upgradeRefundedEmail({ amountCents: request.amount_cents });
      await sendNotificationEmail({
        customerId: booking.customer_id,
        bookingId: request.booking_id,
        template: "upgrade_refunded",
        subject,
        html,
      });
    }
  }
}

async function handlePaymentIntentSucceeded(
  supabase: ServiceClient,
  paymentIntent: Stripe.PaymentIntent
) {
  if (paymentIntent.metadata?.upgrade_request_id) {
    await handleUpgradePayment(supabase, paymentIntent);
    return;
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("id, booking_id")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle();
  if (!payment) return;

  const { error: paymentError } = await supabase
    .from("payments")
    .update({ status: "succeeded" })
    .eq("id", payment.id);
  if (paymentError) console.error("handlePaymentIntentSucceeded payment update failed:", paymentError);

  if (!payment.booking_id) return;

  // .eq("status", "pending") also acts as the "did this webhook actually
  // cause the transition" guard -- .select() comes back empty on retries
  // where the booking was already confirmed, so we don't double-send.
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", payment.booking_id)
    .eq("status", "pending")
    .select("service_type, scheduled_date, time_window, price_cents, customer_id, property_id, preferred_staff_id, upgrade_consent_at, upgrade_max_cents")
    .maybeSingle();
  if (bookingError) console.error("handlePaymentIntentSucceeded booking update failed:", bookingError);
  if (!booking) return;

  const { data: assignedStaffId, error: assignErr } = await supabase.rpc("assign_booking_staff", {
    p_booking_id: payment.booking_id,
  });
  if (assignErr) console.error("assign_booking_staff failed:", assignErr);

  // "fallback" when a preferred cleaner was requested but someone else got
  // assigned; "unassigned" when nobody was available at all. Same
  // comparison as createBookingAction's assignmentNoteFor, duplicated here
  // since this runs from the Stripe webhook, not the booking action.
  const assignmentNote: "fallback" | "unassigned" | null = !assignedStaffId
    ? "unassigned"
    : booking.preferred_staff_id && assignedStaffId !== booking.preferred_staff_id
      ? "fallback"
      : null;

  const { data: property } = await supabase
    .from("properties")
    .select("address_line1, city")
    .eq("id", booking.property_id)
    .maybeSingle();
  if (!property) return;

  // Product selections were already stored by createBookingAction at
  // booking-creation time (before this payment even ran) -- just read them
  // back for the email, no re-validation needed here.
  const { data: productSelections } = await supabase
    .from("booking_product_selections")
    .select("category, product:cleaning_products(name)")
    .eq("booking_id", payment.booking_id);
  const products = (productSelections ?? [])
    .filter((s) => s.product)
    .map((s) => ({
      categoryLabel: PRODUCT_CATEGORY_LABELS[s.category] ?? s.category,
      productName: s.product!.name,
    }));

  const { subject, html } = bookingConfirmedEmail({
    serviceLabel: SERVICE_LABELS[booking.service_type] ?? booking.service_type,
    addressLine: `${property.address_line1}, ${property.city}`,
    scheduledDate: booking.scheduled_date,
    windowLabel: WINDOW_LABELS[booking.time_window] ?? booking.time_window,
    priceCents: booking.price_cents,
    coveredByEntitlement: false,
    assignmentNote,
    products,
    upgradeNote: booking.upgrade_consent_at ? { maxCents: booking.upgrade_max_cents } : null,
  });
  await sendNotificationEmail({
    customerId: booking.customer_id,
    bookingId: payment.booking_id,
    template: "booking_confirmed",
    subject,
    html,
  });
}
