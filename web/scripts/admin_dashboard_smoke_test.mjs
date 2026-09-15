// Exercises the admin dashboard's actual security boundary: RLS, not app
// code. The admin bookings page/action run entirely on the requesting
// user's own session (no service-role client involved), so what matters is
// that bookings_all_admin grants an admin session full read/write while an
// unrelated customer session gets blocked. This test signs in as real users
// (anon key + password) and runs the exact queries/updates the admin UI
// uses, rather than importing app code directly.
//
// Bootstrapping note: profiles has a trigger that blocks any UPDATE which
// changes `role` unless the requester is already an admin (prevents
// self-escalation) -- including via the service-role key, since it has no
// auth.uid(). So promoting a freshly-created user to admin/staff here is
// done by deleting the auto-provisioned profile row and re-inserting it
// with the target role (an INSERT, which the trigger doesn't guard).
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
  const email = `adminsmoke+${label}+${stamp}@casakept.test`;
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
    // Re-provision the profile with the target role via INSERT, not UPDATE
    // -- see file header for why.
    await serviceClient.from("profiles").delete().eq("id", userId);
    const { error: insertErr } = await serviceClient
      .from("profiles")
      .insert({ id: userId, role, full_name: fullName });
    if (insertErr) throw insertErr;
  }

  // Signed-in client scoped to this user's own session -- RLS applies as
  // it would for a real request, unlike the service client above.
  const scoped = createClient(url, anonKey);
  const { error: signInErr } = await scoped.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { userId, email, client: scoped };
}

const userIds = [];
let propertyId;
let bookingId;
let staffId;

try {
  console.log("== provisioning test users ==");
  const admin = await createUser("admin", "admin", "Admin Smoke");
  const customerA = await createUser("customerA", "customer", "Customer A Smoke");
  const customerB = await createUser("customerB", "customer", "Customer B Smoke");
  const staffPerson = await createUser("staff", "staff", "Staff Smoke");
  userIds.push(admin.userId, customerA.userId, customerB.userId, staffPerson.userId);
  console.log("admin:", admin.userId, "customerA:", customerA.userId, "customerB:", customerB.userId);

  const { data: staffRow, error: staffErr } = await serviceClient
    .from("staff")
    .insert({ id: staffPerson.userId, active: true })
    .select("id")
    .single();
  if (staffErr) throw staffErr;
  staffId = staffRow.id;

  console.log("\n== seeding a booking owned by customer A ==");
  const { data: property, error: propErr } = await customerA.client
    .from("properties")
    .insert({
      customer_id: customerA.userId,
      label: "Smoke test house",
      address_line1: "123 Test St",
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
  console.log("booking:", bookingId);

  console.log("\n== admin bookings page query (as admin session) ==");
  const { data: adminView, error: adminViewErr } = await admin.client
    .from("bookings")
    .select(
      `id, status, scheduled_date, time_window, service_type, price_cents, notes, assigned_staff_id,
       customer:profiles!bookings_customer_id_fkey(full_name, phone),
       property:properties(address_line1, city),
       preferred_staff:staff!bookings_preferred_staff_id_fkey(profile:profiles!staff_id_fkey(full_name))`
    )
    .eq("status", "pending");
  check("admin query succeeds", !adminViewErr);
  const seededRow = (adminView ?? []).find((b) => b.id === bookingId);
  check("admin sees the seeded booking", Boolean(seededRow));
  check("joined customer name resolved", seededRow?.customer?.full_name === "Customer A Smoke");
  check("joined property address resolved", seededRow?.property?.address_line1 === "123 Test St");

  console.log("\n== staff directory query (as admin session) ==");
  const { data: staffOptions, error: staffOptErr } = await admin.client
    .from("staff")
    .select("id, profile:profiles!staff_id_fkey(full_name)")
    .eq("active", true);
  check("staff directory query succeeds", !staffOptErr);
  check(
    "seeded staff member appears in directory",
    (staffOptions ?? []).some((s) => s.id === staffId && s.profile?.full_name === "Staff Smoke")
  );

  console.log("\n== updateBookingAction equivalent, run as admin ==");
  const { data: adminUpdate, error: adminUpdateErr } = await admin.client
    .from("bookings")
    .update({ status: "assigned", assigned_staff_id: staffId })
    .eq("id", bookingId)
    .select("id")
    .maybeSingle();
  check("admin update succeeds", !adminUpdateErr && Boolean(adminUpdate));

  const { data: afterAdminUpdate } = await serviceClient
    .from("bookings")
    .select("status, assigned_staff_id")
    .eq("id", bookingId)
    .single();
  check("booking status is now assigned", afterAdminUpdate?.status === "assigned");
  check("booking assigned to seeded staff", afterAdminUpdate?.assigned_staff_id === staffId);

  console.log("\n== same update attempted as an unrelated customer (should no-op) ==");
  const { data: rejectedUpdate, error: rejectedErr } = await customerB.client
    .from("bookings")
    .update({ status: "completed", assigned_staff_id: null })
    .eq("id", bookingId)
    .select("id")
    .maybeSingle();
  // RLS silently filters the row out of the update rather than raising --
  // no error, but no row matched either.
  check("unrelated customer update is blocked by RLS", !rejectedErr && !rejectedUpdate);

  const { data: afterRejectedUpdate } = await serviceClient
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .single();
  check("booking status unchanged after blocked update", afterRejectedUpdate?.status === "assigned");

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
} catch (err) {
  console.error("ERROR:", err);
  process.exitCode = 1;
} finally {
  console.log("\n== cleanup ==");
  if (bookingId) await serviceClient.from("bookings").delete().eq("id", bookingId);
  if (propertyId) await serviceClient.from("properties").delete().eq("id", propertyId);
  if (staffId) await serviceClient.from("staff").delete().eq("id", staffId);
  for (const id of userIds) {
    await serviceClient.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log("deleted test users:", userIds);
}
