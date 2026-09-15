import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_LABELS, WINDOW_LABELS } from "@/lib/serviceLabels";

export const metadata: Metadata = {
  title: "Admin · Customer",
};

const SUBSCRIPTION_BADGE: Record<string, string> = {
  active: "confirmed",
  past_due: "pending",
  paused: "assigned",
  cancelled: "cancelled",
};

export default async function AdminCustomerDetailPage({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, created_at")
    .eq("id", id)
    .eq("role", "customer")
    .maybeSingle();
  if (!customer) notFound();

  const [{ data: properties }, { data: subscription }, { data: bookings }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, label, address_line1, address_line2, city, state, zip, access_notes")
      .eq("customer_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("subscriptions")
      .select(
        "status, current_period_end, minimum_term_end, cancel_at_period_end, membership_plans(name, monthly_price_cents)"
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select(
        `id, status, scheduled_date, time_window, service_type, price_cents,
         property:properties(address_line1, city),
         assigned_staff:staff!bookings_assigned_staff_id_fkey(profile:profiles!staff_id_fkey(full_name))`
      )
      .eq("customer_id", id)
      .order("scheduled_date", { ascending: false })
      .limit(15),
  ]);

  return (
    <div>
      <Link href="/admin/customers" style={{ fontSize: 13, color: "#6a746c" }}>
        ← All customers
      </Link>

      <h3 style={{ marginTop: 16 }}>{customer.full_name ?? "Unnamed customer"}</h3>
      <p>
        {customer.email}
        {customer.phone ? ` · ${customer.phone}` : ""}
      </p>
      <p style={{ fontSize: 12, color: "#9aa49d" }}>
        Customer since{" "}
        {new Date(customer.created_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      <div style={{ marginTop: 32 }}>
        <h3>Membership</h3>
        {!subscription || !subscription.membership_plans ? (
          <p style={{ marginTop: 10, color: "#6a746c" }}>No membership.</p>
        ) : (
          <div className="card" style={{ marginTop: 14, maxWidth: 480 }}>
            <strong style={{ color: "var(--verde)", fontSize: 18 }}>
              {subscription.membership_plans.name}
            </strong>{" "}
            <span className={`status-badge ${SUBSCRIPTION_BADGE[subscription.status] ?? "cancelled"}`}>
              {subscription.status.replace("_", " ")}
            </span>
            <p className="price-line">${(subscription.membership_plans.monthly_price_cents / 100).toFixed(0)}/mo</p>
            <p style={{ marginTop: 10 }}>
              Current period ends {new Date(subscription.current_period_end).toLocaleDateString()}.
            </p>
            <p>Minimum term through {new Date(subscription.minimum_term_end).toLocaleDateString()}.</p>
            {subscription.cancel_at_period_end && (
              <p style={{ color: "var(--chile)" }}>Cancels at period end.</p>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 32 }}>
        <h3>Properties</h3>
        {!properties || properties.length === 0 ? (
          <p style={{ marginTop: 10, color: "#6a746c" }}>No properties on file.</p>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {properties.map((p) => (
              <div className="card" key={p.id}>
                {p.label && <strong style={{ color: "var(--verde)" }}>{p.label}</strong>}
                <p>
                  {p.address_line1}
                  {p.address_line2 ? `, ${p.address_line2}` : ""}
                  <br />
                  {p.city}, {p.state} {p.zip}
                </p>
                {p.access_notes && (
                  <p style={{ fontSize: 12, color: "#9aa49d", marginTop: 6 }}>{p.access_notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 32 }}>
        <h3>Booking history</h3>
        {!bookings || bookings.length === 0 ? (
          <p style={{ marginTop: 10, color: "#6a746c" }}>No bookings yet.</p>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {bookings.map((b) => (
              <div className="card" key={b.id}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <strong style={{ color: "var(--verde)" }}>
                      {SERVICE_LABELS[b.service_type] ?? b.service_type}
                    </strong>{" "}
                    <span className={`status-badge ${b.status}`}>{b.status.replace("_", " ")}</span>
                    <p>
                      {b.property?.address_line1}, {b.property?.city}
                    </p>
                    {b.assigned_staff?.profile?.full_name && (
                      <p style={{ fontSize: 12, color: "#9aa49d" }}>
                        Assigned: {b.assigned_staff.profile.full_name}
                      </p>
                    )}
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
                      {WINDOW_LABELS[b.time_window] ?? b.time_window} · ${(b.price_cents / 100).toFixed(0)}
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
