"use client";

import Image from "next/image";
import { useActionState } from "react";
import { scoreVisitAction, type ScoreVisitActionState } from "@/lib/actions/admin-scores";
import { SCORE_CATEGORIES, VISIT_SCORE_EVENTS } from "@/lib/visitScoring";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import { ROTATION_ZONE_LABELS, type RotationZone } from "@/components/staff/ChecklistSection";
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
    event_type: Database["public"]["Enums"]["visit_score_event"];
  } | null;
  visit_checkin: { check_in_at: string | null; check_out_at: string | null } | null;
  checklist: {
    completed: boolean;
    photo_path: string | null;
    photo_url: string | null;
    item: { name: string; rotation_zone: string | null } | null;
  }[];
  csat: { rating: number | null; comment: string | null; responded_at: string | null } | null;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const initialState: ScoreVisitActionState = {};

export default function ScoreBookingRow({ booking }: { booking: ScorableBooking }) {
  const action = scoreVisitAction.bind(null, booking.id, booking.assigned_staff_id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const score = booking.visit_score;
  // Standard Clean rotation: any entry whose item carries a rotation_zone
  // tells us which zone applied to this visit (see ChecklistSection.tsx).
  const rotationZone = booking.checklist.find((c) => c.item?.rotation_zone)?.item?.rotation_zone as
    | RotationZone
    | undefined;

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

      {booking.visit_checkin?.check_in_at && (
        <p style={{ fontSize: 12, color: "#9aa49d", marginTop: 6 }}>
          Checked in: {formatTime(booking.visit_checkin.check_in_at)}
          {booking.visit_checkin.check_out_at && ` · Checked out: ${formatTime(booking.visit_checkin.check_out_at)}`}
        </p>
      )}

      {booking.checklist.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 12, color: "#9aa49d" }}>
            Checklist: {booking.checklist.filter((c) => c.completed).length}/{booking.checklist.length} completed
            -- evidence for your Quality score below, not an automatic calculation.
            {rotationZone && ` Detail zone: ${ROTATION_ZONE_LABELS[rotationZone]}.`}
          </p>
          {booking.checklist.some((c) => c.photo_url) && (
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {booking.checklist
                .filter((c) => c.photo_url)
                .map((c, i) => (
                  <Image
                    key={i}
                    src={c.photo_url!}
                    alt={c.item?.name ?? "Checklist photo"}
                    title={c.item?.name ?? undefined}
                    width={72}
                    height={72}
                    unoptimized
                    style={{ objectFit: "cover", borderRadius: 8, border: "1.5px solid var(--line)" }}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {booking.csat?.responded_at && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 12, color: "#9aa49d" }}>
            CSAT: {booking.csat.rating}/5 -- evidence for your Customer score below, not an automatic calculation.
            {booking.csat.comment && ` "${booking.csat.comment}"`}
          </p>
        </div>
      )}

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
          Score event (forces bonus to $0 if not &quot;None&quot;)
          <select
            name="event_type"
            defaultValue={score?.event_type ?? "none"}
            style={{ display: "block", width: 220, marginTop: 4 }}
          >
            {VISIT_SCORE_EVENTS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
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
