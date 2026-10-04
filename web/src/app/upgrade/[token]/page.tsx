import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe/server";
import { expireDueUpgradeRequests } from "@/lib/upgradeExpiry";
import { reasonLabel } from "@/lib/upgradeRequests";
import { formatDollars } from "@/lib/homePricing";
import { SERVICE_LABELS } from "@/lib/serviceLabels";
import UpgradeOfferActions from "@/components/UpgradeOfferActions";

export const metadata: Metadata = {
  title: "Deep clean recommendation",
};

export const dynamic = "force-dynamic";

// Public, unauthenticated page reached from the link the crew sends. The
// unguessable token in the URL authorizes it (same trust model as the visit
// survey), so it reads on the service client.
export default async function UpgradeOfferPage({ params }: PageProps<"/upgrade/[token]">) {
  const { token } = await params;
  const supabase = createServiceClient();
  await expireDueUpgradeRequests(supabase, stripe, { token });

  const { data: request } = await supabase
    .from("upgrade_requests")
    .select("status, reasons, notes, photo_paths, amount_cents, expires_at, booking:bookings(scheduled_date, service_type, property:properties(city))")
    .eq("token", token)
    .maybeSingle();

  // A request still waiting on the crew to call isn't something the customer
  // should be able to act on yet.
  if (!request || request.status === "flagged") {
    return (
      <section className="section">
        <div className="wrap auth-wrap">
          <span className="eyebrow">CasaKept</span>
          <h1 style={{ fontSize: "clamp(30px,4vw,42px)" }}>Link not found.</h1>
          <p className="lede" style={{ marginTop: 12 }}>
            This link isn&apos;t valid. If you think that&apos;s a mistake, reach out and we&apos;ll help.
          </p>
        </div>
      </section>
    );
  }

  const open = request.status === "link_sent" && request.expires_at;
  const { data: signed } = open
    ? await supabase.storage.from("visit-photos").createSignedUrls(request.photo_paths, 60 * 30)
    : { data: [] };
  const photoUrls = (signed ?? []).map((s) => s.signedUrl).filter((u): u is string => !!u);

  const closedMessage: Record<string, string> = {
    approved: "Thanks — you approved the upgrade, and your crew is doing the deep clean.",
    declined: "You kept your standard clean. Your crew is carrying on as booked.",
    expired:
      "This offer has closed. Your crew continued with your standard clean. If you'd like a deep clean, you can book one from your account.",
    cancelled: "Your crew withdrew this recommendation, so there's nothing to do. They're carrying on as booked.",
  };

  return (
    <section className="section">
      <div className="wrap auth-wrap">
        <span className="eyebrow">CasaKept</span>
        <h1 style={{ fontSize: "clamp(30px,4vw,42px)" }}>
          {open ? "Your crew recommends a deep clean." : "Deep clean recommendation."}
        </h1>
        <p className="lede" style={{ marginTop: 12, marginBottom: 22 }}>
          {request.booking
            ? `Your ${(SERVICE_LABELS[request.booking.service_type] ?? request.booking.service_type).toLowerCase()} on ${new Date(`${request.booking.scheduled_date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}.`
            : "Your visit today."}
        </p>

        {!open ? (
          <div className="card" style={{ padding: 28 }}>
            <p className="form-msg" style={{ margin: 0 }}>
              {closedMessage[request.status] ?? "This offer is no longer open."}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 28 }}>
            <p style={{ fontWeight: 700, color: "var(--verde)" }}>What your crew found</p>
            <ul style={{ margin: "8px 0 0 18px", fontSize: 14 }}>
              {request.reasons.map((r) => (
                <li key={r}>{reasonLabel(r)}</li>
              ))}
            </ul>
            {request.notes && <p style={{ fontSize: 14, marginTop: 10 }}>&ldquo;{request.notes}&rdquo;</p>}

            {photoUrls.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                {photoUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Photo from your home taken by your crew"
                      width={96}
                      height={96}
                      style={{ objectFit: "cover", borderRadius: 8, border: "1.5px solid var(--line)" }}
                    />
                  </a>
                ))}
              </div>
            )}

            <p style={{ fontSize: 14, marginTop: 16 }}>
              A deep clean gets the home to a true starting point so regular cleans stay quick and easy. The upgrade
              is <b>{formatDollars(request.amount_cents)}</b> — nothing is charged unless you approve, and you can
              keep your standard clean as booked.
            </p>

            <div style={{ marginTop: 18 }}>
              <UpgradeOfferActions token={token} amountCents={request.amount_cents} expiresAt={request.expires_at!} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
