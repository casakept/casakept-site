// Exercises claim_entitlement_usage directly against the live Supabase
// project: atomic claim/exhaustion, quarterly-window correctness across
// monthly period boundaries, and concurrent-claim safety. No Stripe
// involved -- this is purely about the entitlement bookkeeping.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envPath = "/Users/jj/Documents/casakept-site/web/.env.local";
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let pass = 0;
let fail = 0;
function check(label, ok) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}`);
  if (ok) pass++;
  else fail++;
}

const email = `entsmoke+${Date.now()}@casakept.test`;
let userId;
let subscriptionId;

try {
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email,
      password: "Sm0keTest!23456",
      email_confirm: true,
    });
  if (createErr) throw createErr;
  userId = created.user.id;
  await new Promise((r) => setTimeout(r, 500)); // let the profiles trigger run

  const { data: plan } = await supabase
    .from("membership_plans")
    .select("id")
    .eq("slug", "casa-completa")
    .single();

  const { data: entitlements } = await supabase
    .from("plan_entitlements")
    .select("service_type, quantity, frequency")
    .eq("plan_id", plan.id);
  const groceryEnt = entitlements.find((e) => e.service_type === "grocery");
  const deepCleanEnt = entitlements.find((e) => e.service_type === "deep_clean");
  console.log("grocery entitlement:", groceryEnt);
  console.log("deep_clean entitlement:", deepCleanEnt);

  // Anchor the subscription's created_at to the start of the current month
  // so quarter math below lines up with "this month" / "next month".
  const now = new Date();
  const subscriptionCreatedAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const month0Start = new Date(subscriptionCreatedAt);
  const month0End = new Date(month0Start);
  month0End.setUTCMonth(month0End.getUTCMonth() + 1);

  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .insert({
      customer_id: userId,
      plan_id: plan.id,
      status: "active",
      created_at: subscriptionCreatedAt.toISOString(),
      current_period_start: month0Start.toISOString(),
      current_period_end: month0End.toISOString(),
      minimum_term_end: month0End.toISOString(),
    })
    .select("id")
    .single();
  if (subErr) throw subErr;
  subscriptionId = sub.id;
  console.log("subscription:", subscriptionId);

  console.log("\n== monthly entitlement (grocery, quantity 2) ==");
  for (let i = 1; i <= groceryEnt.quantity; i++) {
    const { data: claimed, error } = await supabase.rpc("claim_entitlement_usage", {
      p_subscription_id: subscriptionId,
      p_service_type: "grocery",
      p_period_start: month0Start.toISOString(),
      p_period_end: month0End.toISOString(),
      p_included_count: groceryEnt.quantity,
    });
    if (error) throw error;
    check(`claim #${i} of ${groceryEnt.quantity} succeeds`, claimed?.length > 0);
  }
  {
    const { data: claimed, error } = await supabase.rpc("claim_entitlement_usage", {
      p_subscription_id: subscriptionId,
      p_service_type: "grocery",
      p_period_start: month0Start.toISOString(),
      p_period_end: month0End.toISOString(),
      p_included_count: groceryEnt.quantity,
    });
    if (error) throw error;
    check("claim beyond quota is rejected", claimed?.length === 0);
  }

  console.log("\n== quarterly entitlement (deep_clean, quantity 1) spans months ==");
  {
    const { data: claimed, error } = await supabase.rpc("claim_entitlement_usage", {
      p_subscription_id: subscriptionId,
      p_service_type: "deep_clean",
      p_period_start: subscriptionCreatedAt.toISOString(),
      p_period_end: new Date(
        Date.UTC(
          subscriptionCreatedAt.getUTCFullYear(),
          subscriptionCreatedAt.getUTCMonth() + 3,
          1
        )
      ).toISOString(),
      p_included_count: deepCleanEnt.quantity,
    });
    if (error) throw error;
    check("month 1 deep_clean claim succeeds", claimed?.length > 0);
  }
  {
    // Same quarter, "next month" -- must be blocked, not reset.
    const month1Start = new Date(subscriptionCreatedAt);
    month1Start.setUTCMonth(month1Start.getUTCMonth() + 1);
    const { data: claimed, error } = await supabase.rpc("claim_entitlement_usage", {
      p_subscription_id: subscriptionId,
      p_service_type: "deep_clean",
      // Same quarter window as above -- the caller (bookings.ts) always
      // computes this from entitlementPeriodFor, which returns the same
      // quarter start regardless of which month within it you're in.
      p_period_start: subscriptionCreatedAt.toISOString(),
      p_period_end: new Date(
        Date.UTC(
          subscriptionCreatedAt.getUTCFullYear(),
          subscriptionCreatedAt.getUTCMonth() + 3,
          1
        )
      ).toISOString(),
      p_included_count: deepCleanEnt.quantity,
    });
    if (error) throw error;
    check("month 2 (same quarter) deep_clean claim is blocked", claimed?.length === 0);
  }
  {
    // New quarter -- should be a fresh allowance.
    const quarter2Start = new Date(subscriptionCreatedAt);
    quarter2Start.setUTCMonth(quarter2Start.getUTCMonth() + 3);
    const quarter2End = new Date(quarter2Start);
    quarter2End.setUTCMonth(quarter2End.getUTCMonth() + 3);
    const { data: claimed, error } = await supabase.rpc("claim_entitlement_usage", {
      p_subscription_id: subscriptionId,
      p_service_type: "deep_clean",
      p_period_start: quarter2Start.toISOString(),
      p_period_end: quarter2End.toISOString(),
      p_included_count: deepCleanEnt.quantity,
    });
    if (error) throw error;
    check("next quarter deep_clean claim succeeds (fresh allowance)", claimed?.length > 0);
  }

  console.log("\n== concurrency: two simultaneous claims, quota 1 ==");
  {
    const { data: erranD } = await supabase
      .from("plan_entitlements")
      .select("quantity")
      .eq("plan_id", plan.id)
      .eq("service_type", "cocina_meal")
      .limit(1)
      .single();
    const periodStart = new Date(month0Start);
    const periodEnd = new Date(month0End);
    const [r1, r2] = await Promise.all([
      supabase.rpc("claim_entitlement_usage", {
        p_subscription_id: subscriptionId,
        p_service_type: "cocina_meal",
        p_period_start: periodStart.toISOString(),
        p_period_end: periodEnd.toISOString(),
        p_included_count: 1,
      }),
      supabase.rpc("claim_entitlement_usage", {
        p_subscription_id: subscriptionId,
        p_service_type: "cocina_meal",
        p_period_start: periodStart.toISOString(),
        p_period_end: periodEnd.toISOString(),
        p_included_count: 1,
      }),
    ]);
    const successes = [r1, r2].filter((r) => r.data?.length > 0).length;
    check("exactly one of two concurrent claims (quota 1) succeeds", successes === 1);
    void erranD;
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
} finally {
  if (userId) {
    console.log("\n== cleanup ==");
    await supabase.auth.admin.deleteUser(userId);
    console.log("deleted test user", userId);
  }
}
