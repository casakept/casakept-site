// Exercises the CSAT survey's real security boundary: RLS on
// csat_responses, which -- unlike every other new table in this project --
// has NO write policy for anon/authenticated sessions at all. Both the
// sending cron job (api/cron/csat-survey) and the token-validated response
// action (submitCsatResponseAction) run entirely on the service-role
// client, not a user session, so the queries below mirror those two code
// paths directly (same convention as the other smoke tests: run the exact
// queries the app uses, rather than importing "use server" actions --
// submitCsatResponseAction also calls revalidatePath(), which requires a
// live Next.js request context and would throw if imported into a plain
// script). What actually needs verifying here is the negative case: an
// unrelated or even the owning customer's own authenticated session must
// NOT be able to read/write someone else's rating, and must not be able to
// write their own either -- only their own read is allowed.
//
// See admin_dashboard_smoke_test.mjs for the profiles.role bootstrapping
// note (DELETE + INSERT instead of UPDATE, due to prevent_role_self_escalation).
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

async function createUser(label, role, fullName) {
  const email = `csatsmoke+${label}+${stamp}@casakept.test`;
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  const userId = data.user.id;
  await sleep(400); // let on_auth_user_created provision the default profile row

  if (role !== "customer") {
    await serviceClient.from("profiles").delete().eq("id", userId);
    const { error: insertErr } = await serviceClient.from("profiles").insert({ id: userId, role, full_name: fullName });
    if (insertErr) throw insertErr;
  }

  const scoped = createClient(url, anonKey);
  const { error: signInErr } = await scoped.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { userId, email, client: scoped };
}

const userIds = [];
let propertyId;
let bookingId;
let csatRowId;
const token = randomBytes(24).toString("base64url");

try {
  console.log("== provisioning test users ==");
  const customerA = await createUser("customerA", "customer", "Customer A Smoke");
  const customerB = await createUser("customerB", "customer", "Customer B Smoke");
  userIds.push(customerA.userId, customerB.userId);
  console.log("customerA:", customerA.userId, "customerB:", customerB.userId);

  console.log("\n== seeding a completed booking (yesterday) for customer A ==");
  const { data: property } = await customerA.client
    .from("properties")
    .insert({ customer_id: customerA.userId, label: "Smoke test house", address_line1: "321 Test Ave", city: "Fort Worth", zip: "76109" })
    .select("id")
    .single()
    .throwOnError();
  propertyId = property.id;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().slice(0, 10);

  const { data: booking } = await customerA.client
    .from("bookings")
    .insert({
      customer_id: customerA.userId,
      property_id: propertyId,
      service_type: "standard_clean",
      scheduled_date: yesterdayDate,
      time_window: "morning",
      price_cents: 12000,
      status: "pending",
    })
    .select("id")
    .single()
    .throwOnError();
  bookingId = booking.id;
  await serviceClient.from("bookings").update({ status: "completed" }).eq("id", bookingId).throwOnError();
  console.log("booking:", bookingId, "scheduled_date:", yesterdayDate);

  console.log("\n== cron query picks up the booking ==");
  const { data: cronCandidates, error: cronErr } = await serviceClient
    .from("bookings")
    .select("id, customer_id")
    .eq("scheduled_date", yesterdayDate)
    .eq("status", "completed");
  check("cron query succeeds", !cronErr);
  check("cron query finds the booking", (cronCandidates ?? []).some((b) => b.id === bookingId));

  console.log("\n== cron inserts the csat_responses row (service client, mirrors the cron route) ==");
  const { data: inserted, error: insertErr } = await serviceClient
    .from("csat_responses")
    .insert({ booking_id: bookingId, customer_id: customerA.userId, token })
    .select("id")
    .single();
  check("service client can insert a survey row", !insertErr && Boolean(inserted));
  csatRowId = inserted?.id;

  console.log("\n== re-running the cron dedup check ==");
  const { data: dedupCheck } = await serviceClient.from("csat_responses").select("booking_id").eq("booking_id", bookingId);
  check("dedup query finds the already-sent row (would skip on a re-run)", (dedupCheck ?? []).length === 1);

  console.log("\n== customer A can read their own row via RLS ==");
  const { data: ownRow, error: ownRowErr } = await customerA.client.from("csat_responses").select("id, rating").eq("token", token);
  check("customer A can read their own csat_responses row", !ownRowErr && (ownRow ?? []).length === 1);

  console.log("\n== unrelated customer B cannot read customer A's row ==");
  const { data: otherRow, error: otherRowErr } = await customerB.client.from("csat_responses").select("id").eq("token", token);
  check("customer B query succeeds (returns empty, not an error)", !otherRowErr);
  check("customer B cannot see customer A's row", (otherRow ?? []).length === 0);

  console.log("\n== anonymous (no session) client cannot read by token ==");
  const anonClient = createClient(url, anonKey);
  const { data: anonRow } = await anonClient.from("csat_responses").select("id").eq("token", token);
  check("anonymous client cannot read the row either", (anonRow ?? []).length === 0);

  console.log("\n== customer A cannot write their own rating directly (no authenticated write policy) ==");
  const { data: blockedSelfWrite, error: blockedSelfWriteErr } = await customerA.client
    .from("csat_responses")
    .update({ rating: 5 })
    .eq("token", token)
    .select("id")
    .maybeSingle();
  check("customer A's own direct update is blocked by RLS", !blockedSelfWriteErr && !blockedSelfWrite);

  console.log("\n== submit action's logic: lookup by token + guard on responded_at (service client) ==");
  const { data: beforeSubmit } = await serviceClient.from("csat_responses").select("id, responded_at").eq("token", token).maybeSingle();
  check("lookup-by-token finds the row and it's unanswered", Boolean(beforeSubmit) && !beforeSubmit.responded_at);

  const { error: submitErr } = await serviceClient
    .from("csat_responses")
    .update({ rating: 5, comment: "Great visit, thank you!", responded_at: new Date().toISOString() })
    .eq("id", beforeSubmit.id);
  check("service client can record the rating (mirrors submitCsatResponseAction)", !submitErr);

  const { data: afterSubmit } = await serviceClient.from("csat_responses").select("rating, comment, responded_at").eq("token", token).single();
  check("rating persisted correctly", afterSubmit?.rating === 5 && afterSubmit?.comment === "Great visit, thank you!");
  check("responded_at now set", Boolean(afterSubmit?.responded_at));

  console.log("\n== admin scores page query can join the response ==");
  const admin = await createUser("admin", "admin", "Admin Smoke");
  userIds.push(admin.userId);
  const { data: adminRow, error: adminErr } = await admin.client
    .from("bookings")
    .select("id, csat:csat_responses(rating, comment, responded_at)")
    .eq("id", bookingId)
    .single();
  check("admin can read the booking's csat response via RLS", !adminErr && adminRow?.csat?.rating === 5);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
} catch (err) {
  console.error("ERROR:", err);
  process.exitCode = 1;
} finally {
  console.log("\n== cleanup ==");
  if (csatRowId) await serviceClient.from("csat_responses").delete().eq("id", csatRowId);
  if (bookingId) await serviceClient.from("bookings").delete().eq("id", bookingId);
  if (propertyId) await serviceClient.from("properties").delete().eq("id", propertyId);
  for (const id of userIds) {
    await serviceClient.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log("deleted test users:", userIds);
}
