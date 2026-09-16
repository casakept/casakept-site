import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import ScoreBookingRow, { type ScorableBooking } from "@/components/admin/ScoreBookingRow";

export const metadata: Metadata = {
  title: "Admin · Scores",
};

export default async function AdminScoresPage() {
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      `id, service_type, scheduled_date, time_window, assigned_staff_id,
       staff:staff!bookings_assigned_staff_id_fkey(profile:profiles!staff_id_fkey(full_name)),
       customer:profiles!bookings_customer_id_fkey(full_name),
       visit_score:visit_scores(quality_score, customer_score, timeliness_score, professionalism_score, total_score, notes, event_type),
       visit_checkin:visit_checkins(check_in_at, check_out_at),
       checklist:visit_checklist_entries(completed, photo_path, item:checklist_items(name)),
       csat:csat_responses(rating, comment, responded_at)`
    )
    .eq("status", "completed")
    .not("assigned_staff_id", "is", null)
    .order("scheduled_date", { ascending: false })
    .limit(50);

  // Bucket is private -- generate short-lived signed URLs server-side for
  // any attached photos rather than exposing the bucket publicly.
  const photoPaths = (bookings ?? []).flatMap((b) =>
    b.checklist.map((c) => c.photo_path).filter((p): p is string => !!p)
  );
  const signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await createServiceClient()
      .storage.from("visit-photos")
      .createSignedUrls(photoPaths, 60 * 60);
    signed?.forEach((s) => {
      if (s.signedUrl) signedUrlByPath.set(s.path ?? "", s.signedUrl);
    });
  }
  const bookingsWithPhotoUrls = (bookings ?? []).map((b) => ({
    ...b,
    checklist: b.checklist.map((c) => ({
      ...c,
      photo_url: c.photo_path ? (signedUrlByPath.get(c.photo_path) ?? null) : null,
    })),
  }));

  return (
    <div>
      <p style={{ color: "#6a746c", marginBottom: 20 }}>
        Completed visits, most recent first. Score each visit against the Crew Performance Scorecard.
      </p>

      {bookingsWithPhotoUrls.length === 0 ? (
        <p style={{ color: "#6a746c" }}>No completed visits to score yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {bookingsWithPhotoUrls.map((b) => (
            <ScoreBookingRow key={b.id} booking={b as ScorableBooking} />
          ))}
        </div>
      )}
    </div>
  );
}
