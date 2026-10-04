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
