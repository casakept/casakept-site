import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import BookingRow, { type AdminBooking } from "@/components/admin/BookingRow";
import type { Database } from "@/lib/supabase/database.types";

export const metadata: Metadata = {
  title: "Admin · Bookings",
};

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const STATUS_FILTERS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function isBookingStatusFilter(value: string): value is BookingStatus | "all" {
  return STATUS_FILTERS.some((f) => f.value === value);
}

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? params.status : "all";
  const statusFilter = isBookingStatusFilter(statusParam) ? statusParam : "all";

  const supabase = await createClient();

  let bookingsQuery = supabase
    .from("bookings")
    .select(
      `id, status, scheduled_date, time_window, service_type, price_cents, notes, condition_answers, recommended_deep, upgrade_consent_at, upgrade_max_cents, assigned_staff_id,
       customer:profiles!bookings_customer_id_fkey(full_name, phone),
       property:properties(address_line1, city),
       preferred_staff:staff!bookings_preferred_staff_id_fkey(profile:profiles!staff_id_fkey(full_name)),
       product_selections:booking_product_selections(category, product:cleaning_products(name)),
       upgrade_requests(status, reasons, amount_cents, created_at),
       arrival_photos:visit_arrival_photos(id, photo_path, created_at),
       checkin:visit_checkins(check_in_at, check_in_lat, check_in_lng, check_out_at, check_out_lat, check_out_lng)`
    )
    .order("scheduled_date", { ascending: true });

  // A "pending" booking is a checkout the customer started but hasn't paid
  // for yet -- not a real booking, so admins never see it in any view.
  bookingsQuery = bookingsQuery.neq("status", "pending");
  if (statusFilter !== "all") {
    bookingsQuery = bookingsQuery.eq("status", statusFilter);
  }

  const [{ data: bookings }, { data: staffRows }] = await Promise.all([
    bookingsQuery,
    supabase
      .from("staff")
      .select("id, profile:profiles!staff_id_fkey(full_name)")
      .eq("active", true),
  ]);

  // Arrival photos are in the private bucket -- sign them in one batch.
  const photoPaths = (bookings ?? []).flatMap((b) => b.arrival_photos.map((p) => p.photo_path));
  const photoUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await createServiceClient().storage.from("visit-photos").createSignedUrls(photoPaths, 60 * 60);
    signed?.forEach((s) => {
      if (s.signedUrl && s.path) photoUrlByPath.set(s.path, s.signedUrl);
    });
  }

  const staffOptions = (staffRows ?? [])
    .map((s) => ({ id: s.id, name: s.profile?.full_name ?? "Unnamed staff" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="admin-filters">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/admin/bookings" : `/admin/bookings?status=${f.value}`}
            aria-current={statusFilter === f.value ? "page" : undefined}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!bookings || bookings.length === 0 ? (
        <p style={{ color: "#6a746c" }}>No bookings match this filter.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {bookings.map((b) => (
            <BookingRow
              key={b.id}
              booking={
                {
                  ...b,
                  arrival_photos: b.arrival_photos
                    .slice()
                    .sort((x, y) => x.created_at.localeCompare(y.created_at))
                    .map((p) => ({ id: p.id, url: photoUrlByPath.get(p.photo_path) ?? "" }))
                    .filter((p) => p.url),
                } as AdminBooking
              }
              staffOptions={staffOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
