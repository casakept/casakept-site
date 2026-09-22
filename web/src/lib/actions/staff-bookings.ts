"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type StaffBookingActionState = {
  error?: string;
  success?: boolean;
};

type BookingStatus = Database["public"]["Enums"]["booking_status"];

// Staff can only move a job forward along a fixed set of transitions -- no
// arbitrary status changes and no reassigning. The bookings_update_assigned_staff
// RLS policy (USING assigned_staff_id = auth.uid(), no separate WITH CHECK)
// is the real ownership gate; this Set is just to keep staff from jumping to
// e.g. "cancelled" or "pending" which are admin-only actions.
const ALLOWED_TRANSITIONS: Record<string, BookingStatus> = {
  confirmed: "in_progress",
  assigned: "in_progress",
  in_progress: "completed",
};

// Folds check-in/check-out into the same action as starting/finishing a
// visit. Previously these were separate, unlinked buttons -- a cleaner
// could start or complete a job without ever recording a time, which
// defeated the point of tracking visit duration. Coordinates are
// best-effort: geolocation runs client-side before this is called, and a
// denial or unavailable API still passes through as null rather than
// blocking the transition -- the timestamp is what actually matters for
// time tracking, the GPS pin is supplementary.
export async function advanceBookingStatusAction(
  bookingId: string,
  currentStatus: BookingStatus,
  staffId: string,
  coords: { lat: number; lng: number } | null
): Promise<StaffBookingActionState> {
  const nextStatus = ALLOWED_TRANSITIONS[currentStatus];
  if (!nextStatus) {
    return { error: "That job can't be advanced from its current status." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: nextStatus })
    .eq("id", bookingId)
    .eq("status", currentStatus)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "This job was already updated elsewhere. Refresh and try again." };

  // Only record the checkin once the transition actually happened, so a
  // no-op double-click doesn't leave a stray timestamp behind. Best-effort:
  // a failure here shouldn't undo or block a status change that already
  // succeeded and is the real source of truth.
  const isStarting = nextStatus === "in_progress";
  const checkinPatch = isStarting
    ? {
        check_in_at: new Date().toISOString(),
        check_in_lat: coords?.lat ?? null,
        check_in_lng: coords?.lng ?? null,
      }
    : {
        check_out_at: new Date().toISOString(),
        check_out_lat: coords?.lat ?? null,
        check_out_lng: coords?.lng ?? null,
      };
  const { error: checkinError } = await supabase
    .from("visit_checkins")
    .upsert({ booking_id: bookingId, staff_id: staffId, ...checkinPatch }, { onConflict: "booking_id" });
  if (checkinError) console.error("advanceBookingStatusAction: checkin upsert failed", checkinError);

  revalidatePath("/staff/jobs");
  revalidatePath("/staff");
  return { success: true };
}
