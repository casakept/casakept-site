// Admin review of a crew member's "this home needs a deep clean" calls.

export const REVIEW_VERDICTS = [
  { value: "accurate", label: "Accurate", help: "The photos support a deep clean." },
  { value: "not_accurate", label: "Not accurate", help: "A standard clean was enough." },
  { value: "unclear", label: "Photos unclear", help: "The photos don't show enough to tell." },
] as const;

export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number]["value"];

export function isReviewVerdict(value: string): value is ReviewVerdict {
  return REVIEW_VERDICTS.some((v) => v.value === value);
}

export function verdictLabel(value: string): string {
  return REVIEW_VERDICTS.find((v) => v.value === value)?.label ?? value;
}

// A call is ready to review once it has played out. One still waiting on
// the customer isn't done yet.
export const REVIEWABLE_STATUSES = ["approved", "declined", "expired", "cancelled"] as const;

export function isReviewable(status: string): boolean {
  return (REVIEWABLE_STATUSES as readonly string[]).includes(status);
}

export type ReviewInputRow = {
  staffId: string;
  status: string;
  verdict: string | null;
};

export type CrewAccuracy = {
  staffId: string;
  calls: number;
  approved: number;
  accurate: number;
  notAccurate: number;
  unclear: number;
  unreviewed: number;
  // accurate / (accurate + not accurate), whole percent. "Photos unclear"
  // is left out: it says the evidence was weak, not that the call was wrong.
  // Null until at least one call has been judged accurate or not.
  accuracyPct: number | null;
};

export function accuracyByCrew(rows: ReviewInputRow[]): CrewAccuracy[] {
  const byStaff = new Map<string, CrewAccuracy>();
  for (const row of rows) {
    let c = byStaff.get(row.staffId);
    if (!c) {
      c = { staffId: row.staffId, calls: 0, approved: 0, accurate: 0, notAccurate: 0, unclear: 0, unreviewed: 0, accuracyPct: null };
      byStaff.set(row.staffId, c);
    }
    c.calls++;
    if (row.status === "approved") c.approved++;
    if (row.verdict === "accurate") c.accurate++;
    else if (row.verdict === "not_accurate") c.notAccurate++;
    else if (row.verdict === "unclear") c.unclear++;
    else if (isReviewable(row.status)) c.unreviewed++;
  }
  for (const c of byStaff.values()) {
    const judged = c.accurate + c.notAccurate;
    c.accuracyPct = judged > 0 ? Math.round((c.accurate / judged) * 100) : null;
  }
  return [...byStaff.values()];
}

// ---- Upsell tracking ----------------------------------------------------
// An "approved" call is a standard clean the customer agreed to upgrade to a
// deep clean and paid for. This is for seeing who is producing upgrades --
// it is deliberately separate from accuracy and isn't part of any scorecard.

export type UpsellInputRow = {
  staffId: string;
  status: string;
  amountCents: number;
};

export type CrewUpsells = {
  staffId: string;
  approved: number;
  revenueCents: number;
  // Calls the customer was actually asked about (approved, declined, or no
  // response). A call the crew withdrew never reached a decision.
  offered: number;
  // approved / offered, whole percent; null until something was offered.
  conversionPct: number | null;
};

export function upsellsByCrew(rows: UpsellInputRow[]): CrewUpsells[] {
  const byStaff = new Map<string, CrewUpsells>();
  for (const row of rows) {
    if (!["approved", "declined", "expired"].includes(row.status)) continue;
    let c = byStaff.get(row.staffId);
    if (!c) {
      c = { staffId: row.staffId, approved: 0, revenueCents: 0, offered: 0, conversionPct: null };
      byStaff.set(row.staffId, c);
    }
    c.offered++;
    if (row.status === "approved") {
      c.approved++;
      c.revenueCents += row.amountCents;
    }
  }
  for (const c of byStaff.values()) {
    c.conversionPct = c.offered > 0 ? Math.round((c.approved / c.offered) * 100) : null;
  }
  return [...byStaff.values()];
}

export type UpsellPeriod = "this_month" | "last_month" | "all";

export function isUpsellPeriod(value: string): value is UpsellPeriod {
  return value === "this_month" || value === "last_month" || value === "all";
}

// The "YYYY-MM" a period covers, given today's date ("YYYY-MM-DD") in the
// business time zone; null for all time.
export function periodMonth(period: UpsellPeriod, todayISO: string): string | null {
  if (period === "all") return null;
  const month = todayISO.slice(0, 7);
  if (period === "this_month") return month;
  const [year, m] = month.split("-").map(Number);
  return m === 1 ? `${year - 1}-12` : `${year}-${String(m - 1).padStart(2, "0")}`;
}

export function monthLabel(yyyymm: string): string {
  const [year, m] = yyyymm.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
