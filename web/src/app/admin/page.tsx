import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";
import { businessDateISO } from "@/lib/businessTime";

export const metadata: Metadata = {
  title: "Admin · Overview",
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const today = businessDateISO();

  const [
    { count: needsAssignmentCount },
    { count: todayCount },
    { count: activeStaffCount },
    { count: activeMemberCount },
    { data: needsAttention },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .not("status", "in", "(pending,cancelled,completed)"),
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
        "id, customer_id, service_type, scheduled_date, time_window, status, customer:profiles!bookings_customer_id_fkey(full_name)"
      )
      .eq("status", "confirmed")
      .order("scheduled_date", { ascending: true })
      .limit(8),
  ]);

  // Members get priority in this queue -- sorted to the top (stable sort,
  // so within each group the original scheduled_date ordering holds) and
  // badged, so whoever's triaging this list sees them first. Scoped to just
  // the customer_ids already on screen rather than a broader membership
  // query, since this only needs to reorder what's already here.
  const needsAttentionCustomerIds = [...new Set((needsAttention ?? []).map((b) => b.customer_id))];
  const { data: memberSubs } =
    needsAttentionCustomerIds.length > 0
      ? await supabase
          .from("subscriptions")
          .select("customer_id")
          .eq("status", "active")
          .in("customer_id", needsAttentionCustomerIds)
      : { data: [] };
  const memberCustomerIds = new Set((memberSubs ?? []).map((s) => s.customer_id));
  const sortedNeedsAttention = [...(needsAttention ?? [])].sort(
    (a, b) => Number(!memberCustomerIds.has(a.customer_id)) - Number(!memberCustomerIds.has(b.customer_id))
  );

  return (
    <div>
      <div className="stat-row">
        <div className="stat">
          <div className="n">{needsAssignmentCount ?? 0}</div>
          <div className="l">Needs assignment</div>
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
        {sortedNeedsAttention.length === 0 ? (
          <p style={{ marginTop: 10, color: "#6a746c" }}>
            Nothing waiting on you right now.
          </p>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {sortedNeedsAttention.map((b) => (
              <div className="card" key={b.id}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <strong style={{ color: "var(--verde)" }}>
                      {SERVICE_LABELS[b.service_type] ?? b.service_type}
                    </strong>{" "}
                    {memberCustomerIds.has(b.customer_id) && (
                      <span className="status-badge founding">Member</span>
                    )}
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
