"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CheckinActionState = {
  error?: string;
  success?: boolean;
};

// No explicit ownership check here -- the visit_checkins_write_own_assigned /
// visit_checkins_update_own_assigned RLS policies are the real gate (staff_id
// must be the caller AND the booking must be assigned to them).
export async function recordCheckinAction(
  bookingId: string,
  staffId: string,
  type: "check_in" | "check_out",
  lat: number,
  lng: number
): Promise<CheckinActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const patch =
    type === "check_in"
      ? { check_in_at: new Date().toISOString(), check_in_lat: lat, check_in_lng: lng }
      : { check_out_at: new Date().toISOString(), check_out_lat: lat, check_out_lng: lng };

  const { error } = await supabase
    .from("visit_checkins")
    .upsert({ booking_id: bookingId, staff_id: staffId, ...patch }, { onConflict: "booking_id" });

  if (error) return { error: error.message };

  revalidatePath("/staff/jobs");
  return { success: true };
}
