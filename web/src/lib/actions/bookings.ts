"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrCreateStripeCustomerId } from "@/lib/stripe/customer";
import { stripe } from "@/lib/stripe/server";
import { entitlementPeriodFor, widestFrequency } from "@/lib/entitlements";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import { sendNotificationEmail } from "@/lib/email/send";
import { bookingConfirmedEmail, bookingCancelledEmail } from "@/lib/email/templates";
import type { Database } from "@/lib/supabase/database.types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

export type BookingActionState = {
  error?: string;
  success?: boolean;
  clientSecret?: string;
};

const CLEANING_SERVICE_TYPES = new Set(["standard_clean", "deep_clean"]);
const SCHEDULE_WINDOWS = new Set(["morning", "midday", "afternoon"]);

export async function createBookingAction(
  _prevState: BookingActionState,
  formData: FormData
): Promise<BookingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const propertyId = String(formData.get("property_id") ?? "");
  const serviceId = String(formData.get("service_id") ?? "");
  const scheduledDate = String(formData.get("scheduled_date") ?? "");
  const timeWindow = String(formData.get("time_window") ?? "");
  const preferredStaffId = String(formData.get("preferred_staff_id") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!propertyId || !serviceId || !scheduledDate || !timeWindow) {
    return { error: "Please complete every step before confirming." };
  }
  if (!SCHEDULE_WINDOWS.has(timeWindow)) {
    return { error: "Choose a valid time window." };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(scheduledDate) < today) {
    return { error: "Choose a date today or later." };
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id, address_line1, city")
    .eq("id", propertyId)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!property) return { error: "Choose one of your properties." };

  const { data: service } = await supabase
    .from("services")
    .select("id, service_type, base_price_cents, member_discount_pct")
    .eq("id", serviceId)
    .eq("active", true)
    .maybeSingle();
  if (!service) return { error: "That service isn't available right now." };

  if (preferredStaffId && !CLEANING_SERVICE_TYPES.has(service.service_type)) {
    return { error: "A preferred cleaner only applies to cleaning visits." };
  }
  if (preferredStaffId) {
    const { data: staff } = await supabase
      .from("staff")
      .select("id")
      .eq("id", preferredStaffId)
      .eq("active", true)
      .maybeSingle();
    if (!staff) return { error: "That cleaner isn't available right now." };
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      "id, plan_id, created_at, current_period_start, current_period_end, membership_plans(extra_services_discount_pct)"
    )
    .eq("customer_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  let priceCents = service.base_price_cents;
  let coveredByEntitlement = false;
  let claimedUsage:
    | Database["public"]["Tables"]["entitlement_usage"]["Row"]
    | null = null;

  const serviceClient = createServiceClient();

  if (subscription) {
    // Some services (e.g. laundry) carry their own member rate that's more
    // generous than the plan's blanket discount -- take whichever is
    // better for the member rather than always applying the flat rate.
    const planDiscountPct = subscription.membership_plans?.extra_services_discount_pct ?? 0;
    const discountPct = Math.max(planDiscountPct, service.member_discount_pct);
    priceCents = Math.round(priceCents * (1 - discountPct / 100));

    const { data: planEntitlements } = await supabase
      .from("plan_entitlements")
      .select("quantity, frequency")
      .eq("plan_id", subscription.plan_id)
      .eq("service_type", service.service_type);

    const includedCount = (planEntitlements ?? []).reduce(
      (sum, e) => sum + e.quantity,
      0
    );

    if (includedCount > 0) {
      const frequency = widestFrequency(planEntitlements!.map((e) => e.frequency));
      const period = entitlementPeriodFor(
        frequency,
        subscription.created_at,
        subscription.current_period_start,
        subscription.current_period_end
      );

      // Atomic: creates the usage row on first use and claims one unit in a
      // single statement, so two concurrent bookings can't both read
      // "not yet exhausted" and over-claim the entitlement.
      const { data: claimedRows } = await serviceClient.rpc("claim_entitlement_usage", {
        p_subscription_id: subscription.id,
        p_service_type: service.service_type,
        p_period_start: period.start,
        p_period_end: period.end,
        p_included_count: includedCount,
      });

      if (claimedRows && claimedRows.length > 0) {
        claimedUsage = claimedRows[0];
        coveredByEntitlement = true;
        priceCents = 0;
      }
    }
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      customer_id: user.id,
      property_id: propertyId,
      service_type: service.service_type,
      service_id: service.id,
      subscription_id: subscription?.id ?? null,
      scheduled_date: scheduledDate,
      time_window: timeWindow as Database["public"]["Enums"]["schedule_window"],
      preferred_staff_id: preferredStaffId,
      price_cents: priceCents,
      covered_by_entitlement: coveredByEntitlement,
      // Confirmed immediately when nothing needs to be charged; otherwise
      // stays pending until the payment_intent.succeeded webhook flips it.
      status: priceCents > 0 && !coveredByEntitlement ? "pending" : "confirmed",
      notes,
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    // The entitlement was already claimed above -- give it back since no
    // booking actually got created.
    if (claimedUsage) {
      await serviceClient
        .from("entitlement_usage")
        .update({ used_count: claimedUsage.used_count - 1 })
        .eq("id", claimedUsage.id);
    }
    return { error: bookingError?.message ?? "Couldn't create that booking." };
  }

  // "fallback" when a preferred cleaner was requested but assign_booking_staff
  // resolved someone else; "unassigned" when nobody was available at all.
  // Matches the same preferred-vs-actual comparison in the Stripe webhook's
  // handlePaymentIntentSucceeded, since paid bookings are assigned there
  // instead of here.
  function assignmentNoteFor(assignedStaffId: string | null): "fallback" | "unassigned" | null {
    if (!assignedStaffId) return "unassigned";
    if (preferredStaffId && assignedStaffId !== preferredStaffId) return "fallback";
    return null;
  }

  async function sendBookingConfirmedEmail(assignmentNote: "fallback" | "unassigned" | null) {
    const { subject, html } = bookingConfirmedEmail({
      serviceLabel: SERVICE_LABELS[service!.service_type] ?? service!.service_type,
      addressLine: `${property!.address_line1}, ${property!.city}`,
      scheduledDate,
      windowLabel: WINDOW_LABELS[timeWindow as Database["public"]["Enums"]["schedule_window"]] ?? timeWindow,
      priceCents,
      coveredByEntitlement,
      assignmentNote,
    });
    await sendNotificationEmail({
      customerId: user!.id,
      bookingId: booking!.id,
      template: "booking_confirmed",
      subject,
      html,
    });
  }

  if (coveredByEntitlement) {
    const { data: assignedStaffId } = await serviceClient.rpc("assign_booking_staff", { p_booking_id: booking.id });
    await sendBookingConfirmedEmail(assignmentNoteFor(assignedStaffId));
    revalidatePath("/account");
    revalidatePath("/account/book");
    revalidatePath("/account/membership");
    return { success: true };
  }

  if (priceCents > 0) {
    const stripeCustomerId = await getOrCreateStripeCustomerId(
      supabase,
      user.id,
      user.email
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceCents,
      currency: "usd",
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true },
      metadata: { booking_id: booking.id, customer_id: user.id },
    });

    await serviceClient.from("payments").insert({
      customer_id: user.id,
      booking_id: booking.id,
      amount_cents: priceCents,
      status: "pending",
      stripe_payment_intent_id: paymentIntent.id,
    });

    if (!paymentIntent.client_secret) {
      return { error: "Could not start payment. Please try again." };
    }

    return { clientSecret: paymentIntent.client_secret };
  }

  // priceCents === 0 and not entitlement-covered (e.g. a free service) --
  // confirmed immediately, same as the entitlement-covered path above.
  const { data: assignedStaffId } = await serviceClient.rpc("assign_booking_staff", { p_booking_id: booking.id });
  await sendBookingConfirmedEmail(assignmentNoteFor(assignedStaffId));
  revalidatePath("/account");
  revalidatePath("/account/book");
  revalidatePath("/account/membership");
  return { success: true };
}

// A booking already in progress or finished (or already cancelled) can't be
// cancelled from the customer's side -- those are staff/admin-only states.
const CANCELLABLE_STATUSES = new Set<BookingStatus>(["pending", "confirmed", "assigned"]);

export async function cancelBookingAction(
  bookingId: string,
  currentStatus: BookingStatus,
  _prevState: BookingActionState,
  _formData: FormData
): Promise<BookingActionState> {
  if (!CANCELLABLE_STATUSES.has(currentStatus)) {
    return { error: "This visit can no longer be cancelled." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  // bookings_update_own RLS (customer_id = auth.uid()) is the real ownership
  // gate here; .eq("status", currentStatus) guards against a stale client
  // cancelling a booking staff/Stripe already moved on from.
  const { data: booking, error: updateError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("status", currentStatus)
    .select("id, service_type, scheduled_date, subscription_id, covered_by_entitlement, price_cents, customer_id")
    .maybeSingle();

  if (updateError) return { error: updateError.message };
  if (!booking) {
    return { error: "This visit was already updated elsewhere. Refresh and try again." };
  }

  const serviceClient = createServiceClient();
  let refunded = false;

  if (booking.covered_by_entitlement && booking.subscription_id) {
    // Give the claimed unit back. Identify the entitlement_usage row by
    // period rather than by a stored id (none is kept on the booking) --
    // the period that contains the visit's scheduled date is unambiguous.
    const scheduledDateTime = `${booking.scheduled_date}T00:00:00.000Z`;
    const { data: usageRow } = await serviceClient
      .from("entitlement_usage")
      .select("id, used_count")
      .eq("subscription_id", booking.subscription_id)
      .eq("service_type", booking.service_type)
      .lte("billing_period_start", scheduledDateTime)
      .gt("billing_period_end", scheduledDateTime)
      .maybeSingle();

    if (usageRow) {
      await serviceClient
        .from("entitlement_usage")
        .update({ used_count: Math.max(0, usageRow.used_count - 1) })
        .eq("id", usageRow.id);
    }
  } else if (booking.price_cents > 0) {
    const { data: payment } = await serviceClient
      .from("payments")
      .select("id, status, stripe_payment_intent_id")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (payment?.stripe_payment_intent_id) {
      try {
        if (payment.status === "succeeded") {
          await stripe.refunds.create({ payment_intent: payment.stripe_payment_intent_id });
          await serviceClient.from("payments").update({ status: "refunded" }).eq("id", payment.id);
          refunded = true;
        } else if (payment.status === "pending") {
          // Nothing was ever charged -- just release the PaymentIntent.
          await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
        }
      } catch (err) {
        // Don't fail the cancellation over a Stripe hiccup (e.g. the intent
        // was already cancelled/captured) -- the booking is cancelled
        // either way; this just logs for manual follow-up.
        console.error("cancelBookingAction: Stripe cancel/refund failed", { bookingId, err });
      }
    }
  }

  const { subject, html } = bookingCancelledEmail({
    serviceLabel: SERVICE_LABELS[booking.service_type] ?? booking.service_type,
    scheduledDate: booking.scheduled_date,
    refunded,
  });
  await sendNotificationEmail({
    customerId: booking.customer_id,
    bookingId: booking.id,
    template: "booking_cancelled",
    subject,
    html,
  });

  revalidatePath("/account");
  revalidatePath("/account/membership");
  return { success: true };
}
