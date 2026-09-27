import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import RedoRequestRow, { type RedoRequestRowData } from "@/components/admin/RedoRequestRow";

export const metadata: Metadata = {
  title: "Admin · Re-do requests",
};

export default async function AdminRedoRequestsPage() {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("redo_requests")
    .select(
      `id, booking_id, kind, checklist_item_ids, description, photo_path, status, reported_at, due_by, resolved_at, admin_notes, redo_booking_id,
       booking:bookings!redo_requests_booking_id_fkey(id, service_type, scheduled_date, time_window, assigned_staff_id,
         customer:profiles!bookings_customer_id_fkey(full_name),
         staff:staff!bookings_assigned_staff_id_fkey(profile:profiles!staff_id_fkey(full_name)))`
    )
    .order("reported_at", { ascending: false })
    .limit(50);

  const bookingIds = [...new Set((requests ?? []).map((r) => r.booking_id))];

  const [{ data: checklistCatalog }, { data: crewEntries }, { data: staffOptions }] = await Promise.all([
    supabase.from("checklist_items").select("id, name"),
    bookingIds.length > 0
      ? supabase
          .from("visit_checklist_entries")
          .select("booking_id, checklist_item_id, photo_path")
          .in("booking_id", bookingIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("staff")
      .select("id, profile:profiles!staff_id_fkey(full_name)")
      .eq("active", true),
  ]);

  const itemNameById = new Map((checklistCatalog ?? []).map((i) => [i.id, i.name]));
  const crewPhotoByBookingAndItem = new Map<string, string>();
  for (const entry of crewEntries ?? []) {
    if (entry.photo_path) crewPhotoByBookingAndItem.set(`${entry.booking_id}:${entry.checklist_item_id}`, entry.photo_path);
  }

  // Bucket is private -- sign every referenced path (customer reports +
  // the crew's own checklist photos for cross-reference) in one batch.
  const allPaths = [
    ...(requests ?? []).map((r) => r.photo_path).filter((p): p is string => !!p),
    ...[...crewPhotoByBookingAndItem.values()],
  ];
  const signedUrlByPath = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data: signed } = await createServiceClient()
      .storage.from("visit-photos")
      .createSignedUrls(allPaths, 60 * 60);
    signed?.forEach((s) => {
      if (s.signedUrl) signedUrlByPath.set(s.path ?? "", s.signedUrl);
    });
  }

  const rows: RedoRequestRowData[] = (requests ?? [])
    .filter((r) => r.booking)
    .map((r) => ({
      id: r.id,
      bookingId: r.booking_id,
      kind: r.kind,
      status: r.status,
      description: r.description,
      photoUrl: r.photo_path ? (signedUrlByPath.get(r.photo_path) ?? null) : null,
      reportedAt: r.reported_at,
      dueBy: r.due_by,
      resolvedAt: r.resolved_at,
      adminNotes: r.admin_notes,
      redoBookingId: r.redo_booking_id,
      flaggedItems: r.checklist_item_ids.map((itemId) => {
        const crewPath = crewPhotoByBookingAndItem.get(`${r.booking_id}:${itemId}`);
        return {
          name: itemNameById.get(itemId) ?? "Unknown item",
          crewPhotoUrl: crewPath ? (signedUrlByPath.get(crewPath) ?? null) : null,
        };
      }),
      booking: {
        serviceType: r.booking!.service_type,
        scheduledDate: r.booking!.scheduled_date,
        timeWindow: r.booking!.time_window,
        customerName: r.booking!.customer?.full_name ?? "Customer",
        staffName: r.booking!.staff?.profile?.full_name ?? null,
        assignedStaffId: r.booking!.assigned_staff_id,
      },
    }));

  const openRows = rows.filter((r) => r.status === "open").sort((a, b) => {
    if (!a.dueBy) return 1;
    if (!b.dueBy) return -1;
    return new Date(a.dueBy).getTime() - new Date(b.dueBy).getTime();
  });
  const otherRows = rows.filter((r) => r.status !== "open");

  const staffChoices = (staffOptions ?? [])
    .map((s) => ({ id: s.id, name: s.profile?.full_name ?? "Unnamed staff" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <p style={{ color: "#6a746c", marginBottom: 20 }}>
        Re-do requests (48-hour turnaround) and damage reports from the visit survey.
      </p>

      <h3>Open</h3>
      {openRows.length === 0 ? (
        <p style={{ marginTop: 10, color: "#6a746c" }}>Nothing open right now.</p>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {openRows.map((r) => (
            <RedoRequestRow key={r.id} request={r} staffOptions={staffChoices} />
          ))}
        </div>
      )}

      {otherRows.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h3>History</h3>
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {otherRows.map((r) => (
              <RedoRequestRow key={r.id} request={r} staffOptions={staffChoices} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
