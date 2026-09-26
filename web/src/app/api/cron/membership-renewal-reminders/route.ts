import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendNotificationEmail } from "@/lib/email/send";
import { membershipRenewalReminderEmail } from "@/lib/email/templates";
import { businessDateAnchor, businessDateISO } from "@/lib/businessTime";

export const runtime = "nodejs";

// Triggered daily by Vercel Cron (see vercel.json). Annual memberships
// only -- monthly already renews every ~30 days, so a reminder sent 30
// days ahead of a monthly renewal would land right after the last charge
// and just be noise; annual is a single ~once-a-year charge people are
// far more likely to forget about, which is what makes a reminder
// actually useful.
//
// Two reminders per renewal: 30 days out and 3 days out. Only sent to
// subscriptions that will actually auto-renew (status active, cancel_at
// null -- someone who's already scheduled to cancel already knows their
// membership is ending, a "renews soon" email would be actively wrong).
//
// Idempotent per renewal cycle, not just per subscription: an annual
// subscription recurs every year, so dedup can't be "has this template
// ever been sent to this subscription" (that would correctly send year
// one's reminder then incorrectly block every year after). Instead it
// checks for an existing notifications_log row created since the
// *current* current_period_start -- once Stripe renews and the webhook
// advances that date, last year's reminder no longer counts and next
// year's can send.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const targets: { daysUntil: 30 | 3; template: "membership_renewal_30d" | "membership_renewal_3d" }[] = [
    { daysUntil: 30, template: "membership_renewal_30d" },
    { daysUntil: 3, template: "membership_renewal_3d" },
  ];

  let sent = 0;
  let skipped = 0;

  for (const { daysUntil, template } of targets) {
    const targetDay = businessDateAnchor();
    targetDay.setUTCDate(targetDay.getUTCDate() + daysUntil);
    const dayStart = targetDay.toISOString();
    const dayEnd = new Date(targetDay);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select(
        "id, customer_id, current_period_start, current_period_end, membership_plans(name, annual_price_cents)"
      )
      .eq("billing_cadence", "annual")
      .eq("status", "active")
      .is("cancel_at", null)
      .gte("current_period_end", dayStart)
      .lt("current_period_end", dayEnd.toISOString());

    if (error) {
      console.error("membership-renewal-reminders: query failed", { template, error });
      continue;
    }

    for (const sub of subscriptions ?? []) {
      if (!sub.membership_plans) continue;

      const { data: existing } = await supabase
        .from("notifications_log")
        .select("id")
        .eq("subscription_id", sub.id)
        .eq("template", template)
        .gte("created_at", sub.current_period_start)
        .maybeSingle();
      if (existing) {
        skipped++;
        continue;
      }

      const priceCents = sub.membership_plans.annual_price_cents;
      if (priceCents == null) continue;

      const { subject, html } = membershipRenewalReminderEmail({
        planName: sub.membership_plans.name,
        renewalDate: businessDateISO(new Date(sub.current_period_end)),
        priceCents,
        daysUntil,
      });

      await sendNotificationEmail({
        customerId: sub.customer_id,
        subscriptionId: sub.id,
        template,
        subject,
        html,
      });
      sent++;
    }
  }

  return NextResponse.json({ sent, skipped });
}
