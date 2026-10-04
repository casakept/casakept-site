"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isReviewVerdict, isReviewable } from "@/lib/upgradeReview";

export type ReviewActionState = {
  error?: string;
  success?: boolean;
};

// No explicit role check -- the upgrade_requests_all_admin RLS policy is the
// real gate (crew only have select/insert on their own requests), so a
// non-admin session matches zero rows and nothing is saved.
export async function reviewUpgradeRequestAction(
  requestId: string,
  formData: FormData
): Promise<ReviewActionState> {
  const verdict = String(formData.get("verdict") ?? "");
  if (!isReviewVerdict(verdict)) return { error: "Choose a verdict." };

  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500) || null;
  // A "not accurate" call is what the crew member will be coached on, so it
  // needs to say why.
  if (verdict === "not_accurate" && !notes) {
    return { error: "Add a note saying what the photos show, so there's something to coach from." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: request } = await supabase
    .from("upgrade_requests")
    .select("status")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return { error: "That request wasn't found." };
  if (!isReviewable(request.status)) return { error: "That call is still in progress." };

  const { data, error } = await supabase
    .from("upgrade_requests")
    .update({
      review_verdict: verdict,
      review_notes: notes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Couldn't save the review." };

  revalidatePath("/admin/upgrade-reviews");
  revalidatePath("/admin/bookings");
  return { success: true };
}
