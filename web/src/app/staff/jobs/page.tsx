import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import JobRow, { type StaffJob } from "@/components/staff/JobRow";

export const metadata: Metadata = {
  title: "Staff · My jobs",
};

const FILTERS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

function isFilter(value: string): value is Filter {
  return FILTERS.some((f) => f.value === value);
}

export default async function StaffJobsPage({ searchParams }: PageProps<"/staff/jobs">) {
  const params = await searchParams;
  const filterParam = typeof params.filter === "string" ? params.filter : "upcoming";
  const filter = isFilter(filterParam) ? filterParam : "upcoming";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("bookings")
    .select(
      "id, status, scheduled_date, time_window, service_type, property_id, notes, customer:profiles!bookings_customer_id_fkey(full_name, phone), property:properties(address_line1, city), checkin:visit_checkins(check_in_at, check_out_at), checklist:visit_checklist_entries(checklist_item_id, completed, photo_path), product_selections:booking_product_selections(category, product:cleaning_products(name))"
    )
    .eq("assigned_staff_id", user!.id)
    .order("scheduled_date", { ascending: filter !== "completed" });

  if (filter === "upcoming") {
    query = query.in("status", ["confirmed", "assigned", "in_progress"]);
  } else if (filter === "completed") {
    query = query.eq("status", "completed");
  } else if (filter === "cancelled") {
    query = query.eq("status", "cancelled");
  }

  const [{ data: jobs }, { data: checklistItems }] = await Promise.all([
    query,
    supabase
      .from("checklist_items")
      .select("id, name, deep_clean_only, requires_photo, rotation_zone, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);

  // Standard Clean rotation: which of the two detail zones applies to a
  // given property alternates by how many prior completed Standard Clean
  // visits that property has had (visit 1 = kitchen_bath, visit 2 =
  // bed_living, repeat). Computed per-property, not per-customer, since a
  // household's second property runs its own cycle.
  const standardCleanPropertyIds = Array.from(
    new Set((jobs ?? []).filter((j) => j.service_type === "standard_clean").map((j) => j.property_id))
  );
  const rotationZoneByProperty = new Map<string, "kitchen_bath" | "bed_living">();
  if (standardCleanPropertyIds.length > 0) {
    const { data: priorCompleted } = await supabase
      .from("bookings")
      .select("property_id")
      .eq("service_type", "standard_clean")
      .eq("status", "completed")
      .in("property_id", standardCleanPropertyIds);
    const countByProperty = new Map<string, number>();
    for (const b of priorCompleted ?? []) {
      countByProperty.set(b.property_id, (countByProperty.get(b.property_id) ?? 0) + 1);
    }
    for (const propertyId of standardCleanPropertyIds) {
      const count = countByProperty.get(propertyId) ?? 0;
      rotationZoneByProperty.set(propertyId, count % 2 === 0 ? "kitchen_bath" : "bed_living");
    }
  }

  return (
    <div>
      <div className="admin-filters">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "upcoming" ? "/staff/jobs" : `/staff/jobs?filter=${f.value}`}
            aria-current={filter === f.value ? "page" : undefined}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!jobs || jobs.length === 0 ? (
        <p style={{ marginTop: 16, color: "#6a746c" }}>No jobs in this view.</p>
      ) : (
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job as StaffJob}
              staffId={user!.id}
              checklistItems={checklistItems ?? []}
              rotationZone={rotationZoneByProperty.get(job.property_id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
