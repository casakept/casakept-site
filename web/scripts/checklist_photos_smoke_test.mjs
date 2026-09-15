// Exercises the photo checklist's real security boundary: RLS on
// visit_checklist_entries plus storage.objects policies on the private
// visit-photos bucket, not app code -- staff-checklist.ts runs entirely on
// the requesting staff member's own session (no service-role client
// involved). This test signs in as real users (anon key + password) and
// runs the exact queries/uploads the staff jobs page and its actions use,
// rather than importing app code directly.
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
  const email = `checklistsmoke+${label}+${stamp}@casakept.test`;
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
let staffAId;
let staffBId;
let uploadedPath;

try {
  console.log("== provisioning test users ==");
  const customerA = await createUser("customerA", "customer", "Customer A Smoke");
  const staffA = await createUser("staffA", "staff", "Staff A Smoke");
  const staffB = await createUser("staffB", "staff", "Staff B Smoke");
  const admin = await createUser("admin", "admin", "Admin Smoke");
  userIds.push(customerA.userId, staffA.userId, staffB.userId, admin.userId);
  console.log("staffA:", staffA.userId, "staffB:", staffB.userId, "admin:", admin.userId);

  await serviceClient.from("staff").insert({ id: staffA.userId, active: true }).throwOnError();
  staffAId = staffA.userId;
  await serviceClient.from("staff").insert({ id: staffB.userId, active: true }).throwOnError();
  staffBId = staffB.userId;

  console.log("\n== seeding a deep_clean booking assigned to staff A, in_progress ==");
  const { data: property } = await customerA.client
    .from("properties")
    .insert({ customer_id: customerA.userId, label: "Smoke test house", address_line1: "789 Test Ave", city: "Fort Worth", zip: "76109" })
    .select("id")
    .single()
    .throwOnError();
  propertyId = property.id;

  const { data: booking } = await customerA.client
    .from("bookings")
    .insert({
      customer_id: customerA.userId,
      property_id: propertyId,
      service_type: "deep_clean",
      scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      time_window: "morning",
      price_cents: 20000,
      status: "pending",
    })
    .select("id")
    .single()
    .throwOnError();
  bookingId = booking.id;
  await serviceClient
    .from("bookings")
    .update({ status: "in_progress", assigned_staff_id: staffAId })
    .eq("id", bookingId)
    .throwOnError();
  console.log("booking:", bookingId);

  console.log("\n== checklist_items catalog is readable by any authenticated user ==");
  const { data: catalog, error: catalogErr } = await staffA.client
    .from("checklist_items")
    .select("id, name, deep_clean_only, requires_photo")
    .eq("active", true);
  check("staff A can read the active catalog", !catalogErr && (catalog ?? []).length > 0);
  const nonPhotoItem = catalog.find((i) => !i.requires_photo);
  const photoItem = catalog.find((i) => i.requires_photo);
  check("catalog includes at least one non-photo and one photo-required item", Boolean(nonPhotoItem) && Boolean(photoItem));
  check("catalog includes a deep_clean_only item (booking is deep_clean)", catalog.some((i) => i.deep_clean_only));

  console.log("\n== staff A toggles a non-photo item complete (own assigned booking) ==");
  const { error: toggleErr } = await staffA.client
    .from("visit_checklist_entries")
    .upsert(
      { booking_id: bookingId, checklist_item_id: nonPhotoItem.id, staff_id: staffAId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: "booking_id,checklist_item_id" }
    );
  check("staff A can upsert an entry for their own assigned booking", !toggleErr);

  console.log("\n== unrelated staff B attempts to write an entry against staff A's booking ==");
  const { error: blockedWriteErr } = await staffB.client
    .from("visit_checklist_entries")
    .upsert(
      { booking_id: bookingId, checklist_item_id: nonPhotoItem.id, staff_id: staffBId, completed: true },
      { onConflict: "booking_id,checklist_item_id" }
    );
  check("staff B write against staff A's booking is blocked", Boolean(blockedWriteErr));

  console.log("\n== staff A uploads a photo for the photo-required item ==");
  uploadedPath = `${bookingId}/${photoItem.id}-${Date.now()}.jpg`;
  const fakeJpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])], { type: "image/jpeg" });
  const { error: uploadErr } = await staffA.client.storage.from("visit-photos").upload(uploadedPath, fakeJpeg, { contentType: "image/jpeg" });
  check("staff A can upload a photo into their assigned booking's folder", !uploadErr);

  const { error: entryWithPhotoErr } = await staffA.client.from("visit_checklist_entries").upsert(
    { booking_id: bookingId, checklist_item_id: photoItem.id, staff_id: staffAId, completed: true, completed_at: new Date().toISOString(), photo_path: uploadedPath },
    { onConflict: "booking_id,checklist_item_id" }
  );
  check("staff A can record the photo entry", !entryWithPhotoErr);

  console.log("\n== unrelated staff B attempts to read/write in staff A's photo folder ==");
  const { data: blockedList } = await staffB.client.storage.from("visit-photos").list(bookingId);
  check("staff B cannot list staff A's booking folder", (blockedList ?? []).length === 0);

  const otherFakeJpeg = new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
  const { error: blockedUploadErr } = await staffB.client.storage
    .from("visit-photos")
    .upload(`${bookingId}/${photoItem.id}-intrude.jpg`, otherFakeJpeg, { contentType: "image/jpeg" });
  check("staff B cannot upload into staff A's booking folder", Boolean(blockedUploadErr));

  console.log("\n== staff A's own entries are readable back ==");
  const { data: ownEntries, error: ownEntriesErr } = await staffA.client
    .from("visit_checklist_entries")
    .select("checklist_item_id, completed, photo_path")
    .eq("booking_id", bookingId);
  check("staff A reads back both entries", !ownEntriesErr && (ownEntries ?? []).length === 2);

  console.log("\n== admin reads the checklist + generates a signed URL for the photo ==");
  await serviceClient.from("bookings").update({ status: "completed" }).eq("id", bookingId).throwOnError();
  const { data: adminBookingRow, error: adminReadErr } = await admin.client
    .from("bookings")
    .select("id, checklist:visit_checklist_entries(completed, photo_path, item:checklist_items(name))")
    .eq("id", bookingId)
    .single();
  check("admin can read the booking's checklist via RLS", !adminReadErr && adminBookingRow?.checklist?.length === 2);

  const { data: signed, error: signedErr } = await serviceClient.storage.from("visit-photos").createSignedUrl(uploadedPath, 60);
  check("service client can generate a signed URL for the photo", !signedErr && Boolean(signed?.signedUrl));
  if (signed?.signedUrl) {
    const res = await fetch(signed.signedUrl);
    check("signed URL actually serves the uploaded photo", res.ok);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
} catch (err) {
  console.error("ERROR:", err);
  process.exitCode = 1;
} finally {
  console.log("\n== cleanup ==");
  if (uploadedPath) await serviceClient.storage.from("visit-photos").remove([uploadedPath]).catch(() => {});
  if (bookingId) await serviceClient.from("visit_checklist_entries").delete().eq("booking_id", bookingId);
  if (bookingId) await serviceClient.from("bookings").delete().eq("id", bookingId);
  if (propertyId) await serviceClient.from("properties").delete().eq("id", propertyId);
  if (staffAId) await serviceClient.from("staff").delete().eq("id", staffAId);
  if (staffBId) await serviceClient.from("staff").delete().eq("id", staffBId);
  for (const id of userIds) {
    await serviceClient.auth.admin.deleteUser(id).catch(() => {});
  }
  console.log("deleted test users:", userIds);
}
