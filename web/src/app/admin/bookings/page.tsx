import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BookingRow, { type AdminBooking } from "@/components/admin/BookingRow";
import type { Database } from "@/lib/supabase/database.types";

export const metadata: Metadata = {
  title: "Admin · Bookings",
};

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const STATUS_FILTERS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
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
      `id, status, scheduled_date, time_window, service_type, price_cents, notes, assigned_staff_id,
       customer:profiles!bookings_customer_id_fkey(full_name, phone),
       property:properties(address_line1, city),
       preferred_staff:staff!bookings_preferred_staff_id_fkey(profile:profiles!staff_id_fkey(full_name)),
       product_selections:booking_product_selections(category, product:cleaning_products(name)),
       checkin:visit_checkins(check_in_at, check_in_lat, check_in_lng, check_out_at, check_out_lat, check_out_lng)`
    )
    .order("scheduled_date", { ascending: true });

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
            <BookingRow key={b.id} booking={b as AdminBooking} staffOptions={staffOptions} />
          ))}
        </div>
      )}
    </div>
  );
}
