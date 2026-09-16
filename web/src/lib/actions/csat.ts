"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";

export type CsatActionState = {
  error?: string;
  message?: string;
};

// No user session on this flow -- the customer reaches this page from an
// emailed link with no login, so the token itself (a random 32-byte value,
// unguessable and set only by the sending cron job) is the authorization
// boundary. The service client is used deliberately here instead of the
// cookie-scoped client, since there's no auth.uid() for RLS to check
// against; csat_responses has no anon/authenticated write policies at all
// (see the migration), so this is the only path that can write a rating.
export async function submitCsatResponseAction(
  token: string,
  _prevState: CsatActionState,
  formData: FormData
): Promise<CsatActionState> {
  const ratingRaw = formData.get("rating");
  const rating = Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Choose a rating from 1 to 5." };
  }
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1000) || null;

  const supabase = createServiceClient();

  const { data: existing, error: lookupError } = await supabase
    .from("csat_responses")
    .select("id, responded_at")
    .eq("token", token)
    .maybeSingle();

  if (lookupError || !existing) {
    return { error: "This link isn't valid." };
  }
  if (existing.responded_at) {
    return { message: "You've already submitted a rating for this visit -- thank you!" };
  }

  const { error } = await supabase
    .from("csat_responses")
    .update({ rating, comment, responded_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (error) return { error: error.message };

  revalidatePath(`/survey/${token}`);
  return { message: "Thanks for the feedback!" };
}
