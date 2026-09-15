import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setEstimateStatusAction } from "@/lib/actions/admin-estimates";
import {
  ACK_TERMS,
  CONDITION_CATEGORIES,
  ESTIMATE_STATUS_LABELS,
  PRODUCT_PREFERENCES,
  formatCents,
  type EstimateServiceLine,
} from "@/lib/estimateForm";
import { WINDOW_LABELS } from "@/lib/serviceLabels";
import type { Database } from "@/lib/supabase/database.types";

export const metadata: Metadata = {
  title: "Admin · Estimate",
};

const STATUS_OPTIONS: Database["public"]["Enums"]["estimate_status"][] = ["draft", "sent", "converted", "declined"];

export default async function EstimateDetailPage({ params }: PageProps<"/admin/estimates/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: estimate } = await supabase
    .from("estimates")
    .select(
      `*, estimator:profiles!estimates_estimator_id_fkey(full_name),
       plan:membership_plans(name, monthly_price_cents)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!estimate) notFound();

  const conditionEntries = CONDITION_CATEGORIES.map((cat) => ({
    label: cat.label,
    value: estimate[cat.key as keyof typeof estimate] as number | null,
  }));
  const productLabel = PRODUCT_PREFERENCES.find((p) => p.value === estimate.product_preference)?.label;
  const oneTimeLines = (estimate.one_time_services as EstimateServiceLine[] | null) ?? [];
  const grandTotalNote =
    estimate.monthly_total_cents > 0 && estimate.one_time_total_cents > 0
      ? `${formatCents(estimate.monthly_total_cents)}/mo + ${formatCents(estimate.one_time_total_cents)} one-time`
      : estimate.monthly_total_cents > 0
        ? `${formatCents(estimate.monthly_total_cents)}/mo`
        : estimate.one_time_total_cents > 0
          ? `${formatCents(estimate.one_time_total_cents)} one-time`
          : "—";

  return (
    <div>
      <Link href="/admin/estimates" style={{ fontSize: 13, color: "#6a746c" }}>
        ← All estimates
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        <div>
          <h3>{estimate.contact_name}</h3>
          <p>
            {estimate.contact_email}
            {estimate.contact_phone ? ` · ${estimate.contact_phone}` : ""}
          </p>
          <p>
            {estimate.address_line1}, {estimate.city}
            {estimate.zip ? ` ${estimate.zip}` : ""}
          </p>
          <p style={{ fontSize: 12, color: "#9aa49d" }}>Estimator: {estimate.estimator?.full_name ?? "—"}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontWeight: 700, color: "var(--verde)" }}>{grandTotalNote}</p>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {STATUS_OPTIONS.map((status) => (
              <form key={status} action={setEstimateStatusAction.bind(null, estimate.id, status)}>
                <button
                  type="submit"
                  className="btn ghost"
                  disabled={estimate.status === status}
                  style={{ padding: "4px 12px", fontSize: 12 }}
                >
                  {ESTIMATE_STATUS_LABELS[status]}
                </button>
              </form>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24, padding: 22 }}>
        <h3>Home &amp; contact</h3>
        <p style={{ marginTop: 8 }}>
          {estimate.approx_sq_ft ? `${estimate.approx_sq_ft} sq ft · ` : ""}
          {estimate.bedrooms ?? "—"} bed / {estimate.bathrooms ?? "—"} bath
          {estimate.stories ? ` · ${estimate.stories} stories` : ""}
        </p>
        <p style={{ fontSize: 13, color: "#6a746c" }}>
          {estimate.has_pets ? "Pets" : "No pets"}
          {estimate.pets_notes ? ` (${estimate.pets_notes})` : ""}
          {estimate.has_alarm ? " · Alarm" : ""}
          {estimate.gate_code_needed ? " · Gate/lockbox code needed" : ""}
          {estimate.preferred_entry ? ` · Entry: ${estimate.preferred_entry}` : ""}
          {productLabel ? ` · Products: ${productLabel}` : ""}
        </p>
      </div>

      <div className="card" style={{ marginTop: 16, padding: 22 }}>
        <h3>Condition at walkthrough</h3>
        <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
          {conditionEntries.map((c) => (
            <p key={c.label} style={{ fontSize: 13 }}>
              {c.label}: {c.value ?? "—"}
              {c.value ? "/5" : ""}
            </p>
          ))}
        </div>
        {estimate.condition_notes && <p style={{ fontSize: 13, marginTop: 10 }}>{estimate.condition_notes}</p>}
      </div>

      <div className="card" style={{ marginTop: 16, padding: 22 }}>
        <h3>Estimate worksheet</h3>
        {estimate.plan ? (
          <p style={{ marginTop: 8 }}>
            <strong>{estimate.plan.name}</strong> — {formatCents(estimate.plan.monthly_price_cents)}/mo
            {estimate.size_adjustment_cents > 0 && ` + ${formatCents(estimate.size_adjustment_cents)} size adjustment`}
            {estimate.onboarding_deep_clean &&
              ` + ${formatCents(estimate.onboarding_deep_clean_cents)} onboarding deep clean`}
          </p>
        ) : (
          <p style={{ marginTop: 8, color: "#6a746c" }}>No membership selected.</p>
        )}
        {estimate.monthly_total_cents > 0 && (
          <p style={{ fontWeight: 700, color: "var(--verde)" }}>
            Monthly total: {formatCents(estimate.monthly_total_cents)}
          </p>
        )}

        {oneTimeLines.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--verde)" }}>
              One-time / add-ons
            </p>
            <div style={{ marginTop: 6, display: "grid", gap: 3 }}>
              {oneTimeLines.map((line) => (
                <p key={line.service_id} style={{ fontSize: 13 }}>
                  {line.name} × {line.qty} — {formatCents(line.total_cents)}
                </p>
              ))}
            </div>
            <p style={{ fontWeight: 700, color: "var(--verde)", marginTop: 6 }}>
              One-time total: {formatCents(estimate.one_time_total_cents)}
            </p>
          </div>
        )}

        <p style={{ fontSize: 13, marginTop: 14, color: "#6a746c" }}>
          {estimate.preferred_days.length > 0 ? estimate.preferred_days.join(", ") : "No day preference"}
          {estimate.preferred_window ? ` · ${WINDOW_LABELS[estimate.preferred_window]}` : ""}
          {estimate.target_start_date ? ` · Target start ${estimate.target_start_date}` : ""}
        </p>
      </div>

      <div className="card" style={{ marginTop: 16, padding: 22 }}>
        <h3>Scope acknowledgment</h3>
        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          {ACK_TERMS.map((term) => (
            <p key={term.key} style={{ fontSize: 12, color: estimate[term.key] ? "var(--verde)" : "#9aa49d" }}>
              {estimate[term.key] ? "✓" : "—"} {term.text}
            </p>
          ))}
        </div>
        {estimate.customer_signature ? (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 12, color: "#9aa49d", marginBottom: 6 }}>
              Signed{" "}
              {estimate.customer_signed_at &&
                new Date(estimate.customer_signed_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
            </p>
            <Image
              src={estimate.customer_signature}
              alt="Customer signature"
              width={280}
              height={90}
              unoptimized
              style={{ border: "1.5px solid var(--line)", borderRadius: 10, background: "#fff" }}
            />
          </div>
        ) : (
          <p style={{ marginTop: 10, color: "#9aa49d" }}>No signature captured.</p>
        )}
        {estimate.notes && (
          <p style={{ fontSize: 13, marginTop: 14, color: "#6a746c" }}>Notes: {estimate.notes}</p>
        )}
      </div>
    </div>
  );
}
