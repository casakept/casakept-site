"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// No explicit role check here -- the staff_bonuses_all_admin RLS policy is
// the real gate, same pattern as setStaffActiveAction. Marking paid is
// informational bookkeeping only (see the migration comment) -- it doesn't
// move any money, it just records that the admin handled it elsewhere.
export async function markBonusPaidAction(bonusId: string, paid: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("staff_bonuses")
    .update({ paid, paid_at: paid ? new Date().toISOString() : null })
    .eq("id", bonusId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/bonuses");
}
