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
