"use client";

import { useActionState } from "react";
import { advanceBookingStatusAction, type StaffBookingActionState } from "@/lib/actions/staff-bookings";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import type { Database } from "@/lib/supabase/database.types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

export type StaffJob = {
  id: string;
  status: BookingStatus;
  scheduled_date: string;
  time_window: Database["public"]["Enums"]["schedule_window"];
  service_type: Database["public"]["Enums"]["service_type"];
  notes: string | null;
  customer: { full_name: string | null; phone: string | null } | null;
  property: { address_line1: string; city: string } | null;
};

const NEXT_ACTION_LABEL: Partial<Record<BookingStatus, string>> = {
  confirmed: "Start visit",
  assigned: "Start visit",
  in_progress: "Mark complete",
};

const initialState: StaffBookingActionState = {};

export default function JobRow({ job }: { job: StaffJob }) {
  const action = advanceBookingStatusAction.bind(null, job.id, job.status);
  const [state, formAction, pending] = useActionState(action, initialState);
  const actionLabel = NEXT_ACTION_LABEL[job.status];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <strong style={{ color: "var(--verde)" }}>
            {SERVICE_LABELS[job.service_type] ?? job.service_type}
          </strong>{" "}
          <span className={`status-badge ${job.status}`}>{job.status.replace("_", " ")}</span>
          <p>
            {job.customer?.full_name ?? "Customer"}
            {job.customer?.phone ? ` · ${job.customer.phone}` : ""}
          </p>
          <p>
            {job.property?.address_line1}, {job.property?.city}
          </p>
          {job.notes && <p style={{ fontSize: 12, color: "#9aa49d" }}>{job.notes}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontWeight: 700, color: "var(--verde)" }}>
            {new Date(job.scheduled_date + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          <p>{WINDOW_LABELS[job.time_window] ?? job.time_window}</p>
        </div>
      </div>

      {actionLabel && (
        <form action={formAction} style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn ghost" type="submit" disabled={pending} style={{ padding: "6px 16px", fontSize: 13 }}>
            {pending ? "Saving…" : actionLabel}
          </button>
          {state.error && (
            <span className="form-msg error" style={{ margin: 0, padding: "6px 12px" }}>
              {state.error}
            </span>
          )}
        </form>
      )}
    </div>
  );
}
