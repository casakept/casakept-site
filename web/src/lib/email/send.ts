import { getResend, EMAIL_FROM } from "@/lib/email/resend";
import { createServiceClient } from "@/lib/supabase/service";

export type EmailTemplate =
  | "booking_confirmed"
  | "booking_payment_failed"
  | "booking_reminder"
  | "booking_cancelled"
  | "membership_active"
  | "membership_past_due"
  | "csat_survey";

type SendNotificationEmailParams = {
  customerId: string;
  bookingId?: string;
  template: EmailTemplate;
  subject: string;
  html: string;
};

// Sends a transactional email via Resend and records the attempt in
// notifications_log regardless of outcome, so delivery history is visible
// per-customer (and to admins) even when sends fail. Never throws -- a
// failed/misconfigured email send should not break the booking or webhook
// flow that triggered it; failures are logged to notifications_log with
// status "failed" and to the server console for now (revisit with paging/
// retry if failure volume becomes a real problem).
export async function sendNotificationEmail({
  customerId,
  bookingId,
  template,
  subject,
  html,
}: SendNotificationEmailParams): Promise<void> {
  const supabase = createServiceClient();

  const { data: userResult, error: userError } =
    await supabase.auth.admin.getUserById(customerId);
  const to = userResult?.user?.email;

  if (userError || !to) {
    console.error("sendNotificationEmail: could not resolve recipient email", {
      customerId,
      template,
      error: userError,
    });
    await supabase.from("notifications_log").insert({
      customer_id: customerId,
      booking_id: bookingId ?? null,
      channel: "email",
      template,
      status: "failed",
    });
    return;
  }

  try {
    const { error: sendError } = await getResend().emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
    if (sendError) throw sendError;

    await supabase.from("notifications_log").insert({
      customer_id: customerId,
      booking_id: bookingId ?? null,
      channel: "email",
      template,
      status: "sent",
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("sendNotificationEmail: send failed", { template, customerId, err });
    await supabase.from("notifications_log").insert({
      customer_id: customerId,
      booking_id: bookingId ?? null,
      channel: "email",
      template,
      status: "failed",
    });
  }
}
