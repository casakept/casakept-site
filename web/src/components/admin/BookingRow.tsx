"use client";

import { useActionState } from "react";
import { updateBookingAction, type AdminBookingActionState } from "@/lib/actions/admin-bookings";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import type { Database } from "@/lib/supabase/database.types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const initialState: AdminBookingActionState = {};

export type AdminBooking = {
  id: string;
  status: BookingStatus;
  scheduled_date: string;
  time_window: Database["public"]["Enums"]["schedule_window"];
  service_type: Database["public"]["Enums"]["service_type"];
  price_cents: number;
  notes: string | null;
  assigned_staff_id: string | null;
  customer: { full_name: string | null; phone: string | null } | null;
  property: { address_line1: string; city: string } | null;
  preferred_staff: { profile: { full_name: string | null } | null } | null;
};

export default function BookingRow({
  booking,
  staffOptions,
}: {
  booking: AdminBooking;
  staffOptions: { id: string; name: string }[];
}) {
  const action = updateBookingAction.bind(null, booking.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="card admin-booking-row">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <strong style={{ color: "var(--verde)" }}>
            {SERVICE_LABELS[booking.service_type] ?? booking.service_type}
          </strong>{" "}
          <span className={`status-badge ${booking.status}`}>{booking.status.replace("_", " ")}</span>
          <p>
            {booking.customer?.full_name ?? "Unknown customer"}
            {booking.customer?.phone ? ` · ${booking.customer.phone}` : ""}
          </p>
          <p>
            {booking.property?.address_line1}, {booking.property?.city}
          </p>
          {booking.preferred_staff?.profile?.full_name && (
            <p style={{ fontSize: 12, color: "#9aa49d" }}>
              Preferred: {booking.preferred_staff.profile.full_name}
            </p>
          )}
          {booking.notes && <p style={{ fontSize: 12, color: "#9aa49d" }}>{booking.notes}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontWeight: 700, color: "var(--verde)" }}>
            {new Date(booking.scheduled_date + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          <p>
            {WINDOW_LABELS[booking.time_window] ?? booking.time_window} · $
            {(booking.price_cents / 100).toFixed(0)}
          </p>
        </div>
      </div>

      <form
        action={formAction}
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 14 }}
      >
        <select name="status" defaultValue={booking.status}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select name="assigned_staff_id" defaultValue={booking.assigned_staff_id ?? ""}>
          <option value="">Unassigned</option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button className="btn ghost" type="submit" disabled={pending} style={{ padding: "6px 16px", fontSize: 13 }}>
          {pending ? "Saving…" : "Save"}
        </button>
        {state.error && (
          <span className="form-msg error" style={{ margin: 0, padding: "6px 12px" }}>
            {state.error}
          </span>
        )}
      </form>
    </div>
  );
}
