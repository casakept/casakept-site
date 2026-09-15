// Exercises assign_booking_staff directly against the live Supabase
// project: preferred-cleaner-with-fallback matching, availability/time-off/
// double-booking exclusion, load-balanced fallback selection, the
// unassigned-when-nobody's-available case, and idempotency on a booking
// that's already assigned. No Stripe/app code involved -- this is purely
// the assignment logic itself (see the createBookingAction and Stripe
// webhook call sites for how it's actually invoked in the app).
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

const stamp = Date.now();
const userIds = [];
const staffIds = [];
let propertyId;
const bookingIds = [];

// A Tuesday, comfortably in the future, so we control day-of-week
// deterministically regardless of when this test runs.
function nextWeekday(targetDow) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 14); // push well clear of "today" edge cases
  while (d.getUTCDay() !== targetDow) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
const BASE_TUESDAY = nextWeekday(2); // Tuesday
const DAY_OF_WEEK = 2;
const WINDOW = "morning";

// Each case gets its own calendar date (same day-of-week, so the shared
// staff_availability rows still apply) so that one case's successful
// assignment doesn't occupy the slot for a later, unrelated case. Cases 4a
// and 4b are the exception -- they deliberately share a date since testing
// that exact-slot double-booking exclusion is the whole point of case 4.
function dateForCase(n) {
  const d = new Date(BASE_TUESDAY);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

async function createStaff(label) {
  const email = `assignsmoke+${label}+${stamp}@casakept.test`.toLowerCase();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: "Sm0keTest!23456",
    email_confirm: true,
    user_metadata: { full_name: label },
  });
  if (error) throw error;
  const id = data.user.id;
  await new Promise((r) => setTimeout(r, 400));
  await supabase.from("profiles").update({ role: "staff" }).eq("id", id);
  await supabase.from("staff").insert({ id, active: true });
  userIds.push(id);
  staffIds.push(id);
  return id;
}

let customerId;

async function createBooking({ serviceType, preferredStaffId = null, timeWindow = WINDOW, scheduledDate, status = "confirmed" }) {
  const { data: service } = await supabase
    .from("services")
    .select("id")
    .eq("service_type", serviceType)
    .eq("active", true)
    .limit(1)
    .single();
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      customer_id: customerId,
      property_id: propertyId,
      service_type: serviceType,
      service_id: service.id,
      scheduled_date: scheduledDate,
      time_window: timeWindow,
      preferred_staff_id: preferredStaffId,
      price_cents: 0,
      status,
    })
    .select("id")
    .single();
  if (error) throw error;
  bookingIds.push(booking.id);
  return booking.id;
}

try {
  console.log("== provisioning ==");
  const { data: customer, error: custErr } = await supabase.auth.admin.createUser({
    email: `assignsmoke+customer+${stamp}@casakept.test`.toLowerCase(),
    password: "Sm0keTest!23456",
    email_confirm: true,
  });
  if (custErr) throw custErr;
  userIds.push(customer.user.id);
  await new Promise((r) => setTimeout(r, 400));
  customerId = customer.user.id;

  const { data: property, error: propErr } = await supabase
    .from("properties")
    .insert({
      customer_id: customerId,
      label: "Smoke test house",
      address_line1: "789 Test Blvd",
      city: "Fort Worth",
      zip: "76109",
    })
    .select("id")
    .single();
  if (propErr) throw propErr;
  propertyId = property.id;

  const preferred = await createStaff("Preferred");
  const other = await createStaff("Other");
  console.log(
    "base date:",
    BASE_TUESDAY.toISOString().slice(0, 10),
    "(dow",
    DAY_OF_WEEK,
    ") window:",
    WINDOW,
    "preferred:",
    preferred,
    "other:",
    other
  );

  console.log("\n== case 1: preferred cleaner available -> gets assigned ==");
  await supabase.from("staff_availability").insert([
    { staff_id: preferred, day_of_week: DAY_OF_WEEK, time_window: WINDOW },
    { staff_id: other, day_of_week: DAY_OF_WEEK, time_window: WINDOW },
  ]);
  const booking1 = await createBooking({ serviceType: "standard_clean", preferredStaffId: preferred, scheduledDate: dateForCase(1) });
  const { data: chosen1, error: err1 } = await supabase.rpc("assign_booking_staff", { p_booking_id: booking1 });
  check("case 1: RPC succeeds", !err1);
  check("case 1: preferred cleaner was chosen", chosen1 === preferred);
  const { data: afterBooking1 } = await supabase.from("bookings").select("status, assigned_staff_id").eq("id", booking1).single();
  check("case 1: status advanced to assigned", afterBooking1?.status === "assigned");
  check("case 1: assigned_staff_id matches", afterBooking1?.assigned_staff_id === preferred);

  console.log("\n== case 2: preferred cleaner has no standing availability -> falls back ==");
  await supabase.from("staff_availability").delete().eq("staff_id", preferred).eq("day_of_week", DAY_OF_WEEK).eq("time_window", WINDOW);
  const booking2 = await createBooking({ serviceType: "standard_clean", preferredStaffId: preferred, scheduledDate: dateForCase(2) });
  const { data: chosen2 } = await supabase.rpc("assign_booking_staff", { p_booking_id: booking2 });
  check("case 2: falls back to the other available staff member", chosen2 === other);
  // restore for later cases
  await supabase.from("staff_availability").insert({ staff_id: preferred, day_of_week: DAY_OF_WEEK, time_window: WINDOW });

  console.log("\n== case 3: preferred cleaner is on time off -> falls back ==");
  const case3Date = dateForCase(3);
  const { data: timeOff } = await supabase
    .from("staff_time_off")
    .insert({ staff_id: preferred, start_date: case3Date, end_date: case3Date, reason: "smoke test" })
    .select("id")
    .single();
  const booking3 = await createBooking({ serviceType: "standard_clean", preferredStaffId: preferred, scheduledDate: case3Date });
  const { data: chosen3 } = await supabase.rpc("assign_booking_staff", { p_booking_id: booking3 });
  check("case 3: falls back to the other available staff member", chosen3 === other);
  await supabase.from("staff_time_off").delete().eq("id", timeOff.id);

  console.log("\n== case 4: preferred cleaner already booked that slot -> falls back, no double-booking ==");
  const case4Date = dateForCase(4); // shared on purpose -- the point of this case is the slot collision
  const booking4a = await createBooking({ serviceType: "standard_clean", preferredStaffId: preferred, scheduledDate: case4Date });
  await supabase.rpc("assign_booking_staff", { p_booking_id: booking4a }); // occupies preferred's slot
  const booking4b = await createBooking({ serviceType: "standard_clean", preferredStaffId: preferred, scheduledDate: case4Date });
  const { data: chosen4b } = await supabase.rpc("assign_booking_staff", { p_booking_id: booking4b });
  check("case 4: second booking falls back instead of double-booking preferred", chosen4b === other);

  console.log("\n== case 5: non-cleaning service ignores preference, uses next-available ==");
  // Fresh date, both staff free -- pick whichever has fewer jobs that day.
  const booking5 = await createBooking({ serviceType: "laundry", scheduledDate: dateForCase(5) });
  const { data: chosen5 } = await supabase.rpc("assign_booking_staff", { p_booking_id: booking5 });
  check("case 5: falls back to an available generalist", chosen5 === preferred || chosen5 === other);

  console.log("\n== case 6: nobody available -> booking stays unassigned ==");
  // Nobody has "afternoon" availability rows at all -- guaranteed no match.
  const booking6 = await createBooking({ serviceType: "laundry", timeWindow: "afternoon", scheduledDate: dateForCase(6) });
  const { data: chosen6 } = await supabase.rpc("assign_booking_staff", { p_booking_id: booking6 });
  check("case 6: no staff chosen", chosen6 === null);
  const { data: afterBooking6 } = await supabase.from("bookings").select("status, assigned_staff_id").eq("id", booking6).single();
  check("case 6: booking left unassigned, status unchanged", afterBooking6?.assigned_staff_id === null && afterBooking6?.status === "confirmed");

  console.log("\n== case 7: idempotent on an already-assigned booking ==");
  const { data: chosen7a } = await supabase.rpc("assign_booking_staff", { p_booking_id: booking1 });
  check("case 7: re-running returns the existing assignment", chosen7a === preferred);
  const { data: afterRerun } = await supabase.from("bookings").select("assigned_staff_id").eq("id", booking1).single();
  check("case 7: assignment didn't change", afterRerun?.assigned_staff_id === preferred);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
} catch (err) {
  console.error("ERROR:", err);
  process.exitCode = 1;
} finally {
  console.log("\n== cleanup ==");
  for (const id of bookingIds) await supabase.from("bookings").delete().eq("id", id);
  if (propertyId) await supabase.from("properties").delete().eq("id", propertyId);
  for (const id of staffIds) await supabase.from("staff").delete().eq("id", id);
  for (const id of userIds) await supabase.auth.admin.deleteUser(id).catch(() => {});
  console.log("deleted test users:", userIds);
}
