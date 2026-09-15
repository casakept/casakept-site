"use client";

import { useActionState } from "react";
import { cancelBookingAction, type BookingActionState } from "@/lib/actions/bookings";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import type { Database } from "@/lib/supabase/database.types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

export type UpcomingBooking = {
  id: string;
  service_type: Database["public"]["Enums"]["service_type"];
  scheduled_date: string;
  time_window: Database["public"]["Enums"]["schedule_window"];
  status: BookingStatus;
  properties: { address_line1: string; city: string } | null;
};

const CANCELLABLE_STATUSES = new Set<BookingStatus>(["pending", "confirmed", "assigned"]);

const initialState: BookingActionState = {};

export default function BookingCard({ booking }: { booking: UpcomingBooking }) {
  const action = cancelBookingAction.bind(null, booking.id, booking.status);
  const [state, formAction, pending] = useActionState(action, initialState);
  const cancellable = !state.success && CANCELLABLE_STATUSES.has(booking.status);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <strong style={{ color: "var(--verde)" }}>
            {SERVICE_LABELS[booking.service_type] ?? booking.service_type}
          </strong>
          <p>
            {booking.properties?.address_line1}, {booking.properties?.city}
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
          <p>
            {WINDOW_LABELS[booking.time_window] ?? booking.time_window} ·{" "}
            {state.success ? "cancelled" : booking.status}
          </p>
        </div>
      </div>

      {cancellable && (
        <form action={formAction} style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn ghost" type="submit" disabled={pending} style={{ padding: "6px 16px", fontSize: 13 }}>
            {pending ? "Cancelling…" : "Cancel visit"}
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
