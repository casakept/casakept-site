import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import { sendNotificationEmail } from "@/lib/email/send";
import { bookingReminderEmail } from "@/lib/email/templates";

export const runtime = "nodejs";

// Triggered daily by Vercel Cron (see vercel.json) -- sends a reminder
// email for every booking scheduled for tomorrow that's still on the
// books (confirmed/assigned, not cancelled). Runs as a system job with no
// user session, so it uses the service-role client throughout rather than
// the cookie-based server client.
//
// Idempotent: before sending, checks notifications_log for an existing
// "sent" booking_reminder row for that booking, so re-running the job (or
// Vercel retrying a slow invocation) doesn't double-send. This mirrors the
// delivery-logging pattern in sendNotificationEmail/notifications_log used
// by booking confirmations elsewhere.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().slice(0, 10);

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(
      `id, customer_id, service_type, scheduled_date, time_window,
       property:properties(address_line1, city)`
    )
    .eq("scheduled_date", tomorrowDate)
    .in("status", ["confirmed", "assigned"]);

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 });
  }
  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0 });
  }

  const { data: alreadySent } = await supabase
    .from("notifications_log")
    .select("booking_id")
    .eq("template", "booking_reminder")
    .eq("status", "sent")
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

    const { subject, html } = bookingReminderEmail({
      serviceLabel: SERVICE_LABELS[booking.service_type] ?? booking.service_type,
      addressLine: `${booking.property?.address_line1}, ${booking.property?.city}`,
      scheduledDate: booking.scheduled_date,
      windowLabel: WINDOW_LABELS[booking.time_window] ?? booking.time_window,
    });

    await sendNotificationEmail({
      customerId: booking.customer_id,
      bookingId: booking.id,
      template: "booking_reminder",
      subject,
      html,
    });
    sent++;
  }

  return NextResponse.json({ sent, skipped });
}
