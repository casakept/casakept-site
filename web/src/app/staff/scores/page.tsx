import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import { SCORE_CATEGORIES, VISIT_SCORE_EVENTS, bonusForVisit } from "@/lib/visitScoring";

export const metadata: Metadata = {
  title: "Staff · My scores",
};

export default async function StaffScoresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // visit_scores_select_own RLS (staff_id = auth.uid()) is the real gate --
  // this is the same table/columns the admin scorecard reads, just scoped
  // to the caller's own visits so a cleaner can see exactly how each score
  // broke down and whatever notes the admin left, not just the total.
  const { data: scores } = await supabase
    .from("visit_scores")
    .select(
      `id, quality_score, customer_score, timeliness_score, professionalism_score, total_score, notes, event_type, created_at,
       booking:bookings(service_type, scheduled_date, time_window)`
    )
    .eq("staff_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <p style={{ color: "#6a746c", marginBottom: 20 }}>
        Your scored visits, most recent first -- the full breakdown against the Crew Performance Scorecard, plus
        any notes left when it was scored.
      </p>

      {!scores || scores.length === 0 ? (
        <p style={{ color: "#6a746c" }}>No scored visits yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {scores.map((s) => {
            const event = VISIT_SCORE_EVENTS.find((e) => e.value === s.event_type);
            const bonus = bonusForVisit(s.total_score ?? 0, s.event_type);
            return (
              <div className="card" key={s.id}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <strong style={{ color: "var(--verde)" }}>
                      {s.booking ? SERVICE_LABELS[s.booking.service_type] ?? s.booking.service_type : "Visit"}
                    </strong>{" "}
                    <span className="status-badge completed">Scored: {s.total_score}/100</span>
                    {s.booking && (
                      <p>
                        {new Date(`${s.booking.scheduled_date}T00:00:00`).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {WINDOW_LABELS[s.booking.time_window] ?? s.booking.time_window}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontWeight: 700, color: "var(--verde)" }}>{bonus.label}</p>
                    <p>{bonus.bonusCentsPerVisit > 0 ? `+$${(bonus.bonusCentsPerVisit / 100).toFixed(0)}` : "No bonus"}</p>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  {SCORE_CATEGORIES.map((category) => (
                    <div key={category.key} style={{ padding: "8px 12px", background: "var(--sand)", borderRadius: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <strong style={{ fontSize: 13, color: "var(--verde)" }}>{category.label}</strong>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>
                          {s[category.key]}/{category.max}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "#4a5450", marginTop: 4 }}>{category.criteria}</p>
                    </div>
                  ))}
                </div>

                {event && s.event_type !== "none" && (
                  <p style={{ marginTop: 10, fontSize: 13, color: "#c0392b" }}>{event.label} -- no bonus this visit.</p>
                )}

                {s.notes && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--verde)" }}>
                      Notes from your reviewer
                    </p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>{s.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
