"use client";

import { useActionState } from "react";
import { advanceBookingStatusAction, type StaffBookingActionState } from "@/lib/actions/staff-bookings";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import CheckInButton from "./CheckInButton";
import ChecklistSection, { type ChecklistCatalogItem, type ChecklistEntry } from "./ChecklistSection";
import type { Database } from "@/lib/supabase/database.types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type ServiceType = Database["public"]["Enums"]["service_type"];

// Only these service types are "cleaning visits" that get a quality
// checklist at all -- add-ons like laundry/grocery/errand don't.
const CHECKLIST_SERVICE_TYPES: ServiceType[] = ["standard_clean", "deep_clean", "move_out_clean"];
const DEEP_CLEAN_SERVICE_TYPES: ServiceType[] = ["deep_clean", "move_out_clean"];

export type StaffJob = {
  id: string;
  status: BookingStatus;
  scheduled_date: string;
  time_window: Database["public"]["Enums"]["schedule_window"];
  service_type: ServiceType;
  notes: string | null;
  customer: { full_name: string | null; phone: string | null } | null;
  property: { address_line1: string; city: string } | null;
  checkin: { check_in_at: string | null; check_out_at: string | null } | null;
  checklist: ChecklistEntry[];
};

const NEXT_ACTION_LABEL: Partial<Record<BookingStatus, string>> = {
  confirmed: "Start visit",
  assigned: "Start visit",
  in_progress: "Mark complete",
};

const initialState: StaffBookingActionState = {};

export default function JobRow({
  job,
  staffId,
  checklistItems,
}: {
  job: StaffJob;
  staffId: string;
  checklistItems: ChecklistCatalogItem[];
}) {
  const action = advanceBookingStatusAction.bind(null, job.id, job.status);
  const [state, formAction, pending] = useActionState(action, initialState);
  const actionLabel = NEXT_ACTION_LABEL[job.status];
  const showCheckins = job.status !== "cancelled";
  const showChecklist = job.status === "in_progress" && CHECKLIST_SERVICE_TYPES.includes(job.service_type);

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

      {showCheckins && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {!job.checkin?.check_in_at && (
            <CheckInButton bookingId={job.id} staffId={staffId} type="check_in" label="Check in" />
          )}
          {job.checkin?.check_in_at && !job.checkin?.check_out_at && (
            <CheckInButton bookingId={job.id} staffId={staffId} type="check_out" label="Check out" />
          )}
          {job.checkin?.check_in_at && (
            <span style={{ fontSize: 12, color: "#9aa49d" }}>
              In: {new Date(job.checkin.check_in_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              {job.checkin.check_out_at &&
                ` · Out: ${new Date(job.checkin.check_out_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
            </span>
          )}
        </div>
      )}

      {showChecklist && (
        <ChecklistSection
          bookingId={job.id}
          staffId={staffId}
          items={checklistItems}
          entries={job.checklist}
          isDeepClean={DEEP_CLEAN_SERVICE_TYPES.includes(job.service_type)}
        />
      )}
    </div>
  );
}
