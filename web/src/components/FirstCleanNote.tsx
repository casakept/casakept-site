import { describeConditionAnswers } from "@/lib/firstCleanAssessment";
import { formatDollars } from "@/lib/homePricing";

// Context for the crew and admins on a customer's first standard clean at
// a home: how they described its condition, whether we'd have recommended a
// deep clean, and the upgrade they agreed the crew may offer.
export default function FirstCleanNote({
  conditionAnswers,
  recommendedDeep,
  upgradeConsentAt,
  upgradeMaxCents,
}: {
  conditionAnswers: unknown;
  recommendedDeep: boolean | null;
  upgradeConsentAt: string | null;
  upgradeMaxCents: number | null;
}) {
  if (!upgradeConsentAt) return null;
  const condition = describeConditionAnswers(conditionAnswers);
  return (
    <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--sand)", borderRadius: 10, fontSize: 12 }}>
      <b style={{ color: "var(--verde)" }}>First clean at this home.</b>{" "}
      {recommendedDeep ? "Their answers pointed to a deep clean, but they kept the standard clean. " : ""}
      Customer pre-approved being offered a deep-clean upgrade
      {upgradeMaxCents != null ? ` (up to ${formatDollars(upgradeMaxCents)} more)` : ""}.
      {condition && <span style={{ display: "block", color: "#6a746c", marginTop: 2 }}>{condition}</span>}
    </div>
  );
}
