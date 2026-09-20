"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AvailabilityActionState } from "@/lib/actions/staff-availability";
import type { Database } from "@/lib/supabase/database.types";

// Admin equivalents of staff-availability.ts's own-schedule actions, for
// editing a *different* staff member's schedule from /admin/staff/[id].
// No explicit role check here -- same as setStaffActiveAction, this leans
// entirely on the staff_availability_all_admin / staff_time_off_all_admin
// RLS policies (is_admin()) to no-op for anyone who isn't an admin.
export async function adminToggleAvailabilityAction(
  staffId: string,
  dayOfWeek: number,
  timeWindow: Database["public"]["Enums"]["schedule_window"]
) {
  const supabase = await createClient();

  const { data: existing, error: selectErr } = await supabase
    .from("staff_availability")
    .select("id")
    .eq("staff_id", staffId)
    .eq("day_of_week", dayOfWeek)
    .eq("time_window", timeWindow)
    .maybeSingle();
  if (selectErr) throw new Error(selectErr.message);

  if (existing) {
    const { error } = await supabase.from("staff_availability").delete().eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("staff_availability")
      .insert({ staff_id: staffId, day_of_week: dayOfWeek, time_window: timeWindow });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/admin/staff/${staffId}`);
}

export async function adminAddTimeOffAction(
  staffId: string,
  _prevState: AvailabilityActionState,
  formData: FormData
): Promise<AvailabilityActionState> {
  const supabase = await createClient();

  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!startDate || !endDate) {
    return { error: "Start and end dates are required." };
  }
  if (endDate < startDate) {
    return { error: "End date can't be before the start date." };
  }

  const { error } = await supabase.from("staff_time_off").insert({
    staff_id: staffId,
    start_date: startDate,
    end_date: endDate,
    reason,
  });

  if (error) return { error: error.message };

  revalidatePath(`/admin/staff/${staffId}`);
  return { success: true };
}

export async function adminDeleteTimeOffAction(staffId: string, timeOffId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("staff_time_off").delete().eq("id", timeOffId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/staff/${staffId}`);
}
