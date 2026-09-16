import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import BonusRow, { type AdminBonus } from "@/components/admin/BonusRow";

export const metadata: Metadata = {
  title: "Admin · Bonuses",
};

export default async function AdminBonusesPage() {
  const supabase = await createClient();

  const { data: bonuses } = await supabase
    .from("staff_bonuses")
    .select(
      `id, bonus_type, period_label, amount_cents, computed_at, paid, paid_at,
       staff:staff!staff_bonuses_staff_id_fkey(profile:profiles!staff_id_fkey(full_name)),
       related_staff:staff!staff_bonuses_related_staff_id_fkey(profile:profiles!staff_id_fkey(full_name))`
    )
    .order("paid", { ascending: true })
    .order("computed_at", { ascending: false });

  const owed = (bonuses ?? []).filter((b) => !b.paid);
  const paid = (bonuses ?? []).filter((b) => b.paid);

  return (
    <div>
      <p style={{ color: "#6a746c", marginBottom: 20 }}>
        Loyalty &amp; retention bonuses from the Crew Performance Scorecard, computed automatically overnight.
        Payroll stays informational-only here -- mark a bonus paid once you&apos;ve handled it outside the app.
      </p>

      <h3>Owed</h3>
      {owed.length === 0 ? (
        <p style={{ marginTop: 10, color: "#6a746c" }}>Nothing owed right now.</p>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {owed.map((b) => (
            <BonusRow key={b.id} bonus={b as AdminBonus} />
          ))}
        </div>
      )}

      {paid.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h3>Paid</h3>
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {paid.map((b) => (
              <BonusRow key={b.id} bonus={b as AdminBonus} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
