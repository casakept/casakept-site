"use client";

import { markBonusPaidAction } from "@/lib/actions/admin-bonuses";
import { BONUS_LABELS } from "@/lib/loyaltyBonuses";
import type { Database } from "@/lib/supabase/database.types";

export type AdminBonus = {
  id: string;
  bonus_type: Database["public"]["Enums"]["staff_bonus_type"];
  period_label: string | null;
  amount_cents: number;
  computed_at: string;
  paid: boolean;
  paid_at: string | null;
  staff: { profile: { full_name: string | null } | null } | null;
  related_staff: { profile: { full_name: string | null } | null } | null;
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function BonusRow({ bonus }: { bonus: AdminBonus }) {
  const action = markBonusPaidAction.bind(null, bonus.id, !bonus.paid);

  return (
    <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
      <div>
        <strong style={{ color: "var(--verde)" }}>{bonus.staff?.profile?.full_name ?? "Unknown staff"}</strong>{" "}
        <span className={`status-badge ${bonus.paid ? "completed" : "confirmed"}`}>
          {bonus.paid ? "Paid" : "Owed"}
        </span>
        <p>
          {BONUS_LABELS[bonus.bonus_type]}
          {bonus.period_label && ` · ${bonus.period_label}`}
          {bonus.bonus_type === "referral" && bonus.related_staff?.profile?.full_name &&
            ` · for referring ${bonus.related_staff.profile.full_name}`}
        </p>
        <p style={{ fontSize: 12, color: "#9aa49d" }}>
          Computed {new Date(bonus.computed_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          {bonus.paid_at && ` · Paid ${new Date(bonus.paid_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontWeight: 700, color: "var(--verde)", fontSize: 16 }}>{formatCents(bonus.amount_cents)}</span>
        <form action={action}>
          <button type="submit" className="btn ghost" style={{ padding: "6px 16px", fontSize: 13 }}>
            {bonus.paid ? "Mark unpaid" : "Mark paid"}
          </button>
        </form>
      </div>
    </div>
  );
}
