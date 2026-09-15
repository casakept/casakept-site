import Link from "next/link";
import { ESTIMATE_STATUS_LABELS, formatCents } from "@/lib/estimateForm";
import type { Database } from "@/lib/supabase/database.types";

export type EstimateListItem = {
  id: string;
  status: Database["public"]["Enums"]["estimate_status"];
  contact_name: string;
  city: string;
  monthly_total_cents: number;
  one_time_total_cents: number;
  created_at: string;
  estimator: { full_name: string | null } | null;
};

const STATUS_BADGE: Record<Database["public"]["Enums"]["estimate_status"], string> = {
  draft: "pending",
  sent: "assigned",
  converted: "confirmed",
  declined: "cancelled",
};

export default function EstimateRow({ estimate }: { estimate: EstimateListItem }) {
  return (
    <Link
      href={`/admin/estimates/${estimate.id}`}
      className="card"
      style={{ display: "block", textDecoration: "none" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <strong style={{ color: "var(--verde)" }}>{estimate.contact_name}</strong>{" "}
          <span className={`status-badge ${STATUS_BADGE[estimate.status]}`}>
            {ESTIMATE_STATUS_LABELS[estimate.status]}
          </span>
          <p>{estimate.city}</p>
          <p style={{ fontSize: 12, color: "#9aa49d" }}>Estimator: {estimate.estimator?.full_name ?? "—"}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          {estimate.monthly_total_cents > 0 && (
            <p style={{ fontWeight: 700, color: "var(--verde)" }}>{formatCents(estimate.monthly_total_cents)}/mo</p>
          )}
          {estimate.one_time_total_cents > 0 && <p>{formatCents(estimate.one_time_total_cents)} one-time</p>}
          <p style={{ fontSize: 12, color: "#9aa49d" }}>
            {new Date(estimate.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </Link>
  );
}
