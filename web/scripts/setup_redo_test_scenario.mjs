// One-off, NOT a smoke test -- sets up a real completed visit (customer,
// property, staff, checkin/checkout ~2 hours ago, two checklist items with
// a staff photo on one, and a CSAT token) and leaves it all live so you can
// click through the actual survey page and /admin/redo-requests in the
// browser. Prints the survey URL and every ID/login at the end. Nothing is
// deleted -- run scripts/cleanup_redo_test_scenario.mjs when you're done.
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envPath = "/Users/jj/Documents/casakept-site/web/.env.local";
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceClient = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const stamp = Date.now();
const password = "RedoTest!23456";

async function createUser(label, role, fullName) {
  const email = `redotest+${label}+${stamp}@casakept.test`;
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  const userId = data.user.id;
  await sleep(400);

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

const record = { stamp };

console.log("== provisioning test customer + staff ==");
const customer = await createUser("customer", "customer", "Redo Test Customer");
const staff = await createUser("staff", "staff", "Redo Test Cleaner");
await serviceClient.from("staff").insert({ id: staff.userId, active: true }).throwOnError();
record.customerEmail = customer.email;
record.customerUserId = customer.userId;
record.staffUserId = staff.userId;
console.log("customer:", customer.email, customer.userId);
console.log("staff:", staff.email, staff.userId);

console.log("\n== property + completed booking (today) ==");
const { data: property } = await customer.client
  .from("properties")
  .insert({ customer_id: customer.userId, label: "Redo test house", address_line1: "555 Test Ave", city: "Fort Worth", zip: "76109" })
  .select("id")
  .single()
  .throwOnError();
record.propertyId = property.id;

const today = new Date().toISOString().slice(0, 10);
const { data: booking } = await customer.client
  .from("bookings")
  .insert({
    customer_id: customer.userId,
    property_id: property.id,
    service_type: "standard_clean",
    scheduled_date: today,
    time_window: "morning",
    price_cents: 19900,
    status: "pending",
  })
  .select("id")
  .single()
  .throwOnError();
record.bookingId = booking.id;
await serviceClient
  .from("bookings")
  .update({ status: "completed", assigned_staff_id: staff.userId })
  .eq("id", booking.id)
  .throwOnError();
console.log("booking:", booking.id);

console.log("\n== checkin/checkout, ~2 hours ago (inside the 24h report window) ==");
const checkOutAt = new Date(Date.now() - 2 * 3_600_000).toISOString();
const checkInAt = new Date(Date.now() - 3 * 3_600_000).toISOString();
await serviceClient
  .from("visit_checkins")
  .insert({ booking_id: booking.id, staff_id: staff.userId, check_in_at: checkInAt, check_out_at: checkOutAt })
  .throwOnError();

console.log("\n== checklist entries: one plain, one with a staff photo ==");
const { data: catalog } = await staff.client
  .from("checklist_items")
  .select("id, name, requires_photo")
  .eq("active", true)
  .limit(10);
const plainItem = catalog.find((i) => !i.requires_photo) ?? catalog[0];
const photoItem = catalog.find((i) => i.requires_photo && i.id !== plainItem.id) ?? catalog[1];

await staff.client
  .from("visit_checklist_entries")
  .upsert(
    { booking_id: booking.id, checklist_item_id: plainItem.id, staff_id: staff.userId, completed: true, completed_at: checkOutAt },
    { onConflict: "booking_id,checklist_item_id" }
  )
  .throwOnError();

const photoPath = `${booking.id}/${photoItem.id}-${Date.now()}.jpg`;
const fakeJpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])], { type: "image/jpeg" });
await staff.client.storage.from("visit-photos").upload(photoPath, fakeJpeg, { contentType: "image/jpeg" }).then(({ error }) => {
  if (error) throw error;
});
await staff.client
  .from("visit_checklist_entries")
  .upsert(
    { booking_id: booking.id, checklist_item_id: photoItem.id, staff_id: staff.userId, completed: true, completed_at: checkOutAt, photo_path: photoPath },
    { onConflict: "booking_id,checklist_item_id" }
  )
  .throwOnError();
console.log("checklist items:", plainItem.name, "/", photoItem.name, "(has crew photo)");
record.checklistItemIds = [plainItem.id, photoItem.id];

console.log("\n== CSAT survey token (unrated, so the page is reachable) ==");
const token = crypto.randomUUID().replace(/-/g, "");
await serviceClient.from("csat_responses").insert({ booking_id: booking.id, customer_id: customer.userId, token }).throwOnError();
record.token = token;

writeFileSync(new URL("./.redo_test_scenario.json", import.meta.url), JSON.stringify(record, null, 2));

console.log("\n================ READY ================");
console.log("Survey link (open this in your browser):");
console.log(`  http://localhost:3000/survey/${token}`);
console.log("\nCustomer login (for /account -> Past visits -> Rate this visit):");
console.log(`  email: ${customer.email}`);
console.log(`  password: ${password}`);
console.log("\nUse your own real admin account for /admin/redo-requests and /admin/scores.");
console.log("\nWhen you're done testing, run:");
console.log("  node scripts/cleanup_redo_test_scenario.mjs");
console.log("=========================================");
