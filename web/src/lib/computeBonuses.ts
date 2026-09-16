import { createServiceClient } from "@/lib/supabase/service";
import { BONUS_AMOUNTS_CENTS, CREW_OF_MONTH_MIN_VISITS, type StaffBonusType } from "@/lib/loyaltyBonuses";

// Computes the Crew Performance Scorecard's loyalty/retention bonuses into
// the staff_bonuses ledger -- payroll stays informational-only (phase 1
// decision), so this never moves money, it just records what's owed for
// an admin to review and mark paid on /admin/bonuses. Called by the daily
// compute-bonuses cron route, and directly by
// scripts/loyalty_bonuses_smoke_test.mjs so the test exercises this real
// logic rather than a re-implementation of it (a route.ts file can only
// export HTTP method handlers, not arbitrary functions, hence the split).
//
// Idempotent: each insert is preceded by a lookup for an existing row with
// the same (staff_id, bonus_type, period_label/related_staff_id), so
// re-running doesn't double-award. Same convention as the other cron
// jobs' notifications_log/csat_responses dedup checks -- no DB constraint
// for this, since NULLs in a unique index don't dedup the one-time bonus
// types (90_day) the way a plain equality check does here.

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;
type Staff = { id: string; active: boolean; hire_date: string; referred_by_staff_id: string | null };
export type BonusResults = Record<StaffBonusType, number>;

export async function computeAllBonuses(supabase: SupabaseServiceClient, today: Date): Promise<BonusResults> {
  const results: BonusResults = { "90_day": 0, anniversary: 0, referral: 0, household_retention: 0, crew_of_month: 0 };

  const { data: staffList } = await supabase.from("staff").select("id, active, hire_date, referred_by_staff_id");
  for (const s of staffList ?? []) {
    await computeTenureBonuses(supabase, s, today, results);
  }

  // Household retention and Crew of the Month are month-end judgments --
  // only meaningful once a month has actually closed, so only compute them
  // on the 1st, for the month that just ended.
  if (today.getUTCDate() === 1) {
    await computeMonthlyBonuses(supabase, today, results);
  }

  return results;
}

async function bonusExists(
  supabase: SupabaseServiceClient,
  match: { staff_id: string; bonus_type: StaffBonusType; period_label?: string; related_staff_id?: string }
): Promise<boolean> {
  let query = supabase.from("staff_bonuses").select("id").eq("staff_id", match.staff_id).eq("bonus_type", match.bonus_type);
  if (match.period_label !== undefined) query = query.eq("period_label", match.period_label);
  if (match.related_staff_id !== undefined) query = query.eq("related_staff_id", match.related_staff_id);
  const { data } = await query.maybeSingle();
  return Boolean(data);
}

async function computeTenureBonuses(supabase: SupabaseServiceClient, s: Staff, today: Date, results: BonusResults) {
  const hireDate = new Date(`${s.hire_date}T00:00:00Z`);
  const daysSinceHire = Math.floor((today.getTime() - hireDate.getTime()) / 86400000);

  if (daysSinceHire >= 90) {
    if (!(await bonusExists(supabase, { staff_id: s.id, bonus_type: "90_day" }))) {
      const { error } = await supabase
        .from("staff_bonuses")
        .insert({ staff_id: s.id, bonus_type: "90_day", amount_cents: BONUS_AMOUNTS_CENTS["90_day"] });
      if (!error) results["90_day"]++;
    }

    // Referral bonus is paid to the referrer once THIS hire (the referred
    // person) passes 90 days and is still active.
    if (s.referred_by_staff_id && s.active) {
      const exists = await bonusExists(supabase, {
        staff_id: s.referred_by_staff_id,
        bonus_type: "referral",
        related_staff_id: s.id,
      });
      if (!exists) {
        const { error } = await supabase.from("staff_bonuses").insert({
          staff_id: s.referred_by_staff_id,
          bonus_type: "referral",
          related_staff_id: s.id,
          amount_cents: BONUS_AMOUNTS_CENTS.referral,
        });
        if (!error) results.referral++;
      }
    }
  }

  const yearsElapsed = Math.floor(daysSinceHire / 365);
  for (let year = 1; year <= yearsElapsed; year++) {
    const periodLabel = String(year);
    if (!(await bonusExists(supabase, { staff_id: s.id, bonus_type: "anniversary", period_label: periodLabel }))) {
      const { error } = await supabase.from("staff_bonuses").insert({
        staff_id: s.id,
        bonus_type: "anniversary",
        period_label: periodLabel,
        amount_cents: BONUS_AMOUNTS_CENTS.anniversary,
      });
      if (!error) results.anniversary++;
    }
  }
}

async function computeMonthlyBonuses(supabase: SupabaseServiceClient, today: Date, results: BonusResults) {
  const prevMonthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  const prevMonthStart = new Date(Date.UTC(prevMonthEnd.getUTCFullYear(), prevMonthEnd.getUTCMonth(), 1));
  const periodLabel = `${prevMonthStart.getUTCFullYear()}-${String(prevMonthStart.getUTCMonth() + 1).padStart(2, "0")}`;
  const startStr = prevMonthStart.toISOString().slice(0, 10);
  const endStr = prevMonthEnd.toISOString().slice(0, 10);

  const { data: monthBookings } = await supabase
    .from("bookings")
    .select("id, customer_id, assigned_staff_id")
    .eq("status", "completed")
    .not("assigned_staff_id", "is", null)
    .gte("scheduled_date", startStr)
    .lte("scheduled_date", endStr);

  const bookings = (monthBookings ?? []) as { id: string; customer_id: string; assigned_staff_id: string }[];

  // -- Household retention --
  const householdsByStaff = new Map<string, Set<string>>();
  for (const b of bookings) {
    if (!householdsByStaff.has(b.assigned_staff_id)) householdsByStaff.set(b.assigned_staff_id, new Set());
    householdsByStaff.get(b.assigned_staff_id)!.add(b.customer_id);
  }

  for (const [staffId, households] of householdsByStaff) {
    if (households.size === 0) continue;
    const { data: activeSubs } = await supabase
      .from("subscriptions")
      .select("customer_id")
      .eq("status", "active")
      .in("customer_id", Array.from(households));
    const activeCustomerIds = new Set((activeSubs ?? []).map((r) => r.customer_id));
    const allRenewed = Array.from(households).every((c) => activeCustomerIds.has(c));
    if (!allRenewed) continue;

    if (!(await bonusExists(supabase, { staff_id: staffId, bonus_type: "household_retention", period_label: periodLabel }))) {
      const { error } = await supabase.from("staff_bonuses").insert({
        staff_id: staffId,
        bonus_type: "household_retention",
        period_label: periodLabel,
        amount_cents: BONUS_AMOUNTS_CENTS.household_retention,
      });
      if (!error) results.household_retention++;
    }
  }

  // -- Crew of the Month --
  const bookingIds = bookings.map((b) => b.id);
  const staffByBooking = new Map(bookings.map((b) => [b.id, b.assigned_staff_id]));
  const scoresByStaff = new Map<string, number[]>();

  if (bookingIds.length > 0) {
    const { data: scores } = await supabase.from("visit_scores").select("booking_id, total_score").in("booking_id", bookingIds);
    for (const row of scores ?? []) {
      const staffId = staffByBooking.get(row.booking_id);
      if (!staffId || row.total_score == null) continue;
      if (!scoresByStaff.has(staffId)) scoresByStaff.set(staffId, []);
      scoresByStaff.get(staffId)!.push(row.total_score);
    }
  }

  let topAvg = -1;
  const averages: { staffId: string; avg: number }[] = [];
  for (const [staffId, scoreList] of scoresByStaff) {
    if (scoreList.length < CREW_OF_MONTH_MIN_VISITS) continue;
    const avg = scoreList.reduce((a, b) => a + b, 0) / scoreList.length;
    averages.push({ staffId, avg });
    if (avg > topAvg) topAvg = avg;
  }

  for (const winner of averages.filter((a) => a.avg === topAvg)) {
    if (!(await bonusExists(supabase, { staff_id: winner.staffId, bonus_type: "crew_of_month", period_label: periodLabel }))) {
      const { error } = await supabase.from("staff_bonuses").insert({
        staff_id: winner.staffId,
        bonus_type: "crew_of_month",
        period_label: periodLabel,
        amount_cents: BONUS_AMOUNTS_CENTS.crew_of_month,
      });
      if (!error) results.crew_of_month++;
    }
  }
}
