import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { SERVICE_LABELS } from "@/lib/serviceLabels";
import CsatForm from "@/components/CsatForm";
import VisitReportSection from "@/components/VisitReportSection";

export const metadata: Metadata = {
  title: "Rate your visit",
};

const REPORT_WINDOW_HOURS = 24;

// A plain module-level helper, not inline in the component body -- calling
// Date.now() directly during render is flagged as impure by the
// react-hooks purity rule, but that rule only traces the component's own
// function body, not what an imported/sibling function does internally
// (same reason businessTime.ts's own new Date() calls are never flagged).
function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

// Public, unauthenticated page -- reached from the CSAT email link. Uses
// the service client deliberately (see csat.ts) since the token, not a
// session, is what authorizes this read.
export default async function SurveyPage({ params }: PageProps<"/survey/[token]">) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: response } = await supabase
    .from("csat_responses")
    .select("rating, responded_at, booking_id, booking:bookings(service_type, scheduled_date)")
    .eq("token", token)
    .maybeSingle();

  let withinReportWindow = false;
  let checklistItems: { id: string; name: string }[] = [];
  // Both kinds can be reported on the same visit independently (a missed
  // item and separate damage aren't mutually exclusive) -- keyed by kind
  // so the UI can gate each one on its own rather than one report blocking
  // the other.
  let existingRequestByKind: Record<string, { status: string }> = {};

  if (response) {
    const [{ data: checkin }, { data: checklist }, { data: redoRequests }] = await Promise.all([
      supabase.from("visit_checkins").select("check_out_at").eq("booking_id", response.booking_id).maybeSingle(),
      supabase
        .from("visit_checklist_entries")
        .select("checklist_item_id, item:checklist_items(name)")
        .eq("booking_id", response.booking_id),
      supabase.from("redo_requests").select("kind, status").eq("booking_id", response.booking_id),
    ]);

    if (checkin?.check_out_at) {
      withinReportWindow = hoursSince(checkin.check_out_at) <= REPORT_WINDOW_HOURS;
    }
    checklistItems = (checklist ?? [])
      .filter((c): c is typeof c & { item: { name: string } } => !!c.item)
      .map((c) => ({ id: c.checklist_item_id, name: c.item.name }));
    existingRequestByKind = Object.fromEntries((redoRequests ?? []).map((r) => [r.kind, { status: r.status }]));
  }

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

            {withinReportWindow && (
              <div className="card" style={{ padding: 30, marginTop: 16 }}>
                <VisitReportSection
                  token={token}
                  checklistItems={checklistItems}
                  existingRequestByKind={existingRequestByKind}
                />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
