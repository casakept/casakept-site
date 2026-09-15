"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminBookingActionState = {
  error?: string;
  success?: boolean;
};

const BOOKING_STATUSES = new Set<Database["public"]["Enums"]["booking_status"]>([
  "pending",
  "confirmed",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
]);

// No explicit role check here -- the bookings_all_admin RLS policy is the
// real gate. A non-admin session hitting this action would just match zero
// rows and no-op, same as deletePropertyAction relies on properties_all_own.
export async function updateBookingAction(
  bookingId: string,
  _prevState: AdminBookingActionState,
  formData: FormData
): Promise<AdminBookingActionState> {
  const status = String(formData.get("status") ?? "");
  const assignedStaffId = String(formData.get("assigned_staff_id") ?? "") || null;

  if (!BOOKING_STATUSES.has(status as Database["public"]["Enums"]["booking_status"])) {
    return { error: "Choose a valid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      status: status as Database["public"]["Enums"]["booking_status"],
      assigned_staff_id: assignedStaffId,
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  return { success: true };
}
