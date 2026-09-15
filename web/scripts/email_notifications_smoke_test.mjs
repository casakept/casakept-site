// Exercises the email-notifications feature end-to-end against live Stripe
// (test mode) and Supabase. Requires a dev server running locally with
// `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (same
// precondition as stripe_smoke_test.mjs) so the webhook handlers that
// trigger sendNotificationEmail actually run.
//
// Doesn't require RESEND_API_KEY to be configured -- sendNotificationEmail
// never throws, so with no key configured every send should still produce a
// notifications_log row with status "failed" (and a console error), which
// this test treats as a pass. Once RESEND_API_KEY is set, the same rows
// should flip to status "sent".
//
// Not covered: membership_past_due. Triggering it for real requires a
// subscription to actually renew and fail (Stripe test clocks can simulate
// this but add a lot of script complexity for one template) -- verify that
// path manually via the Stripe dashboard once real renewals are happening.
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

const hasResendKey = Boolean(process.env.RESEND_API_KEY);
const expectedStatus = hasResendKey ? "sent" : "failed";
console.log(
  `RESEND_API_KEY ${hasResendKey ? "is" : "is not"} configured -- expecting notifications_log rows with status "${expectedStatus}"\n`
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

let pass = 0;
let fail = 0;
function check(label, ok) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}`);
  if (ok) pass++;
  else fail++;
}

async function expectLog(label, matchFn) {
  const row = await poll(async () => {
    const { data } = await supabase
      .from("notifications_log")
      .select("id, template, status, booking_id, customer_id")
      .match(matchFn)
      .maybeSingle();
    return data ?? null;
  });
  check(`${label} logged`, Boolean(row));
  if (row) check(`${label} status is "${expectedStatus}"`, row.status === expectedStatus);
}

const email = `emailsmoke+${Date.now()}@casakept.test`;
let userId;
let customerId;
let subscriptionId;

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
  await sleep(500); // let the profiles trigger run

  console.log("\n== MEMBERSHIP ACTIVE EMAIL (new subscription, successful payment) ==");
  const { data: plan } = await supabase
    .from("membership_plans")
    .select("id, stripe_price_id, minimum_term_months, extra_services_discount_pct")
    .eq("slug", "casa-base")
    .single();

  const customer = await stripe.customers.create({
    email,
    metadata: { customer_id: userId },
  });
  customerId = customer.id;
  await supabase.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);

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
  subscriptionId = subscription.id;
  const clientSecret = subscription.latest_invoice.confirmation_secret.client_secret;
  const paymentIntentId = clientSecret.split("_secret_")[0];

  await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: "pm_card_visa",
    return_url: "http://localhost:3000/account/membership",
  });

  const dbSub = await poll(async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();
    return data?.status === "active" ? data : null;
  });
  check("subscription synced active", Boolean(dbSub));

  await expectLog("membership_active email", { template: "membership_active", customer_id: userId });

  console.log("\n== BOOKING CONFIRMED EMAIL (Stripe payment succeeds) ==");
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

  await stripe.paymentIntents.confirm(bookingPI.id, {
    payment_method: "pm_card_visa",
    return_url: "http://localhost:3000/account/book",
  });

  const dbBooking = await poll(async () => {
    const { data } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("id", booking.id)
      .maybeSingle();
    return data?.status === "confirmed" ? data : null;
  });
  check("booking confirmed", Boolean(dbBooking));

  await expectLog("booking_confirmed email", { template: "booking_confirmed", booking_id: booking.id });

  console.log("\n== BOOKING PAYMENT FAILED EMAIL (card declined) ==");
  const { data: failBooking } = await supabase
    .from("bookings")
    .insert({
      customer_id: userId,
      property_id: property.id,
      service_type: service.service_type,
      service_id: service.id,
      scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      time_window: "afternoon",
      price_cents: priceCents,
      covered_by_entitlement: false,
      status: "pending",
    })
    .select("id")
    .single();

  const failPI = await stripe.paymentIntents.create({
    amount: priceCents,
    currency: "usd",
    customer: customer.id,
    automatic_payment_methods: { enabled: true },
    metadata: { booking_id: failBooking.id, customer_id: userId },
  });
  await supabase.from("payments").insert({
    customer_id: userId,
    booking_id: failBooking.id,
    amount_cents: priceCents,
    status: "pending",
    stripe_payment_intent_id: failPI.id,
  });

  try {
    // Stripe's dedicated "always declines" test payment method -- the
    // confirm call itself rejects, but Stripe still fires
    // payment_intent.payment_failed to our webhook.
    await stripe.paymentIntents.confirm(failPI.id, {
      payment_method: "pm_card_visa_chargeDeclined",
      return_url: "http://localhost:3000/account/book",
    });
  } catch {
    // expected -- the decline is the point
  }

  const dbFailedPayment = await poll(async () => {
    const { data } = await supabase
      .from("payments")
      .select("id, status")
      .eq("stripe_payment_intent_id", failPI.id)
      .maybeSingle();
    return data?.status === "failed" ? data : null;
  });
  check("payment marked failed", Boolean(dbFailedPayment));

  await expectLog("booking_payment_failed email", {
    template: "booking_payment_failed",
    booking_id: failBooking.id,
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
} catch (err) {
  console.error("ERROR:", err);
  process.exitCode = 1;
} finally {
  console.log("\n== cleanup ==");
  if (subscriptionId) await stripe.subscriptions.cancel(subscriptionId).catch(() => {});
  if (customerId) await stripe.customers.del(customerId).catch(() => {});
  if (userId) {
    await supabase.from("notifications_log").delete().eq("customer_id", userId);
    await supabase.from("payments").delete().eq("customer_id", userId);
    await supabase.from("bookings").delete().eq("customer_id", userId);
    await supabase.from("properties").delete().eq("customer_id", userId);
    await supabase.from("subscriptions").delete().eq("customer_id", userId);
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    console.log("deleted test user", userId);
  }
}
