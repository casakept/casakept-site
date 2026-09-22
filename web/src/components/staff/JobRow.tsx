"use client";

import { useState, useTransition } from "react";
import { advanceBookingStatusAction } from "@/lib/actions/staff-bookings";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import { PRODUCT_CATEGORY_LABELS, type ProductCategory } from "@/lib/productCategories";
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
  product_selections: { category: string; product: { name: string } | null }[];
};

const NEXT_ACTION_LABEL: Partial<Record<BookingStatus, string>> = {
  confirmed: "Start visit",
  assigned: "Start visit",
  in_progress: "Mark complete",
};

export default function JobRow({
  job,
  staffId,
  checklistItems,
  rotationZone,
}: {
  job: StaffJob;
  staffId: string;
  checklistItems: ChecklistCatalogItem[];
  rotationZone?: "kitchen_bath" | "bed_living" | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const actionLabel = NEXT_ACTION_LABEL[job.status];
  const showChecklist = job.status === "in_progress" && CHECKLIST_SERVICE_TYPES.includes(job.service_type);

  // Geolocation has to be requested client-side before the server action
  // runs -- captures the check-in (starting) or check-out (finishing)
  // timestamp as part of the same click as advancing the job, so it can't
  // be skipped the way a separate "Check in" button could be. Denied/
  // unavailable location still proceeds with coords: null rather than
  // blocking the job -- see advanceBookingStatusAction.
  function handleAdvance() {
    setError(null);
    function run(coords: { lat: number; lng: number } | null) {
      startTransition(async () => {
        const result = await advanceBookingStatusAction(job.id, job.status, staffId, coords);
        if (result.error) setError(result.error);
      });
    }
    if (!navigator.geolocation) {
      run(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => run({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => run(null)
    );
  }

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
          {job.product_selections.length > 0 && (
            <p style={{ fontSize: 12, color: "#9aa49d" }}>
              {job.product_selections
                .filter((s) => s.product)
                .map((s) => `${PRODUCT_CATEGORY_LABELS[s.category as ProductCategory] ?? s.category}: ${s.product!.name}`)
                .join(" · ")}
            </p>
          )}
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
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn ghost"
            type="button"
            onClick={handleAdvance}
            disabled={pending}
            style={{ padding: "6px 16px", fontSize: 13 }}
          >
            {pending ? "Saving…" : actionLabel}
          </button>
          {error && (
            <span className="form-msg error" style={{ margin: 0, padding: "6px 12px" }}>
              {error}
            </span>
          )}
        </div>
      )}

      {job.checkin?.check_in_at && (
        <p style={{ marginTop: 10, fontSize: 12, color: "#9aa49d" }}>
          In: {new Date(job.checkin.check_in_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          {job.checkin.check_out_at &&
            ` · Out: ${new Date(job.checkin.check_out_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
        </p>
      )}

      {showChecklist && (
        <ChecklistSection
          bookingId={job.id}
          staffId={staffId}
          items={checklistItems}
          entries={job.checklist}
          isDeepClean={DEEP_CLEAN_SERVICE_TYPES.includes(job.service_type)}
          rotationZone={rotationZone}
        />
      )}
    </div>
  );
}
