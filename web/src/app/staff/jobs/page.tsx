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
      "id, status, scheduled_date, time_window, service_type, notes, customer:profiles!bookings_customer_id_fkey(full_name, phone), property:properties(address_line1, city), checkin:visit_checkins(check_in_at, check_out_at)"
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

  const { data: jobs } = await query;

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
            <JobRow key={job.id} job={job as StaffJob} staffId={user!.id} />
          ))}
        </div>
      )}
    </div>
  );
}
