import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SERVICE_LABELS } from "@/lib/serviceLabels";
import { businessTimestampLabel } from "@/lib/businessTime";

export const metadata: Metadata = {
  title: "Your visit",
};

export const dynamic = "force-dynamic";

// What the crew did on a completed visit, with the photos they took.
// Customers can't read checklist rows or the private photo bucket directly
// (those are crew/admin only), so ownership is checked through the
// customer's own session -- bookings_select_own RLS only returns their
// visits -- and the photos are then signed with the service client.
export default async function VisitPage({ params }: PageProps<"/account/visits/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, service_type, scheduled_date, property:properties(address_line1, city), checkin:visit_checkins(check_out_at), csat:csat_responses(token, responded_at)"
    )
    .eq("id", id)
    .eq("customer_id", user!.id)
    .maybeSingle();

  // Photos appear once the crew marks the visit complete, not while it's
  // still going on.
  if (!booking || booking.status !== "completed") notFound();

  const service = createServiceClient();
  const [{ data: entries }, { data: offer }] = await Promise.all([
    service
      .from("visit_checklist_entries")
      .select("completed, completed_at, photo_path, item:checklist_items(name, sort_order)")
      .eq("booking_id", id)
      .eq("completed", true),
    // Arrival photos stay admin-only, except the ones the customer was
    // already shown when the crew offered a deep-clean upgrade.
    service
      .from("upgrade_requests")
      .select("photo_paths")
      .eq("booking_id", id)
      .not("link_sent_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const done = (entries ?? [])
    .filter((e) => e.item)
    .sort((a, b) => a.item!.sort_order - b.item!.sort_order);
  const withPhotos = done.filter((e) => e.photo_path);
  const withoutPhotos = done.filter((e) => !e.photo_path);

  const paths = [...withPhotos.map((e) => e.photo_path!), ...(offer?.photo_paths ?? [])];
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await service.storage.from("visit-photos").createSignedUrls(paths, 60 * 60);
    signed?.forEach((s) => {
      if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl);
    });
  }
  const sharedUrls = (offer?.photo_paths ?? []).map((p) => urlByPath.get(p)).filter((u): u is string => !!u);

  const completedAt = booking.checkin?.check_out_at ? businessTimestampLabel(new Date(booking.checkin.check_out_at)) : null;
  const surveyToken = booking.csat?.token ?? null;

  return (
    <div>
      <Link href="/account" style={{ fontSize: 13, color: "#6a746c" }}>
        ← Back to your account
      </Link>
      <h3 style={{ marginTop: 12 }}>
        {SERVICE_LABELS[booking.service_type] ?? booking.service_type} ·{" "}
        {new Date(`${booking.scheduled_date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </h3>
      <p style={{ color: "#6a746c", marginTop: 4 }}>
        {booking.property?.address_line1}, {booking.property?.city}
        {completedAt ? ` · finished ${completedAt}` : ""}
      </p>

      {done.length === 0 ? (
        <p style={{ marginTop: 20, color: "#6a746c" }}>The checklist for this visit isn&apos;t available.</p>
      ) : (
        <>
          {withPhotos.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <p style={{ fontWeight: 700, color: "var(--verde)" }}>Photo-verified</p>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
                {withPhotos.map((e) => {
                  const url = urlByPath.get(e.photo_path!);
                  return (
                    <div key={e.photo_path}>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Image
                            src={url}
                            alt={`${e.item!.name}, photographed by your crew`}
                            width={170}
                            height={130}
                            loading="eager"
                            unoptimized
                            style={{ objectFit: "cover", width: "100%", height: 130, borderRadius: 10, border: "1.5px solid var(--line)" }}
                          />
                        </a>
                      ) : (
                        <div style={{ height: 130, borderRadius: 10, border: "1.5px solid var(--line)" }} />
                      )}
                      <p style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>✓ {e.item!.name}</p>
                      {e.completed_at && (
                        <p style={{ fontSize: 11, color: "#9aa49d" }}>{businessTimestampLabel(new Date(e.completed_at))}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {withoutPhotos.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <p style={{ fontWeight: 700, color: "var(--verde)" }}>Also completed</p>
              <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4, fontSize: 14 }}>
                {withoutPhotos.map((e) => (
                  <li key={e.item!.name}>✓ {e.item!.name}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {sharedUrls.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontWeight: 700, color: "var(--verde)" }}>Photos your crew shared during the visit</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {sharedUrls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                <Image
                  src={url}
                  alt="Photo from your home taken by your crew"
                  width={96}
                  height={96}
                  unoptimized
                  style={{ objectFit: "cover", borderRadius: 8, border: "1.5px solid var(--line)" }}
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {surveyToken && (
        <div style={{ marginTop: 28 }}>
          <Link className="btn ghost" href={`/survey/${surveyToken}`} style={{ padding: "6px 16px", fontSize: 13 }}>
            {booking.csat?.responded_at ? "Report a problem with this visit" : "Rate this visit or report a problem"}
          </Link>
        </div>
      )}
    </div>
  );
}
