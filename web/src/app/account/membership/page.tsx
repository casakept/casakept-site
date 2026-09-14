import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import SubscribeButton from "@/components/account/SubscribeButton";
import CancelMembershipButton from "@/components/account/CancelMembershipButton";
import PastDuePaymentBanner from "@/components/account/PastDuePaymentBanner";

export const metadata: Metadata = {
  title: "Membership",
};

const SERVICE_LABELS: Record<string, string> = {
  standard_clean: "Standard clean",
  deep_clean: "Deep clean",
  laundry: "Laundry bag",
  grocery: "Grocery run",
  fridge_restock: "Fridge restock",
  cocina_meal: "Cocina meal drop",
  errand: "Errand",
};

export default async function MembershipPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      "id, status, current_period_start, current_period_end, minimum_term_end, cancel_at_period_end, membership_plans(id, name, monthly_price_cents)"
    )
    .eq("customer_id", user!.id)
    .in("status", ["active", "past_due"])
    .maybeSingle();

  if (subscription && subscription.membership_plans) {
    const plan = subscription.membership_plans;
    const [{ data: entitlements }, { data: usage }] = await Promise.all([
      supabase
        .from("plan_entitlements")
        .select("service_type, quantity, frequency")
        .eq("plan_id", plan.id),
      supabase
        .from("entitlement_usage")
        .select("service_type, used_count, included_count")
        .eq("subscription_id", subscription.id)
        .eq("billing_period_start", subscription.current_period_start),
    ]);

    return (
      <div>
        <h3>Your membership</h3>
        {subscription.status === "past_due" && <PastDuePaymentBanner />}
        <div className="card" style={{ marginTop: 14, maxWidth: 480 }}>
          <strong style={{ color: "var(--verde)", fontSize: 18 }}>{plan.name}</strong>
          <p className="price-line">${(plan.monthly_price_cents / 100).toFixed(0)}/mo</p>
          <p style={{ marginTop: 10 }}>
            Current period ends{" "}
            {new Date(subscription.current_period_end).toLocaleDateString()}.
          </p>
          <p>
            Minimum term through{" "}
            {new Date(subscription.minimum_term_end).toLocaleDateString()}.
          </p>
          <CancelMembershipButton
            cancelAtPeriodEnd={subscription.cancel_at_period_end}
            currentPeriodEnd={subscription.current_period_end}
          />
        </div>

        <h3 style={{ marginTop: 30 }}>This period&apos;s allowances</h3>
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {entitlements?.map((e) => {
            const used = usage?.find((u) => u.service_type === e.service_type)?.used_count ?? 0;
            return (
              <div key={e.service_type} className="pricerow">
                <b>{SERVICE_LABELS[e.service_type] ?? e.service_type}</b>
                <div className="dots"></div>
                <span>
                  {used} of {e.quantity} used
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const { data: plans } = await supabase
    .from("membership_plans")
    .select("id, slug, name, monthly_price_cents, description, extra_services_discount_pct")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  return (
    <div>
      <h3>Choose a membership</h3>
      <p style={{ marginTop: 8, color: "#6a746c" }}>
        Every membership includes the same crew each visit, priority
        scheduling, and a member discount on everything else.
      </p>
      <div className="tiers" style={{ marginTop: 22 }}>
        {plans?.map((plan) => (
          <div className={`tier${plan.slug === "casa-familia" ? " featured" : ""}`} key={plan.id}>
            {plan.slug === "casa-familia" && <span className="badge">Most popular</span>}
            <h3>{plan.name}</h3>
            <div className="price">
              ${(plan.monthly_price_cents / 100).toFixed(0)}
              <small>/mo</small>
            </div>
            <p style={{ fontSize: 13 }}>{plan.description}</p>
            <p style={{ fontSize: 12, marginTop: 10, opacity: 0.8 }}>
              {plan.extra_services_discount_pct}% off other services
            </p>
            <SubscribeButton planId={plan.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
