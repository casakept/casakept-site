import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import UpgradeReviewCard, { type UpgradeReviewData } from "@/components/admin/UpgradeReviewCard";
import {
  accuracyByCrew,
  isReviewable,
  isUpsellPeriod,
  monthLabel,
  periodMonth,
  upsellsByCrew,
  verdictLabel,
  type UpsellPeriod,
} from "@/lib/upgradeReview";
import { businessDateISO } from "@/lib/businessTime";
import { formatDollars } from "@/lib/homePricing";
import { reasonLabel } from "@/lib/upgradeRequests";
import { describeConditionAnswers } from "@/lib/firstCleanAssessment";

export const metadata: Metadata = {
  title: "Admin · Deep-clean calls",
};

const TABS = [
  { value: "review", label: "To review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "approved", label: "Approved" },
] as const;

const PERIODS: { value: UpsellPeriod; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "all", label: "All time" },
];

export default async function UpgradeReviewsPage({ searchParams }: PageProps<"/admin/upgrade-reviews">) {
  const params = await searchParams;
  const view = params.view === "reviewed" ? "reviewed" : params.view === "approved" ? "approved" : "review";
  const periodParam = typeof params.period === "string" ? params.period : "this_month";
  const period: UpsellPeriod = isUpsellPeriod(periodParam) ? periodParam : "this_month";

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

  const shown =
    view === "approved"
      ? []
      : all.filter((r) =>
          view === "review" ? isReviewable(r.status) && r.review_verdict == null : r.review_verdict != null
        );

  // Upsell tracking: by the visit's date, so a month is the visits that
  // happened in it.
  const month = periodMonth(period, businessDateISO());
  const inPeriod = all.filter((r) => !month || (r.booking?.scheduled_date ?? "").startsWith(month));
  const upsells = upsellsByCrew(
    inPeriod.map((r) => ({ staffId: r.staff_id, status: r.status, amountCents: r.amount_cents }))
  ).sort((a, b) => b.approved - a.approved || (crewNames.get(a.staffId) ?? "").localeCompare(crewNames.get(b.staffId) ?? ""));
  const approvedCalls = inPeriod
    .filter((r) => r.status === "approved")
    .sort((a, b) => (b.booking?.scheduled_date ?? "").localeCompare(a.booking?.scheduled_date ?? ""));
  const totalApproved = approvedCalls.length;
  const totalRevenue = approvedCalls.reduce((sum, r) => sum + r.amount_cents, 0);
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

      {view !== "approved" && accuracy.length > 0 && (
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
                  upgrade{c.approved === 1 ? "" : "s"} approved){c.unreviewed > 0 ? ` · ${c.unreviewed} to review` : ""}
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

      {view === "approved" ? (
        <div>
          <p style={{ fontSize: 13, color: "#6a746c", marginBottom: 12 }}>
            Standard cleans the customer agreed to upgrade to a deep clean and paid for. This is for seeing who is
            producing upgrades; it isn&apos;t part of any crew scorecard.
          </p>
          <div className="admin-filters">
            {PERIODS.map((p) => (
              <Link
                key={p.value}
                href={`/admin/upgrade-reviews?view=approved&period=${p.value}`}
                aria-current={period === p.value ? "page" : undefined}
              >
                {p.label}
              </Link>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#9aa49d", margin: "0 0 14px" }}>
            {month ? monthLabel(month) : "All time"}, by the visit&apos;s date.
          </p>

          <h3>Crew upsells</h3>
          {upsells.length === 0 ? (
            <p style={{ marginTop: 10, color: "#6a746c" }}>No deep-clean offers in this period.</p>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {upsells.map((c) => (
                <div key={c.staffId} className="pricerow">
                  <b>{crewNames.get(c.staffId)}</b>
                  <div className="dots"></div>
                  <span style={{ fontSize: 13 }}>
                    <b>
                      {c.approved} upgrade{c.approved === 1 ? "" : "s"}
                    </b>{" "}
                    · {formatDollars(c.revenueCents)} · {c.approved} of {c.offered} offer{c.offered === 1 ? "" : "s"}{" "}
                    accepted{c.conversionPct != null ? ` (${c.conversionPct}%)` : ""}
                  </span>
                </div>
              ))}
              <div className="pricerow">
                <b>Total</b>
                <div className="dots"></div>
                <span style={{ fontSize: 13 }}>
                  <b>
                    {totalApproved} upgrade{totalApproved === 1 ? "" : "s"}
                  </b>{" "}
                  · {formatDollars(totalRevenue)}
                </span>
              </div>
            </div>
          )}
          <p style={{ fontSize: 12, color: "#9aa49d", marginTop: 8 }}>
            &ldquo;Offers&rdquo; are calls the customer was asked about (approved, declined, or no response); calls the crew
            withdrew aren&apos;t counted.
          </p>

          <h3 style={{ marginTop: 28 }}>Approved upgrades</h3>
          {approvedCalls.length === 0 ? (
            <p style={{ marginTop: 10, color: "#6a746c" }}>No approved upgrades in this period.</p>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {approvedCalls.map((r) => (
                <div key={r.id} className="card" style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <b style={{ color: "var(--verde)" }}>{crewNames.get(r.staff_id)}</b>
                      <p style={{ fontSize: 13 }}>
                        {r.booking?.customer?.full_name ?? "Customer"}
                        {r.booking?.property ? ` · ${r.booking.property.address_line1}, ${r.booking.property.city}` : ""}
                      </p>
                      <p style={{ fontSize: 12, color: "#9aa49d" }}>
                        {r.booking?.scheduled_date
                          ? new Date(`${r.booking.scheduled_date}T00:00:00`).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })
                          : ""}{" "}
                        · {r.reasons.map(reasonLabel).join("; ")}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <b>{formatDollars(r.amount_cents)}</b>
                      <p style={{ fontSize: 12, color: r.review_verdict ? "var(--verde)" : "#9aa49d" }}>
                        {r.review_verdict ? `Reviewed: ${verdictLabel(r.review_verdict).toLowerCase()}` : "Not reviewed yet"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : calls.length === 0 ? (
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
