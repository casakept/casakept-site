"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SCORE_CATEGORIES, VISIT_SCORE_EVENTS, type VisitScoreEvent } from "@/lib/visitScoring";

export type ScoreVisitActionState = {
  error?: string;
  success?: boolean;
};

// No explicit role check here -- the visit_scores_all_admin RLS policy is
// the real gate, same pattern as updateBookingAction. Upserts on
// booking_id (unique) so re-scoring a visit corrects the existing row
// instead of creating a duplicate.
export async function scoreVisitAction(
  bookingId: string,
  staffId: string,
  _prevState: ScoreVisitActionState,
  formData: FormData
): Promise<ScoreVisitActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const scores: Record<string, number> = {};
  for (const category of SCORE_CATEGORIES) {
    const raw = formData.get(category.key);
    const value = Number(raw);
    if (raw === null || !Number.isInteger(value) || value < 0 || value > category.max) {
      return { error: `${category.label} must be a whole number between 0 and ${category.max}.` };
    }
    scores[category.key] = value;
  }
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const eventTypeRaw = String(formData.get("event_type") ?? "none");
  if (!VISIT_SCORE_EVENTS.some((e) => e.value === eventTypeRaw)) {
    return { error: "Invalid score event." };
  }
  const eventType = eventTypeRaw as VisitScoreEvent;

  const { error } = await supabase.from("visit_scores").upsert(
    {
      booking_id: bookingId,
      staff_id: staffId,
      quality_score: scores.quality_score,
      customer_score: scores.customer_score,
      timeliness_score: scores.timeliness_score,
      professionalism_score: scores.professionalism_score,
      notes,
      event_type: eventType,
      scored_by: user.id,
    },
    { onConflict: "booking_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/admin/scores");
  return { success: true };
}
