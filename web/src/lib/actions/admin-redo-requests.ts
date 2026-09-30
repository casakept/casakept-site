"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminRedoActionState = {
  error?: string;
  success?: boolean;
};

const SCHEDULE_WINDOWS = new Set(["morning", "midday", "afternoon"]);

// No explicit role check -- redo_requests_all_admin and bookings_all_admin
// RLS are the real gate, same pattern as the rest of the admin actions.
//
// Creates the $0 follow-up visit directly (not through createBookingAction,
// which is shaped for a paying customer picking their own slot/products/
// entitlements) -- this is an admin-initiated make-good, so it skips
// payment, entitlement claims, and the availability recheck entirely.
export async function scheduleRedoAction(
  redoRequestId: string,
  _prevState: AdminRedoActionState,
  formData: FormData
): Promise<AdminRedoActionState> {
  const scheduledDate = String(formData.get("scheduled_date") ?? "");
  const timeWindow = String(formData.get("time_window") ?? "");
  const assignedStaffId = String(formData.get("assigned_staff_id") ?? "") || null;

  if (!scheduledDate || !SCHEDULE_WINDOWS.has(timeWindow)) {
    return { error: "Choose a date and time window." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: redoRequest } = await supabase
    .from("redo_requests")
    .select("id, status, booking_id, customer_id")
    .eq("id", redoRequestId)
    .maybeSingle();
  if (!redoRequest) return { error: "That request no longer exists." };
  if (redoRequest.status !== "open") return { error: "That request has already been handled." };

  const { data: originalBooking } = await supabase
    .from("bookings")
    .select("property_id, service_type, service_id")
    .eq("id", redoRequest.booking_id)
    .maybeSingle();
  if (!originalBooking) return { error: "The original visit no longer exists." };

  const { data: newBooking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      customer_id: redoRequest.customer_id,
      property_id: originalBooking.property_id,
      service_type: originalBooking.service_type,
      service_id: originalBooking.service_id,
      scheduled_date: scheduledDate,
      time_window: timeWindow as Database["public"]["Enums"]["schedule_window"],
      assigned_staff_id: assignedStaffId,
      status: "confirmed",
      price_cents: 0,
      covered_by_entitlement: false,
      notes: "Re-do visit -- no charge.",
      redo_of_booking_id: redoRequest.booking_id,
    })
    .select("id")
    .single();
  if (bookingError || !newBooking) return { error: bookingError?.message ?? "Couldn't create the re-do visit." };

  const { error: updateError } = await supabase
    .from("redo_requests")
    .update({ status: "scheduled", redo_booking_id: newBooking.id })
    .eq("id", redoRequestId);
  if (updateError) return { error: updateError.message };

  revalidatePath("/admin/redo-requests");
  revalidatePath("/admin/bookings");
  return { success: true };
}

export async function resolveRedoRequestAction(
  redoRequestId: string,
  _prevState: AdminRedoActionState,
  formData: FormData
): Promise<AdminRedoActionState> {
  const adminNotes = String(formData.get("admin_notes") ?? "").trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase
    .from("redo_requests")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user.id, admin_notes: adminNotes })
    .eq("id", redoRequestId);
  if (error) return { error: error.message };

  revalidatePath("/admin/redo-requests");
  return { success: true };
}

export async function denyRedoRequestAction(
  redoRequestId: string,
  _prevState: AdminRedoActionState,
  formData: FormData
): Promise<AdminRedoActionState> {
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();
  if (!adminNotes) return { error: "Add a note explaining why this was denied." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase
    .from("redo_requests")
    .update({ status: "denied", resolved_at: new Date().toISOString(), resolved_by: user.id, admin_notes: adminNotes })
    .eq("id", redoRequestId);
  if (error) return { error: error.message };

  revalidatePath("/admin/redo-requests");
  return { success: true };
}

// Marks the ORIGINAL visit's existing scorecard entry as a re-clean
// callback (visit_scores.event_type), so a pattern of redos for one crew
// shows up where crew performance is already reviewed. Only updates an
// existing row -- doesn't invent quality/customer/timeliness/
// professionalism scores to create one, since those need an admin's real
// judgment, not a side effect of handling a redo request.
export async function markVisitCallbackAction(bookingId: string): Promise<AdminRedoActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data, error } = await supabase
    .from("visit_scores")
    .update({ event_type: "callback" })
    .eq("booking_id", bookingId)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "That visit hasn't been scored yet -- score it on /admin/scores and set the event there instead." };

  revalidatePath("/admin/redo-requests");
  revalidatePath("/admin/scores");
  return { success: true };
}
