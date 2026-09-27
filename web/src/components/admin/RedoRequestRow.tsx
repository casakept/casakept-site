"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  scheduleRedoAction,
  resolveRedoRequestAction,
  denyRedoRequestAction,
  markVisitCallbackAction,
  type AdminRedoActionState,
} from "@/lib/actions/admin-redo-requests";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import type { Database } from "@/lib/supabase/database.types";

export type RedoRequestRowData = {
  id: string;
  bookingId: string;
  kind: Database["public"]["Enums"]["redo_request_kind"];
  status: Database["public"]["Enums"]["redo_request_status"];
  description: string;
  photoUrl: string | null;
  reportedAt: string;
  dueBy: string | null;
  resolvedAt: string | null;
  adminNotes: string | null;
  redoBookingId: string | null;
  flaggedItems: { name: string; crewPhotoUrl: string | null }[];
  booking: {
    serviceType: Database["public"]["Enums"]["service_type"];
    scheduledDate: string;
    timeWindow: Database["public"]["Enums"]["schedule_window"];
    customerName: string;
    staffName: string | null;
    assignedStaffId: string | null;
  };
};

const initialState: AdminRedoActionState = {};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Module-level, not inline in the component body -- see the same note in
// survey/[token]/page.tsx.
function isOverdue(dueBy: string | null): boolean {
  return !!dueBy && new Date(dueBy).getTime() < Date.now();
}

function PhotoThumb({ url, alt }: { url: string; alt: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Image
        src={url}
        alt={alt}
        width={80}
        height={80}
        unoptimized
        style={{ objectFit: "cover", borderRadius: 8, border: "1.5px solid var(--line)" }}
      />
    </a>
  );
}

export default function RedoRequestRow({
  request,
  staffOptions,
}: {
  request: RedoRequestRowData;
  staffOptions: { id: string; name: string }[];
}) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [showDeny, setShowDeny] = useState(false);
  const [callbackState, setCallbackState] = useState<{ error?: string; success?: boolean } | null>(null);
  const [callbackPending, setCallbackPending] = useState(false);

  const scheduleAction = scheduleRedoAction.bind(null, request.id);
  const [scheduleState, scheduleFormAction, schedulePending] = useActionState(scheduleAction, initialState);
  const resolveAction = resolveRedoRequestAction.bind(null, request.id);
  const [resolveState, resolveFormAction, resolvePending] = useActionState(resolveAction, initialState);
  const denyAction = denyRedoRequestAction.bind(null, request.id);
  const [denyState, denyFormAction, denyPending] = useActionState(denyAction, initialState);

  const overdue = request.status === "open" && isOverdue(request.dueBy);

  async function handleMarkCallback() {
    setCallbackPending(true);
    const result = await markVisitCallbackAction(request.bookingId);
    setCallbackState(result);
    setCallbackPending(false);
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <strong style={{ color: "var(--verde)" }}>
            {SERVICE_LABELS[request.booking.serviceType] ?? request.booking.serviceType}
          </strong>{" "}
          <span className={`status-badge ${request.kind === "redo" ? "assigned" : "pending"}`}>
            {request.kind === "redo" ? "Re-do" : "Damage"}
          </span>{" "}
          {overdue && <span className="status-badge pending">Overdue</span>}
          <p>
            {request.booking.customerName} · {request.booking.staffName ?? "Unassigned"}
          </p>
          <p style={{ fontSize: 12, color: "#9aa49d" }}>
            {new Date(`${request.booking.scheduledDate}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}{" "}
            · {WINDOW_LABELS[request.booking.timeWindow] ?? request.booking.timeWindow}
          </p>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "#9aa49d" }}>
          <p>Reported {formatDateTime(request.reportedAt)}</p>
          {request.dueBy && (
            <p style={{ color: overdue ? "var(--chile)" : "#9aa49d", fontWeight: overdue ? 700 : 400 }}>
              Due {formatDateTime(request.dueBy)}
            </p>
          )}
        </div>
      </div>

      <p style={{ marginTop: 10, fontSize: 14 }}>{request.description}</p>

      {request.flaggedItems.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {request.flaggedItems.map((item, i) => (
            <div key={i}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--verde)" }}>{item.name}</p>
              <p style={{ fontSize: 11, color: "#9aa49d", marginTop: 2 }}>Crew&apos;s photo for this item:</p>
              {item.crewPhotoUrl ? (
                <div style={{ marginTop: 4 }}>
                  <PhotoThumb url={item.crewPhotoUrl} alt={`Crew photo: ${item.name}`} />
                </div>
              ) : (
                <p style={{ fontSize: 11, color: "#9aa49d", fontStyle: "italic", marginTop: 4 }}>No photo on file</p>
              )}
            </div>
          ))}
        </div>
      )}

      {request.photoUrl && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 11, color: "#9aa49d" }}>Customer&apos;s photo:</p>
          <div style={{ marginTop: 4 }}>
            <PhotoThumb url={request.photoUrl} alt="Customer report photo" />
          </div>
        </div>
      )}

      {request.status === "open" && (
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {request.kind === "redo" && !showSchedule && (
            <button
              className="btn ghost"
              type="button"
              onClick={() => setShowSchedule(true)}
              style={{ padding: "6px 16px", fontSize: 13 }}
            >
              Schedule re-do
            </button>
          )}
          {request.kind === "damage" && (
            <form action={resolveFormAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="text" name="admin_notes" placeholder="Resolution notes (optional)" style={{ fontSize: 13 }} />
              <button
                className="btn ghost"
                type="submit"
                disabled={resolvePending}
                style={{ padding: "6px 16px", fontSize: 13 }}
              >
                {resolvePending ? "Saving…" : "Mark resolved"}
              </button>
            </form>
          )}
          {!showDeny && (
            <button
              className="btn ghost"
              type="button"
              onClick={() => setShowDeny(true)}
              style={{ padding: "6px 16px", fontSize: 13 }}
            >
              Deny
            </button>
          )}
          {resolveState.error && (
            <span className="form-msg error" style={{ margin: 0 }}>
              {resolveState.error}
            </span>
          )}
        </div>
      )}

      {showSchedule && request.status === "open" && (
        <form
          action={scheduleFormAction}
          style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
        >
          <input type="date" name="scheduled_date" required />
          <select name="time_window" required defaultValue="">
            <option value="" disabled>
              Time window
            </option>
            <option value="morning">Morning</option>
            <option value="midday">Midday</option>
            <option value="afternoon">Afternoon</option>
          </select>
          <select name="assigned_staff_id" defaultValue={request.booking.assignedStaffId ?? ""}>
            <option value="">Unassigned</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button className="btn" type="submit" disabled={schedulePending} style={{ padding: "6px 16px", fontSize: 13 }}>
            {schedulePending ? "Scheduling…" : "Confirm"}
          </button>
          {scheduleState.error && (
            <span className="form-msg error" style={{ margin: 0 }}>
              {scheduleState.error}
            </span>
          )}
        </form>
      )}

      {showDeny && request.status === "open" && (
        <form
          action={denyFormAction}
          style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
        >
          <input type="text" name="admin_notes" placeholder="Reason for denying" required style={{ fontSize: 13, minWidth: 220 }} />
          <button className="btn ghost" type="submit" disabled={denyPending} style={{ padding: "6px 16px", fontSize: 13 }}>
            {denyPending ? "Saving…" : "Confirm deny"}
          </button>
          {denyState.error && (
            <span className="form-msg error" style={{ margin: 0 }}>
              {denyState.error}
            </span>
          )}
        </form>
      )}

      {request.status === "scheduled" && (
        <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="status-badge assigned">Re-do scheduled</span>
          {request.redoBookingId && (
            <Link href="/admin/bookings" style={{ fontSize: 13 }}>
              View in bookings →
            </Link>
          )}
          <form action={resolveFormAction}>
            <button className="btn ghost" type="submit" disabled={resolvePending} style={{ padding: "6px 16px", fontSize: 13 }}>
              {resolvePending ? "Saving…" : "Mark resolved"}
            </button>
          </form>
          <button
            className="btn ghost"
            type="button"
            onClick={handleMarkCallback}
            disabled={callbackPending}
            style={{ padding: "6px 16px", fontSize: 13 }}
          >
            {callbackPending ? "Saving…" : "Flag as re-clean callback on scorecard"}
          </button>
          {callbackState?.error && (
            <span className="form-msg error" style={{ margin: 0 }}>
              {callbackState.error}
            </span>
          )}
          {callbackState?.success && (
            <span className="form-msg" style={{ margin: 0 }}>
              Scorecard updated.
            </span>
          )}
        </div>
      )}

      {(request.status === "resolved" || request.status === "denied") && (
        <div style={{ marginTop: 12 }}>
          <span className={`status-badge ${request.status === "resolved" ? "completed" : "cancelled"}`}>
            {request.status === "resolved" ? "Resolved" : "Denied"}
          </span>
          {request.adminNotes && <p style={{ fontSize: 13, marginTop: 6 }}>{request.adminNotes}</p>}
          {request.resolvedAt && (
            <p style={{ fontSize: 11, color: "#9aa49d", marginTop: 4 }}>{formatDateTime(request.resolvedAt)}</p>
          )}
        </div>
      )}
    </div>
  );
}
