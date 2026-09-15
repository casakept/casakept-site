"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ChecklistActionState = {
  error?: string;
  success?: boolean;
};

// No explicit ownership check here -- the visit_checklist_entries_write_own_assigned /
// visit_checklist_entries_update_own_assigned RLS policies are the real gate (staff_id
// must be the caller AND the booking must be assigned to them).
export async function toggleChecklistItemAction(
  bookingId: string,
  staffId: string,
  checklistItemId: string,
  completed: boolean
): Promise<ChecklistActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase.from("visit_checklist_entries").upsert(
    {
      booking_id: bookingId,
      checklist_item_id: checklistItemId,
      staff_id: staffId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "booking_id,checklist_item_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/staff/jobs");
  return { success: true };
}

// Photos go through the caller's own RLS-scoped session (not the service
// client) so the visit_photos_staff_write_own_assigned storage policy is
// the real gate here too, matching the table-level policies above.
export async function uploadChecklistPhotoAction(
  bookingId: string,
  staffId: string,
  checklistItemId: string,
  formData: FormData
): Promise<ChecklistActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${bookingId}/${checklistItemId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("visit-photos").upload(path, file, {
    contentType: file.type || "image/jpeg",
  });
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("visit_checklist_entries").upsert(
    {
      booking_id: bookingId,
      checklist_item_id: checklistItemId,
      staff_id: staffId,
      completed: true,
      completed_at: new Date().toISOString(),
      photo_path: path,
    },
    { onConflict: "booking_id,checklist_item_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/staff/jobs");
  return { success: true };
}
