import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BONUS_LABELS } from "@/lib/loyaltyBonuses";

export const metadata: Metadata = {
  title: "Staff · My bonuses",
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export default async function StaffBonusesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No related_staff name here (unlike the admin view) -- profiles RLS has
  // no staff-to-staff read policy, only staff-sees-own-assigned-customers
  // and admin-sees-all, so a referrer can't look up the referred hire's
  // profile this way. The bonus type/amount alone still convey what's owed.
  const { data: bonuses } = await supabase
    .from("staff_bonuses")
    .select("id, bonus_type, period_label, amount_cents, computed_at, paid, paid_at")
    .eq("staff_id", user!.id)
    .order("paid", { ascending: true })
    .order("computed_at", { ascending: false });

  const owedCents = (bonuses ?? []).filter((b) => !b.paid).reduce((sum, b) => sum + b.amount_cents, 0);

  return (
    <div>
      <p style={{ color: "#6a746c", marginBottom: 20 }}>
        Loyalty &amp; retention bonuses from the Crew Performance Scorecard -- 90-day, anniversary, household
        retention, Crew of the Month, and referrals. These are informational until an admin marks them paid.
      </p>

      <div className="stat-row">
        <div className="stat">
          <div className="n">{formatCents(owedCents)}</div>
          <div className="l">Owed right now</div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        {!bonuses || bonuses.length === 0 ? (
          <p style={{ color: "#6a746c" }}>No loyalty bonuses yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {bonuses.map((b) => (
              <div className="card" key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <strong style={{ color: "var(--verde)" }}>{BONUS_LABELS[b.bonus_type]}</strong>{" "}
                  <span className={`status-badge ${b.paid ? "completed" : "confirmed"}`}>{b.paid ? "Paid" : "Owed"}</span>
                  {b.period_label && <p>{b.period_label}</p>}
                  <p style={{ fontSize: 12, color: "#9aa49d" }}>
                    Computed {new Date(b.computed_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    {b.paid_at && ` · Paid ${new Date(b.paid_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                </div>
                <span style={{ fontWeight: 700, color: "var(--verde)", fontSize: 16 }}>{formatCents(b.amount_cents)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
