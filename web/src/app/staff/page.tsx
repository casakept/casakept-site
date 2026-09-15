import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";

export const metadata: Metadata = {
  title: "Staff · Overview",
};

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function StaffOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const today = dateOnly(now);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [{ count: todayCount }, { count: weekCount }, { count: completedCount }, { data: upcoming }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("assigned_staff_id", user!.id)
        .eq("scheduled_date", today)
        .not("status", "in", "(cancelled)"),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("assigned_staff_id", user!.id)
        .gte("scheduled_date", dateOnly(weekStart))
        .lt("scheduled_date", dateOnly(weekEnd))
        .not("status", "in", "(cancelled)"),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("assigned_staff_id", user!.id)
        .eq("status", "completed")
        .gte("scheduled_date", dateOnly(monthStart))
        .lt("scheduled_date", dateOnly(monthEnd)),
      supabase
        .from("bookings")
        .select(
          "id, service_type, scheduled_date, time_window, status, property:properties(address_line1, city), customer:profiles!bookings_customer_id_fkey(full_name)"
        )
        .eq("assigned_staff_id", user!.id)
        .in("status", ["confirmed", "assigned", "in_progress"])
        .gte("scheduled_date", today)
        .order("scheduled_date", { ascending: true })
        .limit(5),
    ]);

  return (
    <div>
      <div className="stat-row">
        <div className="stat">
          <div className="n">{todayCount ?? 0}</div>
          <div className="l">Jobs today</div>
        </div>
        <div className="stat">
          <div className="n">{weekCount ?? 0}</div>
          <div className="l">Jobs this week</div>
        </div>
        <div className="stat">
          <div className="n">{completedCount ?? 0}</div>
          <div className="l">Completed this month</div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <Link className="btn" href="/staff/jobs">
          View all my jobs
        </Link>
      </div>

      <div style={{ marginTop: 40 }}>
        <h3>Coming up</h3>
        {!upcoming || upcoming.length === 0 ? (
          <p style={{ marginTop: 10, color: "#6a746c" }}>Nothing assigned to you yet.</p>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {upcoming.map((b) => (
              <div className="card" key={b.id}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <strong style={{ color: "var(--verde)" }}>
                      {SERVICE_LABELS[b.service_type] ?? b.service_type}
                    </strong>
                    <p>{b.customer?.full_name ?? "Customer"}</p>
                    <p>
                      {b.property?.address_line1}, {b.property?.city}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontWeight: 700, color: "var(--verde)" }}>
                      {new Date(b.scheduled_date + "T00:00:00").toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p>
                      {WINDOW_LABELS[b.time_window] ?? b.time_window} · {b.status.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
