// Exercises the real bonus computation logic (src/lib/computeBonuses.ts),
// not a re-implementation of it: this script imports computeAllBonuses
// directly (via tsx, so it can resolve the @/ path alias and run the
// actual TypeScript module) and calls it against real seeded data with a
// fixed, far-future synthetic "today" so the test is deterministic
// regardless of when it's actually run and never collides with real
// production data (all seeded rows use fresh disposable staff/customer
// ids anyway). It also checks the staff_bonuses RLS boundary the same way
// the other smoke tests check theirs -- run with real user sessions
// against the exact queries the admin/staff portal would use.
//
// See admin_dashboard_smoke_test.mjs for the profiles.role bootstrapping
// note (DELETE + INSERT instead of UPDATE, due to prevent_role_self_escalation).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { computeAllBonuses } from "../src/lib/computeBonuses.ts";

const envPath = "/Users/jj/Documents/casakept-site/web/.env.local";
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceClient = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

let pass = 0;
let fail = 0;
function check(label, ok) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}`);
  if (ok) pass++;
  else fail++;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const stamp = Date.now();
const password = "Sm0keTest!23456";

// Far-future synthetic date so this run never collides with real data and
// is deterministic no matter when the test executes.
const TODAY = new Date(Date.UTC(2099, 0, 1)); // Jan 1, 2099 (a "1st of the month")
const LAST_MONTH_DATE = "2098-12-15";
const PERIOD_LABEL = "2098-12";
function daysAgo(n) {
  return new Date(TODAY.getTime() - n * 86400000).toISOString().slice(0, 10);
}

async function createAuthUser(label, role, fullName) {
  const email = `bonussmoke+${label}+${stamp}@casakept.test`;
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  const userId = data.user.id;
  await sleep(300);
  await serviceClient.from("profiles").delete().eq("id", userId);
  const { error: insertErr } = await serviceClient.from("profiles").insert({ id: userId, role, full_name: fullName });
  if (insertErr) throw insertErr;
  const scoped = createClient(url, anonKey);
  const { error: signInErr } = await scoped.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;
  return { userId, email, client: scoped };
}

async function createStaff(userId, hireDate, opts = {}) {
  const { error } = await serviceClient
    .from("staff")
    .insert({ id: userId, hire_date: hireDate, active: opts.active ?? true, referred_by_staff_id: opts.referredBy ?? null })
    .throwOnError();
  if (error) throw error;
}

async function createMemberHousehold(subscriptionStatus) {
  const customer = await createAuthUser(`cust-${Math.random().toString(36).slice(2, 8)}`, "customer", "Household Smoke");
  const { data: property } = await serviceClient
    .from("properties")
    .insert({ customer_id: customer.userId, label: "Bonus smoke house", address_line1: "1 Bonus Way", city: "Fort Worth", zip: "76109" })
    .select("id")
    .single()
    .throwOnError();
  const { data: plan } = await serviceClient.from("membership_plans").select("id").limit(1).single();
  await serviceClient
    .from("subscriptions")
    .insert({
      customer_id: customer.userId,
      plan_id: plan.id,
      status: subscriptionStatus,
      current_period_end: "2099-06-01T00:00:00Z",
      minimum_term_end: "2099-06-01T00:00:00Z",
    })
    .throwOnError();
  return { customerId: customer.userId, propertyId: property.id };
}

async function createCompletedBooking(customerId, propertyId, staffId, scheduledDate) {
  const { data: booking } = await serviceClient
    .from("bookings")
    .insert({
      customer_id: customerId,
      property_id: propertyId,
      assigned_staff_id: staffId,
      service_type: "standard_clean",
      scheduled_date: scheduledDate,
      time_window: "morning",
      price_cents: 12000,
      status: "completed",
    })
    .select("id")
    .single()
    .throwOnError();
  return booking.id;
}

async function createVisitScore(bookingId, staffId, scoredBy, scores) {
  await serviceClient
    .from("visit_scores")
    .insert({
      booking_id: bookingId,
      staff_id: staffId,
      scored_by: scoredBy,
      quality_score: scores.quality,
      customer_score: scores.customer,
      timeliness_score: scores.timeliness,
      professionalism_score: scores.professionalism,
    })
    .throwOnError();
}

const userIds = [];
const staffIds = [];
const propertyIds = [];
const bookingIds = [];

try {
  console.log("== provisioning staff for tenure bonuses ==");
  const staffA = await createAuthUser("staffA", "staff", "Staff A (90-day)");
  const staffB = await createAuthUser("staffB", "staff", "Staff B (referred, 90-day)");
  const staffC = await createAuthUser("staffC", "staff", "Staff C (anniversary)");
  for (const s of [staffA, staffB, staffC]) userIds.push(s.userId);

  await createStaff(staffA.userId, daysAgo(91));
  await createStaff(staffB.userId, daysAgo(91), { referredBy: staffA.userId });
  await createStaff(staffC.userId, daysAgo(400));
  staffIds.push(staffA.userId, staffB.userId, staffC.userId);

  const admin = await createAuthUser("admin", "admin", "Admin Smoke");
  userIds.push(admin.userId);

  console.log("== provisioning staff + households for household retention ==");
  const staffD = await createAuthUser("staffD", "staff", "Staff D (retention win)");
  const staffE = await createAuthUser("staffE", "staff", "Staff E (retention loss)");
  userIds.push(staffD.userId, staffE.userId);
  await createStaff(staffD.userId, daysAgo(500));
  await createStaff(staffE.userId, daysAgo(500));
  staffIds.push(staffD.userId, staffE.userId);

  const renewedHousehold = await createMemberHousehold("active");
  const churnedHousehold = await createMemberHousehold("cancelled");
  propertyIds.push(renewedHousehold.propertyId, churnedHousehold.propertyId);
  userIds.push(renewedHousehold.customerId, churnedHousehold.customerId);

  bookingIds.push(await createCompletedBooking(renewedHousehold.customerId, renewedHousehold.propertyId, staffD.userId, LAST_MONTH_DATE));
  bookingIds.push(await createCompletedBooking(churnedHousehold.customerId, churnedHousehold.propertyId, staffE.userId, LAST_MONTH_DATE));

  console.log("== provisioning staff + scores for crew of the month ==");
  const staffF = await createAuthUser("staffF", "staff", "Staff F (top scorer, wins)");
  const staffG = await createAuthUser("staffG", "staff", "Staff G (lower scorer)");
  const staffH = await createAuthUser("staffH", "staff", "Staff H (too few visits)");
  userIds.push(staffF.userId, staffG.userId, staffH.userId);
  await createStaff(staffF.userId, daysAgo(500));
  await createStaff(staffG.userId, daysAgo(500));
  await createStaff(staffH.userId, daysAgo(500));
  staffIds.push(staffF.userId, staffG.userId, staffH.userId);

  const scoringHousehold = await createMemberHousehold("active");
  propertyIds.push(scoringHousehold.propertyId);
  userIds.push(scoringHousehold.customerId);

  for (let i = 0; i < 5; i++) {
    const bId = await createCompletedBooking(scoringHousehold.customerId, scoringHousehold.propertyId, staffF.userId, LAST_MONTH_DATE);
    bookingIds.push(bId);
    await createVisitScore(bId, staffF.userId, admin.userId, { quality: 40, customer: 25, timeliness: 20, professionalism: 15 }); // 100
  }
  for (let i = 0; i < 5; i++) {
    const bId = await createCompletedBooking(scoringHousehold.customerId, scoringHousehold.propertyId, staffG.userId, LAST_MONTH_DATE);
    bookingIds.push(bId);
    await createVisitScore(bId, staffG.userId, admin.userId, { quality: 28, customer: 15, timeliness: 15, professionalism: 12 }); // 70
  }
  for (let i = 0; i < 3; i++) {
    const bId = await createCompletedBooking(scoringHousehold.customerId, scoringHousehold.propertyId, staffH.userId, LAST_MONTH_DATE);
    bookingIds.push(bId);
    await createVisitScore(bId, staffH.userId, admin.userId, { quality: 40, customer: 25, timeliness: 20, professionalism: 15 }); // 100, but only 3 visits
  }

  console.log("\n== running computeAllBonuses (1st pass) ==");
  const firstRun = await computeAllBonuses(serviceClient, TODAY);
  console.log("first run results:", firstRun);
  check("first run computed at least one of each bonus type", Object.values(firstRun).every((n) => n >= 1));

  console.log("\n== verifying computed rows ==");
  async function getBonus(staffId, bonusType, periodLabel, relatedStaffId) {
    let q = serviceClient.from("staff_bonuses").select("*").eq("staff_id", staffId).eq("bonus_type", bonusType);
    if (periodLabel !== undefined) q = q.eq("period_label", periodLabel);
    if (relatedStaffId !== undefined) q = q.eq("related_staff_id", relatedStaffId);
    const { data } = await q.maybeSingle();
    return data;
  }

  const bonusA = await getBonus(staffA.userId, "90_day");
  check("Staff A got a $150 90-day bonus", bonusA?.amount_cents === 15000);

  const bonusB90 = await getBonus(staffB.userId, "90_day");
  check("Staff B (the referred hire) also got a $150 90-day bonus", bonusB90?.amount_cents === 15000);

  const bonusReferral = await getBonus(staffA.userId, "referral", undefined, staffB.userId);
  check("Staff A (referrer) got a $200 referral bonus for Staff B passing 90 days", bonusReferral?.amount_cents === 20000);

  const bonusC = await getBonus(staffC.userId, "anniversary", "1");
  check("Staff C got a $500 year-1 anniversary bonus", bonusC?.amount_cents === 50000);

  const bonusD = await getBonus(staffD.userId, "household_retention", PERIOD_LABEL);
  check("Staff D got a $25 household retention bonus (household renewed)", bonusD?.amount_cents === 2500);

  const bonusE = await getBonus(staffE.userId, "household_retention", PERIOD_LABEL);
  check("Staff E got NO household retention bonus (household churned)", !bonusE);

  const bonusF = await getBonus(staffF.userId, "crew_of_month", PERIOD_LABEL);
  check("Staff F (top average, 5 visits) got the $100 Crew of the Month bonus", bonusF?.amount_cents === 10000);

  const bonusG = await getBonus(staffG.userId, "crew_of_month", PERIOD_LABEL);
  check("Staff G (lower average) did NOT win Crew of the Month", !bonusG);

  const bonusH = await getBonus(staffH.userId, "crew_of_month", PERIOD_LABEL);
  check("Staff H (perfect score but only 3 visits, below the 5-visit minimum) did NOT win", !bonusH);

  console.log("\n== running computeAllBonuses again (idempotency check) ==");
  const secondRun = await computeAllBonuses(serviceClient, TODAY);
  console.log("second run results:", secondRun);
  check("second run inserted zero new rows for every bonus type", Object.values(secondRun).every((n) => n === 0));

  console.log("\n== RLS: staff D can read their own bonus row ==");
  const { data: ownRow, error: ownErr } = await staffD.client.from("staff_bonuses").select("id").eq("id", bonusD.id);
  check("Staff D can read their own staff_bonuses row", !ownErr && (ownRow ?? []).length === 1);

  console.log("\n== RLS: unrelated staff E cannot read staff D's bonus row ==");
  const { data: otherRow, error: otherErr } = await staffE.client.from("staff_bonuses").select("id").eq("id", bonusD.id);
  check("Staff E's query succeeds (returns empty, not an error)", !otherErr);
  check("Staff E cannot see Staff D's bonus row", (otherRow ?? []).length === 0);

  console.log("\n== RLS: staff D cannot mark their own bonus paid directly ==");
  const { data: blockedWrite, error: blockedWriteErr } = await staffD.client
    .from("staff_bonuses")
    .update({ paid: true })
    .eq("id", bonusD.id)
    .select("id")
    .maybeSingle();
  check("Staff D's own direct write is blocked by RLS", !blockedWriteErr && !blockedWrite);

  console.log("\n== admin can read and mark a bonus paid (mirrors markBonusPaidAction) ==");
  const { data: adminRead, error: adminReadErr } = await admin.client.from("staff_bonuses").select("id").eq("id", bonusD.id);
  check("Admin can read the bonus", !adminReadErr && (adminRead ?? []).length === 1);

  const { error: adminWriteErr } = await admin.client
    .from("staff_bonuses")
    .update({ paid: true, paid_at: new Date().toISOString() })
    .eq("id", bonusD.id);
  check("Admin can mark the bonus paid", !adminWriteErr);

  const { data: afterPaid } = await serviceClient.from("staff_bonuses").select("paid, paid_at").eq("id", bonusD.id).single();
  check("Bonus is now marked paid", afterPaid?.paid === true && Boolean(afterPaid?.paid_at));

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
} catch (err) {
  console.error("ERROR:", err);
  process.exitCode = 1;
} finally {
  console.log("\n== cleanup ==");
  if (staffIds.length) await serviceClient.from("staff_bonuses").delete().in("staff_id", staffIds);
  if (bookingIds.length) await serviceClient.from("visit_scores").delete().in("booking_id", bookingIds);
  if (bookingIds.length) await serviceClient.from("bookings").delete().in("id", bookingIds);
  if (propertyIds.length) await serviceClient.from("properties").delete().in("id", propertyIds);
  if (staffIds.length) await serviceClient.from("staff").delete().in("id", staffIds);
  for (const id of userIds) {
    await serviceClient.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log("deleted test users:", userIds.length);
}
