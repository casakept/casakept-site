import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";

export const metadata: Metadata = {
  title: "Admin · Overview",
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: pendingCount },
    { count: todayCount },
    { count: activeStaffCount },
    { count: activeMemberCount },
    { data: needsAttention },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .not("status", "in", "(cancelled,completed)"),
    supabase
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("bookings")
      .select(
        "id, service_type, scheduled_date, time_window, status, customer:profiles!bookings_customer_id_fkey(full_name)"
      )
      .in("status", ["pending", "confirmed"])
      .order("scheduled_date", { ascending: true })
      .limit(8),
  ]);

  return (
    <div>
      <div className="stat-row">
        <div className="stat">
          <div className="n">{pendingCount ?? 0}</div>
          <div className="l">Pending bookings</div>
        </div>
        <div className="stat">
          <div className="n">{todayCount ?? 0}</div>
          <div className="l">On the calendar today</div>
        </div>
        <div className="stat">
          <div className="n">{activeStaffCount ?? 0}</div>
          <div className="l">Active staff</div>
        </div>
        <div className="stat">
          <div className="n">{activeMemberCount ?? 0}</div>
          <div className="l">Active members</div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <Link className="btn" href="/admin/bookings">
          Go to bookings queue
        </Link>
      </div>

      <div style={{ marginTop: 40 }}>
        <h3>Needs a staff assignment</h3>
        {!needsAttention || needsAttention.length === 0 ? (
          <p style={{ marginTop: 10, color: "#6a746c" }}>
            Nothing waiting on you right now.
          </p>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {needsAttention.map((b) => (
              <div className="card" key={b.id}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <strong style={{ color: "var(--verde)" }}>
                      {SERVICE_LABELS[b.service_type] ?? b.service_type}
                    </strong>
                    <p>{b.customer?.full_name ?? "Unknown customer"}</p>
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
                      {WINDOW_LABELS[b.time_window] ?? b.time_window} · {b.status}
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
