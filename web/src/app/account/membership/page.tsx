import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import CancelMembershipButton from "@/components/account/CancelMembershipButton";
import PastDuePaymentBanner from "@/components/account/PastDuePaymentBanner";
import MembershipPlansPicker, { type PickerPlan } from "@/components/account/MembershipPlansPicker";
import { entitlementPeriodFor } from "@/lib/entitlements";
import { effectiveCancelDate } from "@/lib/membershipCancellation";
import { SERVICE_LABELS } from "@/lib/serviceLabels";
import type { Database } from "@/lib/supabase/database.types";

export const metadata: Metadata = {
  title: "Membership",
};

const SERVICE_TYPE_ORDER = Object.keys(SERVICE_LABELS) as Database["public"]["Enums"]["service_type"][];

export default async function MembershipPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      "id, status, created_at, current_period_start, current_period_end, minimum_term_end, cancel_at, billing_cadence, stripe_subscription_id, membership_plans(id, name, monthly_price_cents, annual_price_cents)"
    )
    .eq("customer_id", user!.id)
    .in("status", ["active", "past_due"])
    .maybeSingle();

  if (subscription && subscription.membership_plans) {
    const plan = subscription.membership_plans;
    const isAnnual = subscription.billing_cadence === "annual";
    const priceCents = isAnnual ? (plan.annual_price_cents ?? plan.monthly_price_cents) : plan.monthly_price_cents;
    const [{ data: entitlements }, { data: usage }, invoices] = await Promise.all([
      supabase
        .from("plan_entitlements")
        .select("service_type, quantity, frequency")
        .eq("plan_id", plan.id),
      // Not filtered by billing period here -- quarterly entitlements (e.g.
      // Casa Completa's deep clean) are keyed to a wider window than the
      // subscription's monthly period, so each entitlement below looks up
      // its own matching row instead.
      supabase
        .from("entitlement_usage")
        .select("service_type, used_count, included_count, billing_period_start")
        .eq("subscription_id", subscription.id),
      // Read straight from Stripe rather than mirroring invoices into our
      // own DB -- Stripe is already the source of truth for billing, and
      // this is the only place that needs the history, so there's nothing
      // to gain from a local copy that could drift.
      subscription.stripe_subscription_id
        ? stripe.invoices.list({ subscription: subscription.stripe_subscription_id, limit: 12 })
        : Promise.resolve(null),
    ]);

    return (
      <div>
        <h3>Your membership</h3>
        {subscription.status === "past_due" && <PastDuePaymentBanner />}
        <div className="card" style={{ marginTop: 14, maxWidth: 480 }}>
          <strong style={{ color: "var(--verde)", fontSize: 18 }}>{plan.name}</strong>
          <p className="price-line">
            ${(priceCents / 100).toFixed(0)}
            {isAnnual ? "/yr" : "/mo"}
          </p>
          <p style={{ marginTop: 10 }}>
            Current period ends{" "}
            {new Date(subscription.current_period_end).toLocaleDateString()}.
          </p>
          {!isAnnual && (
            <p>
              Minimum term through{" "}
              {new Date(subscription.minimum_term_end).toLocaleDateString()}.
            </p>
          )}
          <CancelMembershipButton
            cancelAt={subscription.cancel_at}
            effectiveCancelPreview={effectiveCancelDate({
              billingCadence: subscription.billing_cadence,
              minimumTermEnd: subscription.minimum_term_end,
              currentPeriodEnd: subscription.current_period_end,
            }).toISOString()}
          />
        </div>

        <h3 style={{ marginTop: 30 }}>This period&apos;s allowances</h3>
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {entitlements?.map((e) => {
            const period = entitlementPeriodFor(e.frequency, subscription.created_at, subscription.current_period_start);
            // Compare as instants, not strings -- Postgres/PostgREST may
            // serialize the stored timestamptz differently than the ISO
            // string we compute period.start as.
            const periodStartMs = new Date(period.start).getTime();
            const used =
              usage?.find(
                (u) =>
                  u.service_type === e.service_type &&
                  new Date(u.billing_period_start).getTime() === periodStartMs
              )?.used_count ?? 0;
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

        <h3 style={{ marginTop: 30 }}>Billing history</h3>
        {!invoices || invoices.data.length === 0 ? (
          <p style={{ marginTop: 10, color: "#6a746c" }}>No invoices yet.</p>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {invoices.data.map((invoice) => (
              <div key={invoice.id} className="pricerow">
                <b>
                  {new Date(invoice.created * 1000).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </b>
                <div className="dots"></div>
                <span>
                  ${(invoice.amount_paid / 100).toFixed(2)} ·{" "}
                  {invoice.status === "paid" ? "Paid" : invoice.status}
                  {invoice.hosted_invoice_url && (
                    <>
                      {" · "}
                      <a href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                        View invoice
                      </a>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const { data: plans } = await supabase
    .from("membership_plans")
    .select(
      "id, slug, name, monthly_price_cents, annual_price_cents, description, extra_services_discount_pct, minimum_term_months, perks"
    )
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const [{ data: entitlements }, { data: services }] = await Promise.all([
    supabase
      .from("plan_entitlements")
      .select("plan_id, service_type, quantity, frequency")
      .in("plan_id", (plans ?? []).map((p) => p.id)),
    supabase.from("services").select("service_type, base_price_cents").eq("active", true),
  ]);

  const servicePriceByType = new Map((services ?? []).map((s) => [s.service_type, s.base_price_cents]));

  const pickerPlans: PickerPlan[] = (plans ?? []).map((plan) => {
    const planEntitlements = (entitlements ?? [])
      .filter((e) => e.plan_id === plan.id)
      .slice()
      .sort((a, b) => SERVICE_TYPE_ORDER.indexOf(a.service_type) - SERVICE_TYPE_ORDER.indexOf(b.service_type));

    // What these same visits would cost booked one-off, so the membership
    // price can be shown against it -- plan_entitlements quantities are
    // already "per calendar month" except quarterly ones, which need
    // dividing back down to a monthly rate.
    const alaCarteMonthlyCents = planEntitlements.reduce((sum, e) => {
      const price = servicePriceByType.get(e.service_type) ?? 0;
      const monthlyQty = e.frequency === "quarterly" ? e.quantity / 3 : e.quantity;
      return sum + price * monthlyQty;
    }, 0);

    return {
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      monthlyPriceCents: plan.monthly_price_cents,
      annualPriceCents: plan.annual_price_cents,
      extraServicesDiscountPct: plan.extra_services_discount_pct,
      minimumTermMonths: plan.minimum_term_months,
      perks: plan.perks,
      entitlements: planEntitlements.map((e) => ({
        serviceType: e.service_type,
        quantity: e.quantity,
        frequency: e.frequency,
      })),
      alaCarteMonthlyCents,
    };
  });

  return (
    <div>
      <h3>Choose a membership</h3>
      <p style={{ marginTop: 8, color: "#6a746c" }}>
        Every membership includes the same crew each visit, priority
        scheduling, and a member discount on everything else.
      </p>
      <MembershipPlansPicker plans={pickerPlans} />
    </div>
  );
}
