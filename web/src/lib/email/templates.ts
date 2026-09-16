const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Inline styles throughout -- email clients don't reliably support external
// or <style>-block CSS, so this intentionally doesn't reuse globals.css.
function emailLayout(preheader: string, bodyHtml: string): string {
  return `
<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
<div style="background:#FBF7EF;padding:32px 16px;font-family:Georgia,serif;color:#182420;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1.5px solid #dcd6c8;border-radius:14px;overflow:hidden;">
    <div style="background:#1B3B31;padding:20px 28px;">
      <span style="font-family:Georgia,serif;font-weight:900;font-size:20px;color:#FBF7EF;">
        Casa<span style="color:#E9A23B;">Kept</span>
      </span>
    </div>
    <div style="padding:28px;">
      ${bodyHtml}
    </div>
    <div style="padding:16px 28px;border-top:1px solid #dcd6c8;font-size:12px;color:#6a746c;">
      CasaKept · DFW home concierge · <a href="${SITE_URL}/account" style="color:#1B3B31;">Manage your account</a>
    </div>
  </div>
</div>`;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function bookingConfirmedEmail(params: {
  serviceLabel: string;
  addressLine: string;
  scheduledDate: string;
  windowLabel: string;
  priceCents: number;
  coveredByEntitlement: boolean;
}): { subject: string; html: string } {
  const { serviceLabel, addressLine, scheduledDate, windowLabel, priceCents, coveredByEntitlement } =
    params;
  const priceLine = coveredByEntitlement
    ? "Covered by your membership -- no charge."
    : `${formatCents(priceCents)} charged.`;

  return {
    subject: `Booking confirmed: ${serviceLabel} on ${formatDate(scheduledDate)}`,
    html: emailLayout(
      `Your ${serviceLabel.toLowerCase()} visit is confirmed for ${formatDate(scheduledDate)}.`,
      `
      <h2 style="color:#1B3B31;margin:0 0 12px;">Your visit is confirmed</h2>
      <p style="margin:0 0 20px;line-height:1.6;">We've got it on the calendar. Here are the details:</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#6a746c;">Service</td><td style="padding:6px 0;text-align:right;font-weight:700;">${serviceLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#6a746c;">Date</td><td style="padding:6px 0;text-align:right;font-weight:700;">${formatDate(scheduledDate)}</td></tr>
        <tr><td style="padding:6px 0;color:#6a746c;">Window</td><td style="padding:6px 0;text-align:right;font-weight:700;">${windowLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#6a746c;">Address</td><td style="padding:6px 0;text-align:right;font-weight:700;">${addressLine}</td></tr>
        <tr><td style="padding:6px 0;color:#6a746c;">Price</td><td style="padding:6px 0;text-align:right;font-weight:700;">${priceLine}</td></tr>
      </table>
      <p style="margin:24px 0 0;line-height:1.6;">Need to make a change? Reach out or manage it from your account.</p>
      `
    ),
  };
}

export function bookingReminderEmail(params: {
  serviceLabel: string;
  addressLine: string;
  scheduledDate: string;
  windowLabel: string;
}): { subject: string; html: string } {
  const { serviceLabel, addressLine, scheduledDate, windowLabel } = params;

  return {
    subject: `Reminder: ${serviceLabel} tomorrow, ${formatDate(scheduledDate)}`,
    html: emailLayout(
      `Your ${serviceLabel.toLowerCase()} visit is tomorrow, ${formatDate(scheduledDate)}.`,
      `
      <h2 style="color:#1B3B31;margin:0 0 12px;">See you tomorrow</h2>
      <p style="margin:0 0 20px;line-height:1.6;">Just a reminder about your upcoming visit:</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#6a746c;">Service</td><td style="padding:6px 0;text-align:right;font-weight:700;">${serviceLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#6a746c;">Date</td><td style="padding:6px 0;text-align:right;font-weight:700;">${formatDate(scheduledDate)}</td></tr>
        <tr><td style="padding:6px 0;color:#6a746c;">Window</td><td style="padding:6px 0;text-align:right;font-weight:700;">${windowLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#6a746c;">Address</td><td style="padding:6px 0;text-align:right;font-weight:700;">${addressLine}</td></tr>
      </table>
      <p style="margin:24px 0 0;line-height:1.6;">Need to reschedule? Manage it from your account.</p>
      `
    ),
  };
}

export function bookingCancelledEmail(params: {
  serviceLabel: string;
  scheduledDate: string;
  refunded: boolean;
}): { subject: string; html: string } {
  const { serviceLabel, scheduledDate, refunded } = params;
  return {
    subject: `Cancelled: ${serviceLabel} on ${formatDate(scheduledDate)}`,
    html: emailLayout(
      `Your ${serviceLabel.toLowerCase()} visit on ${formatDate(scheduledDate)} has been cancelled.`,
      `
      <h2 style="color:#1B3B31;margin:0 0 12px;">Visit cancelled</h2>
      <p style="margin:0 0 20px;line-height:1.6;">
        Your ${serviceLabel.toLowerCase()} visit scheduled for ${formatDate(scheduledDate)} has been cancelled.
        ${refunded ? " Your payment has been refunded." : ""}
      </p>
      <a href="${SITE_URL}/account/book" style="display:inline-block;background:#E9A23B;color:#1B3B31;font-weight:700;padding:10px 22px;border-radius:99px;text-decoration:none;">
        Book another visit
      </a>
      `
    ),
  };
}

export function bookingPaymentFailedEmail(params: {
  serviceLabel: string;
  scheduledDate: string;
}): { subject: string; html: string } {
  const { serviceLabel, scheduledDate } = params;
  return {
    subject: `Payment failed for your ${serviceLabel.toLowerCase()} booking`,
    html: emailLayout(
      `We couldn't process payment for your ${formatDate(scheduledDate)} visit.`,
      `
      <h2 style="color:#BE4B2E;margin:0 0 12px;">We couldn't process your payment</h2>
      <p style="margin:0 0 20px;line-height:1.6;">
        Your card was declined for the ${serviceLabel.toLowerCase()} visit scheduled
        ${formatDate(scheduledDate)}. Please update your payment method so we can confirm the booking.
      </p>
      <a href="${SITE_URL}/account/book" style="display:inline-block;background:#E9A23B;color:#1B3B31;font-weight:700;padding:10px 22px;border-radius:99px;text-decoration:none;">
        Update payment
      </a>
      `
    ),
  };
}

export function csatSurveyEmail(params: {
  serviceLabel: string;
  scheduledDate: string;
  token: string;
}): { subject: string; html: string } {
  const { serviceLabel, scheduledDate, token } = params;
  const surveyUrl = `${SITE_URL}/survey/${token}`;
  return {
    subject: `How was your ${serviceLabel.toLowerCase()} visit?`,
    html: emailLayout(
      `Rate your ${formatDate(scheduledDate)} visit -- it takes 10 seconds.`,
      `
      <h2 style="color:#1B3B31;margin:0 0 12px;">How did we do?</h2>
      <p style="margin:0 0 20px;line-height:1.6;">
        Your ${serviceLabel.toLowerCase()} visit on ${formatDate(scheduledDate)} is complete. We'd love to
        know how it went -- it only takes a moment.
      </p>
      <a href="${surveyUrl}" style="display:inline-block;background:#E9A23B;color:#1B3B31;font-weight:700;padding:10px 22px;border-radius:99px;text-decoration:none;">
        Rate your visit
      </a>
      `
    ),
  };
}

export function membershipActiveEmail(params: {
  planName: string;
  monthlyPriceCents: number;
}): { subject: string; html: string } {
  const { planName, monthlyPriceCents } = params;
  return {
    subject: `Welcome to ${planName}`,
    html: emailLayout(
      `Your ${planName} membership is active.`,
      `
      <h2 style="color:#1B3B31;margin:0 0 12px;">Welcome to ${planName}</h2>
      <p style="margin:0 0 20px;line-height:1.6;">
        Your membership is active at ${formatCents(monthlyPriceCents)}/mo. Your included visits and
        perks are ready to use whenever you book.
      </p>
      <a href="${SITE_URL}/account/book" style="display:inline-block;background:#E9A23B;color:#1B3B31;font-weight:700;padding:10px 22px;border-radius:99px;text-decoration:none;">
        Book your first visit
      </a>
      `
    ),
  };
}

export function membershipPastDueEmail(): { subject: string; html: string } {
  return {
    subject: "Action needed: update your membership payment method",
    html: emailLayout(
      "We couldn't process your membership renewal payment.",
      `
      <h2 style="color:#BE4B2E;margin:0 0 12px;">Payment failed</h2>
      <p style="margin:0 0 20px;line-height:1.6;">
        We couldn't process your last membership payment. Update your payment method
        to keep your membership active and avoid interruption to your included visits.
      </p>
      <a href="${SITE_URL}/account/membership" style="display:inline-block;background:#E9A23B;color:#1B3B31;font-weight:700;padding:10px 22px;border-radius:99px;text-decoration:none;">
        Update payment method
      </a>
      `
    ),
  };
}
