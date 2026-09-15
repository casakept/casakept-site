import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EstimateRow, { type EstimateListItem } from "@/components/admin/EstimateRow";

export const metadata: Metadata = {
  title: "Admin · Estimates",
};

export default async function AdminEstimatesPage() {
  const supabase = await createClient();

  const { data: estimates } = await supabase
    .from("estimates")
    .select(
      `id, status, contact_name, city, monthly_total_cents, one_time_total_cents, created_at,
       estimator:profiles!estimates_estimator_id_fkey(full_name)`
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <p style={{ color: "#6a746c" }}>Walkthrough estimates, most recent first.</p>
        <Link className="btn" href="/admin/estimates/new">
          New estimate
        </Link>
      </div>

      {!estimates || estimates.length === 0 ? (
        <p style={{ marginTop: 20, color: "#6a746c" }}>No estimates yet.</p>
      ) : (
        <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
          {estimates.map((e) => (
            <EstimateRow key={e.id} estimate={e as EstimateListItem} />
          ))}
        </div>
      )}
    </div>
  );
}
