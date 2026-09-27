"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { businessTimestampLabel } from "@/lib/businessTime";
import { stampPhotoWithTimestamp } from "@/lib/imageStamp";
import { sendNotificationEmail } from "@/lib/email/send";
import { redoRequestAdminNotifyEmail } from "@/lib/email/templates";
import type { Database } from "@/lib/supabase/database.types";

export type VisitReportActionState = {
  error?: string;
  message?: string;
};

const REPORT_WINDOW_HOURS = 24;
const REDO_TURNAROUND_HOURS = 48;

// Same trust model as submitCsatResponseAction: reached from an emailed
// link with no login, so the token -- not a session -- is the
// authorization boundary. redo_requests has no anon/authenticated write
// policy at all (see the migration), so this service-client path is the
// only way one of these rows gets created.
export async function submitVisitReportAction(
  token: string,
  _prevState: VisitReportActionState,
  formData: FormData
): Promise<VisitReportActionState> {
  const kindRaw = String(formData.get("kind") ?? "");
  if (kindRaw !== "redo" && kindRaw !== "damage") {
    return { error: "Choose what happened." };
  }
  const kind = kindRaw as Database["public"]["Enums"]["redo_request_kind"];

  const description = String(formData.get("description") ?? "").trim();
  if (!description) {
    return { error: "Tell us what happened." };
  }

  const checklistItemIds = formData.getAll("checklist_item_ids").map(String).filter(Boolean);
  if (kind === "redo" && checklistItemIds.length === 0) {
    return { error: "Choose at least one item that was missed." };
  }

  const photo = formData.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (kind === "redo" && !hasPhoto) {
    return { error: "A photo is required so we know exactly what to fix." };
  }

  const supabase = createServiceClient();

  const { data: csatResponse } = await supabase
    .from("csat_responses")
    .select("booking_id, customer_id")
    .eq("token", token)
    .maybeSingle();
  if (!csatResponse) return { error: "This link isn't valid." };

  const { data: checkin } = await supabase
    .from("visit_checkins")
    .select("check_out_at")
    .eq("booking_id", csatResponse.booking_id)
    .maybeSingle();
  if (!checkin?.check_out_at) {
    return { error: "This visit isn't marked complete yet, so there's nothing to report." };
  }
  const hoursSinceCheckout = (Date.now() - new Date(checkin.check_out_at).getTime()) / 3_600_000;
  if (hoursSinceCheckout > REPORT_WINDOW_HOURS) {
    return { error: `The ${REPORT_WINDOW_HOURS}-hour window to report an issue on this visit has passed.` };
  }

  // Reject duplicate open reports rather than letting someone file the
  // same complaint twice while the first is still being worked.
  const { data: existingOpen } = await supabase
    .from("redo_requests")
    .select("id")
    .eq("booking_id", csatResponse.booking_id)
    .eq("kind", kind)
    .in("status", ["open", "scheduled"])
    .maybeSingle();
  if (existingOpen) {
    return { message: "We've already got a report open for this visit -- we'll be in touch." };
  }

  let photoPath: string | null = null;
  if (hasPhoto && photo instanceof File) {
    // Same timestamp-burn treatment as checklist photos, for the same
    // reason: no dispute later about when the customer's photo was taken.
    const stamped = await stampPhotoWithTimestamp(Buffer.from(await photo.arrayBuffer()), businessTimestampLabel());
    photoPath = `${csatResponse.booking_id}/redo-reports/${kind}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("visit-photos")
      .upload(photoPath, stamped, { contentType: "image/jpeg" });
    if (uploadError) return { error: uploadError.message };
  }

  const reportedAt = new Date();
  const dueBy = kind === "redo" ? new Date(reportedAt.getTime() + REDO_TURNAROUND_HOURS * 3_600_000) : null;

  const { error: insertError } = await supabase.from("redo_requests").insert({
    booking_id: csatResponse.booking_id,
    customer_id: csatResponse.customer_id,
    kind,
    checklist_item_ids: checklistItemIds,
    description,
    photo_path: photoPath,
    reported_at: reportedAt.toISOString(),
    due_by: dueBy?.toISOString() ?? null,
  });
  if (insertError) return { error: insertError.message };

  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
  const { subject, html } = redoRequestAdminNotifyEmail({ kind });
  for (const admin of admins ?? []) {
    // Reused customer-notification path -- it just resolves any user id to
    // an email and logs the send, which works the same for an admin's own
    // account as for a customer's.
    await sendNotificationEmail({
      customerId: admin.id,
      bookingId: csatResponse.booking_id,
      template: "redo_request_new",
      subject,
      html,
    });
  }

  revalidatePath(`/survey/${token}`);
  return {
    message:
      kind === "redo"
        ? "Got it -- we'll be back out within 48 hours to make it right."
        : "Got it -- we'll review and follow up with you.",
  };
}
