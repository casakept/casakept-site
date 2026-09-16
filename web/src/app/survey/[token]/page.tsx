import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { SERVICE_LABELS } from "@/lib/serviceLabels";
import CsatForm from "@/components/CsatForm";

export const metadata: Metadata = {
  title: "Rate your visit",
};

// Public, unauthenticated page -- reached from the CSAT email link. Uses
// the service client deliberately (see csat.ts) since the token, not a
// session, is what authorizes this read.
export default async function SurveyPage({ params }: PageProps<"/survey/[token]">) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: response } = await supabase
    .from("csat_responses")
    .select("rating, responded_at, booking:bookings(service_type, scheduled_date)")
    .eq("token", token)
    .maybeSingle();

  return (
    <section className="section">
      <div className="wrap auth-wrap">
        <span className="eyebrow">CasaKept</span>
        <h1 style={{ fontSize: "clamp(30px,4vw,42px)" }}>
          {response ? "Rate your visit." : "Link not found."}
        </h1>

        {!response && (
          <p className="lede" style={{ marginTop: 12 }}>
            This survey link isn&apos;t valid. If you think that&apos;s a mistake, reach out and we&apos;ll help.
          </p>
        )}

        {response && (
          <>
            <p className="lede" style={{ marginTop: 12, marginBottom: 26 }}>
              {response.booking
                ? `Your ${(SERVICE_LABELS[response.booking.service_type] ?? response.booking.service_type).toLowerCase()} visit on ${new Date(`${response.booking.scheduled_date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}.`
                : "Tell us how your visit went."}
            </p>
            <div className="card" style={{ padding: 30 }}>
              {response.responded_at ? (
                <p className="form-msg success">
                  You already rated this visit ({response.rating}/5) -- thank you!
                </p>
              ) : (
                <CsatForm token={token} />
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
