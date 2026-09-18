import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BookingWizard from "@/components/account/BookingWizard";

export const metadata: Metadata = {
  title: "Book a visit",
};

export default async function BookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: properties }, { data: services }, { data: subscription }, { data: staff }] =
    await Promise.all([
      supabase
        .from("properties")
        .select("id, label, address_line1, city")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("services")
        .select("id, service_type, name, description, base_price_cents, member_discount_pct")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("subscriptions")
        .select(
          "id, plan_id, current_period_start, membership_plans(extra_services_discount_pct)"
        )
        .eq("customer_id", user!.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase.rpc("active_staff_directory"),
    ]);

  let entitlements: { service_type: string; quantity: number }[] = [];
  let usage: { service_type: string; used_count: number; included_count: number }[] = [];

  if (subscription) {
    const [{ data: planEntitlements }, { data: usageRows }] = await Promise.all([
      supabase
        .from("plan_entitlements")
        .select("service_type, quantity")
        .eq("plan_id", subscription.plan_id),
      supabase
        .from("entitlement_usage")
        .select("service_type, used_count, included_count")
        .eq("subscription_id", subscription.id)
        .eq("billing_period_start", subscription.current_period_start),
    ]);
    entitlements = planEntitlements ?? [];
    usage = usageRows ?? [];
  }

  if (!properties || properties.length === 0) {
    return (
      <div>
        <h3>Book a visit</h3>
        <p style={{ marginTop: 10, color: "#6a746c" }}>
          Add a property before booking your first visit.
        </p>
        <Link className="btn" href="/account/properties" style={{ marginTop: 16, display: "inline-block" }}>
          Add a property
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h3>Book a visit</h3>
      <BookingWizard
        properties={properties}
        services={services ?? []}
        hasSubscription={!!subscription}
        extraServicesDiscountPct={subscription?.membership_plans?.extra_services_discount_pct ?? 0}
        entitlements={entitlements}
        usage={usage}
        staff={staff ?? []}
      />
    </div>
  );
}
