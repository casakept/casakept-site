"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Window = Database["public"]["Enums"]["schedule_window"];

// Reads via the get_slot_availability security-definer RPC (same reasoning
// as active_staff_directory: a customer can't otherwise read other staff's
// staff_availability/staff_time_off/bookings rows under RLS). Returns null
// on error so the wizard can fail open rather than block booking on a
// transient read failure.
export async function getSlotAvailabilityAction(date: string): Promise<Record<string, boolean> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_slot_availability", { p_date: date });
  if (error || !data) return null;

  const result: Partial<Record<Window, boolean>> = {};
  for (const row of data) {
    result[row.time_window] = row.available;
  }
  return result;
}
