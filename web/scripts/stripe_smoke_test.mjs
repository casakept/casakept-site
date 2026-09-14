import { readFileSync } from "node:fs";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const envPath = "/Users/jj/Documents/casakept-site/web/.env.local";
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function poll(fn, { tries = 10, delayMs = 800 } = {}) {
  for (let i = 0; i < tries; i++) {
    const result = await fn();
    if (result) return result;
    await sleep(delayMs);
  }
  return null;
}

const email = `smoketest+${Date.now()}@casakept.test`;
let userId;

try {
  console.log("== creating test user ==");
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email,
      password: "Sm0keTest!23456",
      email_confirm: true,
    });
  if (createErr) throw createErr;
  userId = created.user.id;
  console.log("user:", userId);

  // profiles row is auto-provisioned by the on_auth_user_created trigger
  await sleep(500);

  console.log("\n== MEMBERSHIP FLOW ==");
  const { data: plan } = await supabase
    .from("membership_plans")
    .select("id, stripe_price_id, minimum_term_months, extra_services_discount_pct")
    .eq("slug", "casa-base")
    .single();
  console.log("plan:", plan.id, plan.stripe_price_id);

  const customer = await stripe.customers.create({
    email,
    metadata: { customer_id: userId },
  });
  await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);
  console.log("stripe customer:", customer.id);

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: plan.stripe_price_id }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.confirmation_secret"],
    metadata: {
      customer_id: userId,
      plan_id: plan.id,
      minimum_term_months: String(plan.minimum_term_months),
    },
  });
  const clientSecret = subscription.latest_invoice.confirmation_secret.client_secret;
  const paymentIntentId = clientSecret.split("_secret_")[0];
  console.log("subscription:", subscription.id, "pi:", paymentIntentId);

  const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: "pm_card_visa",
    return_url: "http://localhost:3000/account/membership",
  });
  console.log("payment intent status:", confirmed.status);

  const dbSub = await poll(async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select("id, status, current_period_start, current_period_end")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();
    return data?.status === "active" ? data : null;
  });
  console.log(
    dbSub ? `PASS subscriptions row active: ${JSON.stringify(dbSub)}` : "FAIL subscriptions row never went active"
  );

  const dbSubPayment = await poll(async () => {
    const { data } = await supabase
      .from("payments")
      .select("id, status, amount_cents, stripe_payment_intent_id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();
    return data?.status === "succeeded" ? data : null;
  });
  console.log(
    dbSubPayment
      ? `PASS payments row succeeded: ${JSON.stringify(dbSubPayment)}`
      : "FAIL payments row for subscription invoice never recorded"
  );

  console.log("\n== BOOKING PAYMENT FLOW ==");
  const { data: property } = await supabase
    .from("properties")
    .insert({
      customer_id: userId,
      label: "Smoke test house",
      address_line1: "123 Test St",
      city: "Fort Worth",
      zip: "76109",
    })
    .select("id")
    .single();
  console.log("property:", property.id);

  const { data: entitlements } = await supabase
    .from("plan_entitlements")
    .select("service_type")
    .eq("plan_id", plan.id);
  const coveredTypes = new Set((entitlements ?? []).map((e) => e.service_type));

  const { data: services } = await supabase
    .from("services")
    .select("id, service_type, base_price_cents")
    .eq("active", true);
  const service = services.find((s) => !coveredTypes.has(s.service_type));
  console.log("using uncovered service:", service.service_type, service.base_price_cents);

  const priceCents = Math.round(
    service.base_price_cents * (1 - plan.extra_services_discount_pct / 100)
  );

  const { data: booking } = await supabase
    .from("bookings")
    .insert({
      customer_id: userId,
      property_id: property.id,
      service_type: service.service_type,
      service_id: service.id,
      scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      time_window: "morning",
      price_cents: priceCents,
      covered_by_entitlement: false,
      status: "pending",
    })
    .select("id")
    .single();
  console.log("booking:", booking.id, "price:", priceCents);

  const bookingPI = await stripe.paymentIntents.create({
    amount: priceCents,
    currency: "usd",
    customer: customer.id,
    automatic_payment_methods: { enabled: true },
    metadata: { booking_id: booking.id, customer_id: userId },
  });
  await supabase.from("payments").insert({
    customer_id: userId,
    booking_id: booking.id,
    amount_cents: priceCents,
    status: "pending",
    stripe_payment_intent_id: bookingPI.id,
  });

  const bookingConfirm = await stripe.paymentIntents.confirm(bookingPI.id, {
    payment_method: "pm_card_visa",
    return_url: "http://localhost:3000/account/book",
  });
  console.log("booking payment intent status:", bookingConfirm.status);

  const dbBooking = await poll(async () => {
    const { data } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("id", booking.id)
      .maybeSingle();
    return data?.status === "confirmed" ? data : null;
  });
  console.log(
    dbBooking ? `PASS booking confirmed: ${JSON.stringify(dbBooking)}` : "FAIL booking never confirmed"
  );

  const dbBookingPayment = await poll(async () => {
    const { data } = await supabase
      .from("payments")
      .select("id, status")
      .eq("stripe_payment_intent_id", bookingPI.id)
      .maybeSingle();
    return data?.status === "succeeded" ? data : null;
  });
  console.log(
    dbBookingPayment
      ? `PASS booking payment succeeded: ${JSON.stringify(dbBookingPayment)}`
      : "FAIL booking payment never recorded succeeded"
  );

  console.log("\n== CLEANUP ==");
  await stripe.subscriptions.cancel(subscription.id);
  await stripe.customers.del(customer.id);
  await supabase.from("payments").delete().eq("customer_id", userId);
  await supabase.from("bookings").delete().eq("customer_id", userId);
  await supabase.from("properties").delete().eq("customer_id", userId);
  await supabase.from("subscriptions").delete().eq("customer_id", userId);
  await supabase.auth.admin.deleteUser(userId);
  console.log("cleaned up test user + stripe objects");
} catch (err) {
  console.error("ERROR:", err);
  if (userId) {
    console.log("attempting cleanup of test user after error...");
    await supabase.from("payments").delete().eq("customer_id", userId);
    await supabase.from("bookings").delete().eq("customer_id", userId);
    await supabase.from("properties").delete().eq("customer_id", userId);
    await supabase.from("subscriptions").delete().eq("customer_id", userId);
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
  }
  process.exit(1);
}
