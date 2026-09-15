import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BookingCard from "@/components/account/BookingCard";

export const metadata: Metadata = {
  title: "My Account",
};

export default async function AccountOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: subscription }, { data: bookings }, { count: propertyCount }] =
    await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, status, current_period_end, membership_plans(name, monthly_price_cents)")
        .eq("customer_id", user!.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("bookings")
        .select("id, service_type, scheduled_date, time_window, status, properties(address_line1, city)")
        .eq("customer_id", user!.id)
        .gte("scheduled_date", new Date().toISOString().slice(0, 10))
        .neq("status", "cancelled")
        .order("scheduled_date", { ascending: true })
        .limit(5),
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", user!.id),
    ]);

  const plan = subscription?.membership_plans;

  return (
    <div>
      <div className="stat-row">
        <div className="stat">
          <div className="n">{plan ? plan.name : "None"}</div>
          <div className="l">Membership</div>
        </div>
        <div className="stat">
          <div className="n">{bookings?.length ?? 0}</div>
          <div className="l">Upcoming visits</div>
        </div>
        <div className="stat">
          <div className="n">{propertyCount ?? 0}</div>
          <div className="l">{propertyCount === 1 ? "Property" : "Properties"}</div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <Link className="btn" href="/account/book">
          Book a visit
        </Link>
        {!plan && (
          <Link className="btn ghost" href="/account/membership" style={{ marginLeft: 12 }}>
            Join a membership
          </Link>
        )}
      </div>

      <div style={{ marginTop: 40 }}>
        <h3>Upcoming visits</h3>
        {!bookings || bookings.length === 0 ? (
          <p style={{ marginTop: 10, color: "#6a746c" }}>
            Nothing on the calendar yet.{" "}
            <Link href="/account/book">Book your first visit</Link>.
          </p>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
