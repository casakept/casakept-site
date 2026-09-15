"use client";

import { useActionState } from "react";
import { scoreVisitAction, type ScoreVisitActionState } from "@/lib/actions/admin-scores";
import { SCORE_CATEGORIES } from "@/lib/visitScoring";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import type { Database } from "@/lib/supabase/database.types";

export type ScorableBooking = {
  id: string;
  service_type: Database["public"]["Enums"]["service_type"];
  scheduled_date: string;
  time_window: Database["public"]["Enums"]["schedule_window"];
  assigned_staff_id: string;
  staff: { profile: { full_name: string | null } | null } | null;
  customer: { full_name: string | null } | null;
  visit_score: {
    quality_score: number;
    customer_score: number;
    timeliness_score: number;
    professionalism_score: number;
    total_score: number | null;
    notes: string | null;
  } | null;
};

const initialState: ScoreVisitActionState = {};

export default function ScoreBookingRow({ booking }: { booking: ScorableBooking }) {
  const action = scoreVisitAction.bind(null, booking.id, booking.assigned_staff_id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const score = booking.visit_score;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <strong style={{ color: "var(--verde)" }}>
            {SERVICE_LABELS[booking.service_type] ?? booking.service_type}
          </strong>{" "}
          {score && (
            <span className="status-badge completed">Scored: {score.total_score}</span>
          )}
          <p>
            {booking.staff?.profile?.full_name ?? "Unassigned"} · {booking.customer?.full_name ?? "Customer"}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontWeight: 700, color: "var(--verde)" }}>
            {new Date(booking.scheduled_date + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          <p>{WINDOW_LABELS[booking.time_window] ?? booking.time_window}</p>
        </div>
      </div>

      <form action={formAction} style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {SCORE_CATEGORIES.map((category) => (
            <label key={category.key} style={{ fontSize: 12, color: "#6a746c" }}>
              {category.label} (0–{category.max})
              <input
                type="number"
                name={category.key}
                min={0}
                max={category.max}
                step={1}
                defaultValue={score?.[category.key] ?? ""}
                required
                style={{ display: "block", width: 90, marginTop: 4 }}
              />
            </label>
          ))}
        </div>
        <label style={{ display: "block", fontSize: 12, color: "#6a746c", marginTop: 10 }}>
          Notes
          <textarea
            name="notes"
            defaultValue={score?.notes ?? ""}
            rows={2}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <button className="btn ghost" type="submit" disabled={pending} style={{ padding: "6px 16px", fontSize: 13 }}>
            {pending ? "Saving…" : score ? "Update score" : "Save score"}
          </button>
          {state.error && (
            <span className="form-msg error" style={{ margin: 0, padding: "6px 12px" }}>
              {state.error}
            </span>
          )}
          {state.success && !state.error && (
            <span className="form-msg" style={{ margin: 0, padding: "6px 12px" }}>
              Saved.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
