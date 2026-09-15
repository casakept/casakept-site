"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrCreateStripeCustomerId } from "@/lib/stripe/customer";
import { stripe } from "@/lib/stripe/server";
import { entitlementPeriodFor, widestFrequency } from "@/lib/entitlements";
import type { Database } from "@/lib/supabase/database.types";

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
    .select("id")
    .eq("id", propertyId)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!property) return { error: "Choose one of your properties." };

  const { data: service } = await supabase
    .from("services")
    .select("id, service_type, base_price_cents")
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
    const discountPct = subscription.membership_plans?.extra_services_discount_pct ?? 0;
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

  if (coveredByEntitlement) {
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

  revalidatePath("/account");
  revalidatePath("/account/book");
  revalidatePath("/account/membership");
  return { success: true };
}
