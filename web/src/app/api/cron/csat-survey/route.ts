import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SERVICE_LABELS } from "@/lib/serviceLabels";
import { sendNotificationEmail } from "@/lib/email/send";
import { csatSurveyEmail } from "@/lib/email/templates";

export const runtime = "nodejs";

// Triggered daily by Vercel Cron (see vercel.json) -- sends a CSAT survey
// email for every booking that was completed yesterday (by scheduled_date,
// same day-offset approach as booking-reminders) and doesn't already have
// a csat_responses row. Runs as a system job with no user session, so it
// uses the service-role client throughout.
//
// Idempotent: the "already has a csat_responses row" check means re-running
// the job (or Vercel retrying a slow invocation) won't double-send --
// the row is inserted in the same pass as the send, before the email call.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().slice(0, 10);

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, customer_id, service_type, scheduled_date")
    .eq("scheduled_date", yesterdayDate)
    .eq("status", "completed");

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 });
  }
  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0 });
  }

  const { data: alreadySent } = await supabase
    .from("csat_responses")
    .select("booking_id")
    .in(
      "booking_id",
      bookings.map((b) => b.id)
    );
  const alreadySentIds = new Set((alreadySent ?? []).map((r) => r.booking_id));

  let sent = 0;
  let skipped = 0;

  for (const booking of bookings) {
    if (alreadySentIds.has(booking.id)) {
      skipped++;
      continue;
    }

    const token = randomBytes(24).toString("base64url");
    const { error: insertError } = await supabase.from("csat_responses").insert({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      token,
    });
    if (insertError) {
      // Most likely a race with another invocation inserting the same
      // booking_id (unique) -- skip rather than double-send.
      skipped++;
      continue;
    }

    const { subject, html } = csatSurveyEmail({
      serviceLabel: SERVICE_LABELS[booking.service_type] ?? booking.service_type,
      scheduledDate: booking.scheduled_date,
      token,
    });

    await sendNotificationEmail({
      customerId: booking.customer_id,
      bookingId: booking.id,
      template: "csat_survey",
      subject,
      html,
    });
    sent++;
  }

  return NextResponse.json({ sent, skipped });
}
