import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import UpgradeReviewCard, { type UpgradeReviewData } from "@/components/admin/UpgradeReviewCard";
import { accuracyByCrew, isReviewable } from "@/lib/upgradeReview";
import { describeConditionAnswers } from "@/lib/firstCleanAssessment";

export const metadata: Metadata = {
  title: "Admin · Deep-clean calls",
};

const TABS = [
  { value: "review", label: "To review" },
  { value: "reviewed", label: "Reviewed" },
] as const;

export default async function UpgradeReviewsPage({ searchParams }: PageProps<"/admin/upgrade-reviews">) {
  const params = await searchParams;
  const view = params.view === "reviewed" ? "reviewed" : "review";

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("upgrade_requests")
    .select(
      `id, staff_id, status, reasons, notes, photo_paths, amount_cents, review_verdict, review_notes, created_at,
       staff:staff!upgrade_requests_staff_id_fkey(profile:profiles!staff_id_fkey(full_name)),
       booking:bookings!upgrade_requests_booking_id_fkey(scheduled_date, condition_answers, recommended_deep,
         customer:profiles!bookings_customer_id_fkey(full_name),
         property:properties(address_line1, city))`
    )
    .order("created_at", { ascending: false })
    .limit(300);

  const all = requests ?? [];
  const inProgress = all.filter((r) => !isReviewable(r.status)).length;

  const crewNames = new Map(all.map((r) => [r.staff_id, r.staff?.profile?.full_name ?? "Unnamed crew"]));
  const accuracy = accuracyByCrew(
    all.map((r) => ({ staffId: r.staff_id, status: r.status, verdict: r.review_verdict }))
  ).sort((a, b) => (crewNames.get(a.staffId) ?? "").localeCompare(crewNames.get(b.staffId) ?? ""));

  const shown = all.filter((r) =>
    view === "review" ? isReviewable(r.status) && r.review_verdict == null : r.review_verdict != null
  );
  const toReviewCount = all.filter((r) => isReviewable(r.status) && r.review_verdict == null).length;

  // Photos are in the private bucket -- sign the ones being shown in one batch.
  const paths = shown.flatMap((r) => r.photo_paths);
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await createServiceClient().storage.from("visit-photos").createSignedUrls(paths, 60 * 60);
    signed?.forEach((s) => {
      if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl);
    });
  }

  const calls: UpgradeReviewData[] = shown.map((r) => ({
    id: r.id,
    status: r.status,
    reasons: r.reasons,
    notes: r.notes,
    amountCents: r.amount_cents,
    photoUrls: r.photo_paths.map((p) => urlByPath.get(p)).filter((u): u is string => !!u),
    crewName: crewNames.get(r.staff_id) ?? "Unnamed crew",
    customerName: r.booking?.customer?.full_name ?? "Customer",
    address: r.booking?.property ? `${r.booking.property.address_line1}, ${r.booking.property.city}` : "",
    scheduledDate: r.booking?.scheduled_date ?? r.created_at.slice(0, 10),
    conditionSummary: describeConditionAnswers(r.booking?.condition_answers),
    customerAnswersPointedToDeep: r.booking?.recommended_deep ?? null,
    verdict: r.review_verdict,
    reviewNotes: r.review_notes,
  }));

  return (
    <div>
      <p style={{ color: "#6a746c", marginBottom: 20 }}>
        Each time a crew member recommends a deep clean, judge from their photos whether the call was sound. This
        tracks assessment accuracy — separate from whether the customer said yes.
      </p>

      {accuracy.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3>Crew accuracy</h3>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {accuracy.map((c) => (
              <div key={c.staffId} className="pricerow">
                <b>{crewNames.get(c.staffId)}</b>
                <div className="dots"></div>
                <span style={{ fontSize: 13 }}>
                  {c.accuracyPct != null ? <b>{c.accuracyPct}% accurate</b> : "not yet judged"} · {c.accurate} accurate ·{" "}
                  {c.notAccurate} not · {c.unclear} unclear · {c.calls} call{c.calls === 1 ? "" : "s"} ({c.approved}{" "}
                  approved){c.unreviewed > 0 ? ` · ${c.unreviewed} to review` : ""}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#9aa49d", marginTop: 8 }}>
            Accuracy counts accurate vs. not accurate; &ldquo;photos unclear&rdquo; is left out because it says the evidence was weak,
            not that the call was wrong.
          </p>
        </div>
      )}

      <div className="admin-filters">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === "review" ? "/admin/upgrade-reviews" : `/admin/upgrade-reviews?view=${t.value}`}
            aria-current={view === t.value ? "page" : undefined}
          >
            {t.label}
            {t.value === "review" && toReviewCount > 0 ? ` (${toReviewCount})` : ""}
          </Link>
        ))}
      </div>

      {inProgress > 0 && view === "review" && (
        <p style={{ fontSize: 12, color: "#9aa49d", marginBottom: 12 }}>
          {inProgress} call{inProgress === 1 ? " is" : "s are"} still in progress and will appear here once they&apos;re done.
        </p>
      )}

      {calls.length === 0 ? (
        <p style={{ color: "#6a746c" }}>
          {view === "review" ? "Nothing waiting for review." : "Nothing reviewed yet."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {calls.map((call) => (
            <UpgradeReviewCard key={call.id} call={call} />
          ))}
        </div>
      )}
    </div>
  );
}
