"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe/server";
import { stampPhotoWithTimestamp } from "@/lib/imageStamp";
import { businessTimestampLabel } from "@/lib/businessTime";
import { sendNotificationEmail } from "@/lib/email/send";
import { upgradeOfferEmail } from "@/lib/email/templates";
import { upgradeOfferUrl } from "@/lib/siteUrl";
import { expireDueUpgradeRequests } from "@/lib/upgradeExpiry";
import {
  MIN_ARRIVAL_PHOTOS,
  UPGRADE_RESPONSE_WINDOW_MINUTES,
  isUpgradeReason,
} from "@/lib/upgradeRequests";

export type UpgradeActionState = {
  error?: string;
  success?: boolean;
};

const MAX_ARRIVAL_PHOTOS = 20;

// Arrival photos go through the caller's own RLS-scoped session so the
// visit_arrival_photos and storage policies (assigned staff only) are the
// real gate, same as the checklist photos.
export async function uploadArrivalPhotoAction(
  bookingId: string,
  staffId: string,
  formData: FormData
): Promise<UpgradeActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo to upload." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .eq("assigned_staff_id", user.id)
    .maybeSingle();
  if (!booking) return { error: "That job isn't assigned to you." };
  if (booking.status !== "in_progress") return { error: "Start the visit before adding arrival photos." };

  const { count } = await supabase
    .from("visit_arrival_photos")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId);
  if ((count ?? 0) >= MAX_ARRIVAL_PHOTOS) return { error: `You can add up to ${MAX_ARRIVAL_PHOTOS} arrival photos.` };

  const path = `${bookingId}/arrival/${Date.now()}-${randomBytes(3).toString("hex")}.jpg`;
  const stamped = await stampPhotoWithTimestamp(Buffer.from(await file.arrayBuffer()), businessTimestampLabel());
  const { error: uploadError } = await supabase.storage.from("visit-photos").upload(path, stamped, {
    contentType: "image/jpeg",
  });
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase
    .from("visit_arrival_photos")
    .insert({ booking_id: bookingId, staff_id: staffId, photo_path: path });
  if (error) return { error: error.message };

  revalidatePath("/staff/jobs");
  return { success: true };
}

// Files the recommendation. Everything that makes it legitimate is checked
// here rather than trusted from the screen: the visit is this crew
// member's, in progress, a standard clean whose customer agreed to a
// possible upgrade, with enough photos and a real reason on file.
export async function flagDeepCleanAction(
  bookingId: string,
  _prevState: UpgradeActionState,
  formData: FormData
): Promise<UpgradeActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, service_type, upgrade_consent_at, upgrade_max_cents")
    .eq("id", bookingId)
    .eq("assigned_staff_id", user.id)
    .maybeSingle();
  if (!booking) return { error: "That job isn't assigned to you." };
  if (booking.status !== "in_progress") return { error: "The visit has to be in progress." };
  if (booking.service_type !== "standard_clean") return { error: "Only a standard clean can be upgraded to a deep clean." };
  if (!booking.upgrade_consent_at || booking.upgrade_max_cents == null) {
    return { error: "This customer didn't agree to a possible upgrade when they booked." };
  }

  const reasons = [...new Set(formData.getAll("reasons").map(String))];
  if (reasons.length === 0) return { error: "Choose at least one reason." };
  if (!reasons.every(isUpgradeReason)) return { error: "One of the reasons isn't valid." };
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500) || null;
  if (reasons.includes("other") && !notes) return { error: "Explain the \"Other\" reason in the notes." };

  const { data: photos } = await supabase
    .from("visit_arrival_photos")
    .select("photo_path")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if ((photos ?? []).length < MIN_ARRIVAL_PHOTOS) {
    return { error: `Take at least ${MIN_ARRIVAL_PHOTOS} arrival photos first -- the customer is shown them.` };
  }

  const { data: existing } = await supabase
    .from("upgrade_requests")
    .select("id, status")
    .eq("booking_id", bookingId)
    .in("status", ["flagged", "link_sent", "approved", "declined", "expired"])
    .limit(1)
    .maybeSingle();
  if (existing) return { error: "An upgrade has already been offered for this visit." };

  const { error } = await supabase.from("upgrade_requests").insert({
    booking_id: bookingId,
    staff_id: user.id,
    token: randomBytes(24).toString("base64url"),
    reasons,
    notes,
    photo_paths: photos!.map((p) => p.photo_path),
    amount_cents: booking.upgrade_max_cents,
  });
  if (error) return { error: error.message };

  revalidatePath("/staff/jobs");
  return { success: true };
}

// The crew member's own request, or null (RLS only returns theirs).
async function loadOwnRequest(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  await expireDueUpgradeRequests(createServiceClient(), stripe, { requestId });
  const { data } = await supabase
    .from("upgrade_requests")
    .select("id, booking_id, token, status, called_at, call_outcome, amount_cents, stripe_payment_intent_id")
    .eq("id", requestId)
    .maybeSingle();
  return data;
}

// Step 1 of contacting the customer: record that the crew called. The link
// can't be sent until this is done -- call first, then text.
export async function logUpgradeCallAction(
  requestId: string,
  outcome: "no_answer" | "spoke"
): Promise<UpgradeActionState> {
  const request = await loadOwnRequest(requestId);
  if (!request) return { error: "That request wasn't found." };
  if (request.status !== "flagged") return { error: "That request has already moved on." };

  const { error } = await createServiceClient()
    .from("upgrade_requests")
    .update({ called_at: new Date().toISOString(), call_outcome: outcome })
    .eq("id", requestId)
    .eq("status", "flagged");
  if (error) return { error: error.message };

  revalidatePath("/staff/jobs");
  return { success: true };
}

// The customer declined on the phone: keep the standard clean.
export async function declineOnCallAction(requestId: string): Promise<UpgradeActionState> {
  const request = await loadOwnRequest(requestId);
  if (!request) return { error: "That request wasn't found." };
  if (request.status !== "flagged" || request.call_outcome !== "spoke") {
    return { error: "Record that you spoke with the customer first." };
  }

  const { error } = await createServiceClient()
    .from("upgrade_requests")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "flagged");
  if (error) return { error: error.message };

  revalidatePath("/staff/jobs");
  return { success: true };
}

export type SendLinkResult = { error: string } | { url: string; expiresAt: string };

// Step 2: send the customer the approve/decline link (email from us; the
// crew texts the same link from their own phone) and start the response
// window. Resending while the window is open keeps the original deadline.
export async function sendUpgradeLinkAction(requestId: string): Promise<SendLinkResult> {
  const request = await loadOwnRequest(requestId);
  if (!request) return { error: "That request wasn't found." };
  if (!request.called_at) return { error: "Call the customer first, then send the link." };
  if (request.status !== "flagged" && request.status !== "link_sent") {
    return { error: "That request is no longer open." };
  }

  const service = createServiceClient();
  const { data: updated, error } =
    request.status === "flagged"
      ? await service
          .from("upgrade_requests")
          .update({
            status: "link_sent",
            link_sent_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + UPGRADE_RESPONSE_WINDOW_MINUTES * 60_000).toISOString(),
          })
          .eq("id", requestId)
          .eq("status", "flagged")
          .select("expires_at")
          .maybeSingle()
      : await service.from("upgrade_requests").select("expires_at").eq("id", requestId).maybeSingle();
  if (error) return { error: error.message };
  if (!updated?.expires_at) return { error: "That request just changed. Refresh and try again." };

  const { data: booking } = await service
    .from("bookings")
    .select("customer_id")
    .eq("id", request.booking_id)
    .single();
  if (booking) {
    const { subject, html } = upgradeOfferEmail({
      url: upgradeOfferUrl(request.token),
      amountCents: request.amount_cents,
      minutes: UPGRADE_RESPONSE_WINDOW_MINUTES,
    });
    await sendNotificationEmail({
      customerId: booking.customer_id,
      bookingId: request.booking_id,
      template: "upgrade_offer",
      subject,
      html,
    });
  }

  revalidatePath("/staff/jobs");
  return { url: upgradeOfferUrl(request.token), expiresAt: updated.expires_at };
}

// The crew withdraws the recommendation (e.g. on a second look the home is
// fine). Releases any open payment so it can't be completed afterwards.
export async function cancelUpgradeRequestAction(requestId: string): Promise<UpgradeActionState> {
  const request = await loadOwnRequest(requestId);
  if (!request) return { error: "That request wasn't found." };
  if (request.status !== "flagged" && request.status !== "link_sent") {
    return { error: "That request is no longer open." };
  }

  const { data: cancelled, error } = await createServiceClient()
    .from("upgrade_requests")
    .update({ status: "cancelled", responded_at: new Date().toISOString() })
    .eq("id", requestId)
    .in("status", ["flagged", "link_sent"])
    .select("stripe_payment_intent_id")
    .maybeSingle();
  if (error) return { error: error.message };

  if (cancelled?.stripe_payment_intent_id) {
    try {
      const intent = await stripe.paymentIntents.retrieve(cancelled.stripe_payment_intent_id);
      if (intent.status !== "succeeded" && intent.status !== "canceled" && intent.status !== "processing") {
        await stripe.paymentIntents.cancel(intent.id);
      }
    } catch (err) {
      console.error("cancelUpgradeRequestAction: couldn't cancel PaymentIntent", { requestId, err });
    }
  }

  revalidatePath("/staff/jobs");
  return { success: true };
}
