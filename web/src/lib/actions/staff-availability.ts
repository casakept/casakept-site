"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AvailabilityActionState = {
  error?: string;
  success?: boolean;
};

// Toggling is a plain existence check -- a row present means "available",
// absent means "not available". We deliberately don't use the `active`
// column for this; it's left for a future soft-disable use case. RLS
// (staff_availability_all_own) is the real ownership gate.
export async function toggleAvailabilityAction(
  dayOfWeek: number,
  timeWindow: Database["public"]["Enums"]["schedule_window"]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in.");

  const { data: existing, error: selectErr } = await supabase
    .from("staff_availability")
    .select("id")
    .eq("staff_id", user.id)
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
      .insert({ staff_id: user.id, day_of_week: dayOfWeek, time_window: timeWindow });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/staff/availability");
}

export async function addTimeOffAction(
  _prevState: AvailabilityActionState,
  formData: FormData
): Promise<AvailabilityActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

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
    staff_id: user.id,
    start_date: startDate,
    end_date: endDate,
    reason,
  });

  if (error) return { error: error.message };

  revalidatePath("/staff/availability");
  return { success: true };
}

export async function deleteTimeOffAction(timeOffId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("staff_time_off").delete().eq("id", timeOffId);
  if (error) throw new Error(error.message);
  revalidatePath("/staff/availability");
}
