// Tears down everything created by setup_redo_test_scenario.mjs, plus any
// redo_requests / redo booking / scoring you created while testing through
// the browser. Exact-ID-only deletes, FK-safe order -- reads IDs from
// .redo_test_scenario.json rather than any filtered/bulk query, per the
// standing rule in this project after an earlier incident where an
// unfiltered loop deleted a real customer.
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envPath = "/Users/jj/Documents/casakept-site/web/.env.local";
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

const recordPath = new URL("./.redo_test_scenario.json", import.meta.url);
if (!existsSync(recordPath)) {
  console.log("No .redo_test_scenario.json found -- nothing to clean up.");
  process.exit(0);
}
const record = JSON.parse(readFileSync(recordPath, "utf8"));
console.log("cleaning up scenario from", new Date(record.stamp).toISOString());

// Any redo booking created via "Schedule re-do" during testing.
const { data: redoRequests } = await serviceClient
  .from("redo_requests")
  .select("id, redo_booking_id, photo_path")
  .eq("booking_id", record.bookingId);

for (const r of redoRequests ?? []) {
  if (r.photo_path) await serviceClient.storage.from("visit-photos").remove([r.photo_path]).catch(() => {});
  await serviceClient.from("redo_requests").delete().eq("id", r.id);
  if (r.redo_booking_id) await serviceClient.from("bookings").delete().eq("id", r.redo_booking_id);
}
console.log("removed redo_requests:", (redoRequests ?? []).length);

await serviceClient.from("notifications_log").delete().eq("booking_id", record.bookingId);
await serviceClient.from("csat_responses").delete().eq("token", record.token);
await serviceClient.from("visit_scores").delete().eq("booking_id", record.bookingId);
await serviceClient.from("visit_checklist_entries").delete().eq("booking_id", record.bookingId);
await serviceClient.from("visit_checkins").delete().eq("booking_id", record.bookingId);
await serviceClient.from("bookings").delete().eq("id", record.bookingId);
await serviceClient.from("properties").delete().eq("id", record.propertyId);
await serviceClient.from("staff").delete().eq("id", record.staffUserId);

await serviceClient.auth.admin.deleteUser(record.customerUserId).catch(() => {});
await serviceClient.auth.admin.deleteUser(record.staffUserId).catch(() => {});

unlinkSync(recordPath);
console.log("done -- test customer, staff, property, booking, and any redo/damage reports removed.");
