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

export async function advanceBookingStatusAction(
  bookingId: string,
  currentStatus: BookingStatus,
  _prevState: StaffBookingActionState,
  _formData: FormData
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

  revalidatePath("/staff/jobs");
  revalidatePath("/staff");
  return { success: true };
}
