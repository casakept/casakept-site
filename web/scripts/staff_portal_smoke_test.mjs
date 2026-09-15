// Exercises the staff portal's real security boundary: RLS, not app code.
// The staff jobs/availability pages and their actions all run on the
// requesting staff member's own session (no service-role client involved),
// so what matters is that a staff session can only see/update its own
// assigned bookings and its own availability/time-off rows -- and that an
// unrelated staff member is blocked from touching either. This test signs
// in as real users (anon key + password) and runs the exact queries the
// staff portal uses, rather than importing app code directly.
//
// See admin_dashboard_smoke_test.mjs for the profiles.role bootstrapping
// note (DELETE + INSERT instead of UPDATE, due to prevent_role_self_escalation).
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
  const email = `staffsmoke+${label}+${stamp}@casakept.test`;
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
    const { error: insertErr } = await serviceClient
      .from("profiles")
      .insert({ id: userId, role, full_name: fullName });
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
let staffAId;
let staffBId;
let timeOffId;

try {
  console.log("== provisioning test users ==");
  const customerA = await createUser("customerA", "customer", "Customer A Smoke");
  const staffA = await createUser("staffA", "staff", "Staff A Smoke");
  const staffB = await createUser("staffB", "staff", "Staff B Smoke");
  userIds.push(customerA.userId, staffA.userId, staffB.userId);
  console.log("customerA:", customerA.userId, "staffA:", staffA.userId, "staffB:", staffB.userId);

  const { error: staffAErr } = await serviceClient.from("staff").insert({ id: staffA.userId, active: true });
  if (staffAErr) throw staffAErr;
  staffAId = staffA.userId;
  const { error: staffBErr } = await serviceClient.from("staff").insert({ id: staffB.userId, active: true });
  if (staffBErr) throw staffBErr;
  staffBId = staffB.userId;

  console.log("\n== seeding a booking owned by customer A, assigned to staff A ==");
  const { data: property, error: propErr } = await customerA.client
    .from("properties")
    .insert({
      customer_id: customerA.userId,
      label: "Smoke test house",
      address_line1: "456 Test Ave",
      city: "Fort Worth",
      zip: "76109",
    })
    .select("id")
    .single();
  if (propErr) throw propErr;
  propertyId = property.id;

  const { data: service } = await serviceClient
    .from("services")
    .select("id, service_type")
    .eq("active", true)
    .limit(1)
    .single();

  const { data: booking, error: bookingErr } = await customerA.client
    .from("bookings")
    .insert({
      customer_id: customerA.userId,
      property_id: propertyId,
      service_type: service.service_type,
      service_id: service.id,
      scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      time_window: "morning",
      price_cents: 10000,
      status: "pending",
    })
    .select("id")
    .single();
  if (bookingErr) throw bookingErr;
  bookingId = booking.id;
  // Assign via service client -- assignment itself is the admin dashboard's
  // job (already covered by admin_dashboard_smoke_test.mjs); here we just
  // need a booking in "confirmed" state assigned to staff A to test the
  // staff portal's own read/update boundary.
  await serviceClient.from("bookings").update({ status: "confirmed", assigned_staff_id: staffAId }).eq("id", bookingId);
  console.log("booking:", bookingId);

  console.log("\n== staff jobs page query (as staff A session) ==");
  const { data: staffAJobs, error: staffAJobsErr } = await staffA.client
    .from("bookings")
    .select(
      "id, status, scheduled_date, time_window, service_type, notes, customer:profiles!bookings_customer_id_fkey(full_name, phone), property:properties(address_line1, city)"
    )
    .eq("assigned_staff_id", staffAId)
    .in("status", ["confirmed", "assigned", "in_progress"]);
  check("staff A jobs query succeeds", !staffAJobsErr);
  check("staff A sees their assigned booking", (staffAJobs ?? []).some((b) => b.id === bookingId));

  console.log("\n== staff jobs page query (as unrelated staff B session) ==");
  const { data: staffBJobs, error: staffBJobsErr } = await staffB.client
    .from("bookings")
    .select("id")
    .eq("id", bookingId);
  check("staff B query succeeds (returns empty, not an error)", !staffBJobsErr);
  check("staff B cannot see staff A's assigned booking", (staffBJobs ?? []).length === 0);

  console.log("\n== unrelated staff B attempts to advance staff A's booking (should no-op) ==");
  const { data: rejectedUpdate, error: rejectedErr } = await staffB.client
    .from("bookings")
    .update({ status: "in_progress" })
    .eq("id", bookingId)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();
  check("unrelated staff update is blocked by RLS", !rejectedErr && !rejectedUpdate);

  const { data: afterRejected } = await serviceClient.from("bookings").select("status").eq("id", bookingId).single();
  check("booking status unchanged after blocked update", afterRejected?.status === "confirmed");

  console.log("\n== advanceBookingStatusAction equivalent, run as staff A (owner) ==");
  const { data: acceptedUpdate, error: acceptedErr } = await staffA.client
    .from("bookings")
    .update({ status: "in_progress" })
    .eq("id", bookingId)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();
  check("owning staff update succeeds", !acceptedErr && Boolean(acceptedUpdate));

  const { data: afterAccepted } = await serviceClient.from("bookings").select("status").eq("id", bookingId).single();
  check("booking status now in_progress", afterAccepted?.status === "in_progress");

  console.log("\n== toggleAvailabilityAction equivalent (staff A marks Monday morning available) ==");
  const { error: availInsertErr } = await staffA.client
    .from("staff_availability")
    .insert({ staff_id: staffAId, day_of_week: 1, time_window: "morning" });
  check("staff A can insert their own availability row", !availInsertErr);

  const { data: staffAAvail } = await staffA.client
    .from("staff_availability")
    .select("id")
    .eq("staff_id", staffAId)
    .eq("day_of_week", 1)
    .eq("time_window", "morning")
    .maybeSingle();
  check("staff A sees their own availability row", Boolean(staffAAvail));

  console.log("\n== unrelated staff B attempts to read/delete staff A's availability ==");
  const { data: staffBReadsA } = await staffB.client
    .from("staff_availability")
    .select("id")
    .eq("staff_id", staffAId);
  check("staff B cannot see staff A's availability", (staffBReadsA ?? []).length === 0);

  const { data: staffBDeleteA, error: staffBDeleteErr } = await staffB.client
    .from("staff_availability")
    .delete()
    .eq("staff_id", staffAId)
    .eq("day_of_week", 1)
    .eq("time_window", "morning")
    .select("id")
    .maybeSingle();
  check("staff B delete of staff A's availability is blocked", !staffBDeleteErr && !staffBDeleteA);

  const { data: availStillThere } = await serviceClient
    .from("staff_availability")
    .select("id")
    .eq("staff_id", staffAId)
    .eq("day_of_week", 1)
    .eq("time_window", "morning")
    .maybeSingle();
  check("staff A's availability row survived the blocked delete", Boolean(availStillThere));

  console.log("\n== staff A toggles the same slot off again ==");
  const { error: availDeleteErr } = await staffA.client
    .from("staff_availability")
    .delete()
    .eq("staff_id", staffAId)
    .eq("day_of_week", 1)
    .eq("time_window", "morning");
  check("staff A can delete their own availability row", !availDeleteErr);

  console.log("\n== addTimeOffAction equivalent (staff A) ==");
  const { data: timeOff, error: timeOffErr } = await staffA.client
    .from("staff_time_off")
    .insert({
      staff_id: staffAId,
      start_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10),
      reason: "Smoke test vacation",
    })
    .select("id")
    .single();
  check("staff A can insert their own time off", !timeOffErr && Boolean(timeOff));
  timeOffId = timeOff?.id;

  console.log("\n== unrelated staff B attempts to delete staff A's time off ==");
  const { data: staffBDeleteTimeOff, error: staffBDeleteTimeOffErr } = await staffB.client
    .from("staff_time_off")
    .delete()
    .eq("id", timeOffId)
    .select("id")
    .maybeSingle();
  check("staff B delete of staff A's time off is blocked", !staffBDeleteTimeOffErr && !staffBDeleteTimeOff);

  const { data: timeOffStillThere } = await serviceClient
    .from("staff_time_off")
    .select("id")
    .eq("id", timeOffId)
    .maybeSingle();
  check("staff A's time off row survived the blocked delete", Boolean(timeOffStillThere));

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
} catch (err) {
  console.error("ERROR:", err);
  process.exitCode = 1;
} finally {
  console.log("\n== cleanup ==");
  if (timeOffId) await serviceClient.from("staff_time_off").delete().eq("id", timeOffId);
  if (bookingId) await serviceClient.from("bookings").delete().eq("id", bookingId);
  if (propertyId) await serviceClient.from("properties").delete().eq("id", propertyId);
  if (staffAId) await serviceClient.from("staff_availability").delete().eq("staff_id", staffAId);
  if (staffAId) await serviceClient.from("staff").delete().eq("id", staffAId);
  if (staffBId) await serviceClient.from("staff").delete().eq("id", staffBId);
  for (const id of userIds) {
    await serviceClient.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log("deleted test users:", userIds);
}
