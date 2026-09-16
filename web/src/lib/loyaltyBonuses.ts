import type { Database } from "@/lib/supabase/database.types";

// Mirrors the "Loyalty & retention bonuses" section of the internal Crew
// Performance Scorecard doc (v1, 2026). Payroll stays informational-only
// per the phase 1 decision -- these are the fixed amounts the
// compute-bonuses cron writes into staff_bonuses; an admin marks each row
// paid once handled outside the app.

export type StaffBonusType = Database["public"]["Enums"]["staff_bonus_type"];

export const BONUS_AMOUNTS_CENTS: Record<StaffBonusType, number> = {
  "90_day": 15000,
  anniversary: 50000,
  household_retention: 2500,
  crew_of_month: 10000,
  referral: 20000,
};

export const BONUS_LABELS: Record<StaffBonusType, string> = {
  "90_day": "90-day bonus",
  anniversary: "Anniversary bonus",
  household_retention: "Household retention",
  crew_of_month: "Crew of the Month",
  referral: "Referral bonus",
};

// "top average score across the company" with no stated minimum -- require
// at least this many scored visits that month so a single great visit
// can't win it.
export const CREW_OF_MONTH_MIN_VISITS = 5;
