// Mirrors the internal Crew Performance Scorecard doc (v1, 2026): the
// 100-point visit score is Quality 40 + Customer 25 + Timeliness 20 +
// Professionalism 15, and weekly bonus is paid per visit by score band.
// Phase 1 only covers the scoring/band math -- scores are entered
// manually by an admin, and the bonus figure is informational (what's
// owed), not an automated payout.

export const SCORE_CATEGORIES = [
  { key: "quality_score", label: "Quality", max: 40 },
  { key: "customer_score", label: "Customer", max: 25 },
  { key: "timeliness_score", label: "Timeliness", max: 20 },
  { key: "professionalism_score", label: "Professionalism", max: 15 },
] as const;

export type ScoreCategoryKey = (typeof SCORE_CATEGORIES)[number]["key"];

export type ScoreBand = {
  label: string;
  bonusCentsPerVisit: number;
};

export function bandForScore(totalScore: number): ScoreBand {
  if (totalScore >= 95) return { label: "95–100", bonusCentsPerVisit: 300 };
  if (totalScore >= 90) return { label: "90–94", bonusCentsPerVisit: 200 };
  if (totalScore >= 85) return { label: "85–89", bonusCentsPerVisit: 100 };
  return { label: "Below 85", bonusCentsPerVisit: 0 };
}

// Phase 2: automatic score events. These are independent of the numeric
// subscores -- a no-show, callback, or safety violation forfeits the bonus
// for that visit even if a reviewer's manual entry looks otherwise fine.
export const VISIT_SCORE_EVENTS = [
  { value: "none", label: "None" },
  { value: "no_show", label: "No-show" },
  { value: "callback", label: "Re-clean callback" },
  { value: "safety_violation", label: "Safety violation" },
] as const;

export type VisitScoreEvent = (typeof VISIT_SCORE_EVENTS)[number]["value"];

// The actual per-visit bonus: same band math as bandForScore(), except an
// event forces it to $0 and labels why.
export function bonusForVisit(totalScore: number, eventType: VisitScoreEvent): ScoreBand {
  if (eventType !== "none") {
    const event = VISIT_SCORE_EVENTS.find((e) => e.value === eventType)!;
    return { label: `${event.label} — no bonus`, bonusCentsPerVisit: 0 };
  }
  return bandForScore(totalScore);
}
