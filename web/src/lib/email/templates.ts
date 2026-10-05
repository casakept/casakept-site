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
  // "fallback" -- a preferred cleaner was requested but wasn't available
  // for this slot, so a different crew member was assigned. "unassigned"
  // -- nobody was available at all; an admin still needs to staff this
  // visit manually. Omitted/null when the preferred cleaner (or any
  // cleaner, if no preference) was assigned as expected.
  assignmentNote?: "fallback" | "unassigned" | null;
  // The scent/product the customer picked per category, if this service
  // type has any (see PRODUCT_CATEGORIES_BY_SERVICE) -- omitted/empty for
  // service types with no product step at all.
  products?: { categoryLabel: string; productName: string }[];
  // Present for a customer's first standard clean at a home, where they
  // agreed the crew may offer a deep-clean upgrade on arrival (maxCents is
  // the most it could add; null if that couldn't be worked out).
  upgradeNote?: { maxCents: number | null } | null;
}): { subject: string; html: string } {
  const {
    serviceLabel,
    addressLine,
    scheduledDate,
    windowLabel,
    priceCents,
    coveredByEntitlement,
    assignmentNote,
    products,
    upgradeNote,
  } = params;
  const upgradeHtml = upgradeNote
    ? `<p style="margin:20px 0 0;line-height:1.6;font-size:14px;color:#3c463f;"><b>About your first visit:</b> when we arrive, the crew will check your home's condition. If it needs a deep clean to be done properly, we'll call you first (and text if we can't reach you) so you can approve an upgrade${
        upgradeNote.maxCents != null ? ` for up to ${formatCents(upgradeNote.maxCents)} more` : ""
      } or keep the standard clean as booked. Nothing extra is charged without your approval.</p>`
    : "";
  const priceLine = coveredByEntitlement
    ? "Covered by your membership -- no charge."
    : `${formatCents(priceCents)} charged.`;
  const assignmentHtml =
    assignmentNote === "fallback"
      ? `<p style="margin:16px 0 0;line-height:1.6;font-size:14px;color:#6a746c;">Heads up: your preferred cleaner wasn't available for this time, so we've assigned another vetted member of our crew instead.</p>`
      : assignmentNote === "unassigned"
        ? `<p style="margin:16px 0 0;line-height:1.6;font-size:14px;color:#6a746c;">We're still finalizing your crew for this visit and will follow up shortly.</p>`
        : "";
  const productsHtml =
    products && products.length > 0
      ? `
      <p style="margin:20px 0 6px;font-weight:700;color:#1B3B31;">Products we'll use</p>
      <table style="width:100%;border-collapse:collapse;">
        ${products
          .map(
            (p) =>
              `<tr><td style="padding:4px 0;color:#6a746c;">${p.categoryLabel}</td><td style="padding:4px 0;text-align:right;font-weight:700;">${p.productName}</td></tr>`
          )
          .join("")}
      </table>
      `
      : "";

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
      ${assignmentHtml}
      ${productsHtml}
      ${upgradeHtml}
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
  priceCents: number;
  period: "mo" | "yr";
  homeSizeAddOnCents: number;
}): { subject: string; html: string } {
  const { planName, priceCents, period, homeSizeAddOnCents } = params;
  return {
    subject: `Welcome to ${planName}`,
    html: emailLayout(
      `Your ${planName} membership is active.`,
      `
      <h2 style="color:#1B3B31;margin:0 0 12px;">Welcome to ${planName}</h2>
      <p style="margin:0 0 20px;line-height:1.6;">
        Your membership is active at ${formatCents(priceCents)}/${period}${
          homeSizeAddOnCents > 0
            ? `, plus a ${formatCents(homeSizeAddOnCents)}/${period} home-size add-on for your home`
            : ""
        }. Your included visits and perks are ready to use whenever you book.
      </p>
      <a href="${SITE_URL}/account/book" style="display:inline-block;background:#E9A23B;color:#1B3B31;font-weight:700;padding:10px 22px;border-radius:99px;text-decoration:none;">
        Book your first visit
      </a>
      `
    ),
  };
}

// Annual memberships only (see the membership-renewal-reminders cron) --
// monthly already renews every ~30 days, so a "30 days out" reminder for
// it would land right after the last charge and just be noise. Annual is
// a single ~once-a-year charge people are far more likely to forget
// about, which is what actually makes a reminder useful here.
export function membershipRenewalReminderEmail(params: {
  planName: string;
  renewalDate: string;
  priceCents: number;
  daysUntil: 30 | 3;
}): { subject: string; html: string } {
  const { planName, renewalDate, priceCents, daysUntil } = params;
  const urgent = daysUntil === 3;
  return {
    subject: urgent
      ? `Your ${planName} membership renews in 3 days`
      : `Heads up: your ${planName} membership renews in 30 days`,
    html: emailLayout(
      `Renews ${formatDate(renewalDate)} at ${formatCents(priceCents)}.`,
      `
      <h2 style="color:#1B3B31;margin:0 0 12px;">${urgent ? "Renewing soon" : "Upcoming renewal"}</h2>
      <p style="margin:0 0 20px;line-height:1.6;">
        Your ${planName} membership is set to renew on ${formatDate(renewalDate)} for
        ${formatCents(priceCents)}, billed automatically to your card on file. No action needed to
        keep it going -- this is just a heads-up.
      </p>
      <a href="${SITE_URL}/account/membership" style="display:inline-block;background:#E9A23B;color:#1B3B31;font-weight:700;padding:10px 22px;border-radius:99px;text-decoration:none;">
        Manage membership
      </a>
      `
    ),
  };
}

export function redoRequestAdminNotifyEmail(params: { kind: "redo" | "damage" }): {
  subject: string;
  html: string;
} {
  const { kind } = params;
  const isRedo = kind === "redo";
  return {
    subject: isRedo ? "New re-do request -- 48-hour clock started" : "New damage report",
    html: emailLayout(
      isRedo ? "A customer flagged a missed item -- respond within 48 hours." : "A customer reported damage.",
      `
      <h2 style="color:#1B3B31;margin:0 0 12px;">${isRedo ? "Re-do requested" : "Damage reported"}</h2>
      <p style="margin:0 0 20px;line-height:1.6;">
        ${
          isRedo
            ? "A customer flagged something missed from their visit and requested a re-do. The 48-hour turnaround clock has started."
            : "A customer reported damage from a visit. Review the details and follow up."
        }
      </p>
      <a href="${SITE_URL}/admin/redo-requests" style="display:inline-block;background:#E9A23B;color:#1B3B31;font-weight:700;padding:10px 22px;border-radius:99px;text-decoration:none;">
        Review request
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

// The customer's copy of the deep-clean upgrade offer (the crew also texts
// the same link from their own phone).
export function upgradeOfferEmail(params: {
  url: string;
  amountCents: number;
  minutes: number;
}): { subject: string; html: string } {
  const { url, amountCents, minutes } = params;
  return {
    subject: "Your crew recommends a deep clean today",
    html: emailLayout(
      `Review the photos and approve or decline within ${minutes} minutes.`,
      `
      <h2 style="color:#1B3B31;margin:0 0 12px;">Your crew recommends a deep clean</h2>
      <p style="margin:0 0 20px;line-height:1.6;">
        Your crew is at your home now and found it needs a deep clean to be done properly. You can upgrade
        for ${formatCents(amountCents)} or keep your standard clean as booked -- nothing is charged unless you
        approve. This offer is open for ${minutes} minutes.
      </p>
      <a href="${url}" style="display:inline-block;background:#E9A23B;color:#1B3B31;font-weight:700;padding:10px 22px;border-radius:99px;text-decoration:none;">
        Review and respond
      </a>
      `
    ),
  };
}

export function upgradeApprovedEmail(params: { amountCents: number }): { subject: string; html: string } {
  return {
    subject: "Your visit is upgraded to a deep clean",
    html: emailLayout(
      "Thanks -- your crew is starting the deep clean.",
      `
      <h2 style="color:#1B3B31;margin:0 0 12px;">Your visit is upgraded</h2>
      <p style="margin:0 0 20px;line-height:1.6;">
        Thanks for approving. We charged ${formatCents(params.amountCents)} for the upgrade to a deep clean, and your
        crew is starting now.
      </p>
      `
    ),
  };
}

export function upgradeRefundedEmail(params: { amountCents: number }): { subject: string; html: string } {
  return {
    subject: "We refunded your upgrade payment",
    html: emailLayout(
      "Your payment was refunded in full.",
      `
      <h2 style="color:#1B3B31;margin:0 0 12px;">Your upgrade payment was refunded</h2>
      <p style="margin:0 0 20px;line-height:1.6;">
        Your payment of ${formatCents(params.amountCents)} arrived after the upgrade offer had closed, and your crew
        had already continued with your standard clean, so we've refunded it in full. If you'd still like a deep
        clean, you can book one from your account.
      </p>
      `
    ),
  };
}

// Sent when the crew marks a visit complete -- the customer's first look at
// what was done, with the crew's photos behind a login-protected page.
export function visitCompleteEmail(params: {
  serviceLabel: string;
  scheduledDate: string;
  photoCount: number;
  url: string;
}): { subject: string; html: string } {
  const { serviceLabel, scheduledDate, photoCount, url } = params;
  return {
    subject: `Your ${serviceLabel.toLowerCase()} is complete`,
    html: emailLayout(
      photoCount > 0
        ? `See the ${photoCount} photo${photoCount === 1 ? "" : "s"} from your visit.`
        : "See what your crew completed.",
      `
      <h2 style="color:#1B3B31;margin:0 0 12px;">Your visit is complete</h2>
      <p style="margin:0 0 20px;line-height:1.6;">
        Your crew finished your ${serviceLabel.toLowerCase()} on ${formatDate(scheduledDate)}.
        ${
          photoCount > 0
            ? `They photographed ${photoCount} area${photoCount === 1 ? "" : "s"} so you can see the work for yourself.`
            : "You can see the checklist they completed."
        }
      </p>
      <a href="${url}" style="display:inline-block;background:#E9A23B;color:#1B3B31;font-weight:700;padding:10px 22px;border-radius:99px;text-decoration:none;">
        See your visit${photoCount > 0 ? " and photos" : ""}
      </a>
      `
    ),
  };
}
