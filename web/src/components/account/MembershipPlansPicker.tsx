"use client";

import { useState } from "react";
import SubscribeButton from "./SubscribeButton";
import { SERVICE_LABELS, FREQUENCY_LABELS } from "@/lib/serviceLabels";
import type { BillingCadence } from "@/lib/actions/membership";
import type { Database } from "@/lib/supabase/database.types";

// Floor rather than round, matching the public pricing page's display.
function formatCents(cents: number): string {
  return `$${Math.floor(cents / 100)}`;
}

export type PickerPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthlyPriceCents: number;
  annualPriceCents: number | null;
  extraServicesDiscountPct: number;
  minimumTermMonths: number;
  perks: string[];
  entitlements: {
    serviceType: Database["public"]["Enums"]["service_type"];
    quantity: number;
    frequency: Database["public"]["Enums"]["entitlement_frequency"];
  }[];
  // What this plan's included visits would cost booked one-off per month
  // (quarterly entitlements already normalized to a monthly rate) --
  // computed server-side since it needs the services catalog.
  alaCarteMonthlyCents: number;
};

export default function MembershipPlansPicker({ plans }: { plans: PickerPlan[] }) {
  const [cadence, setCadence] = useState<BillingCadence>("monthly");
  const anyAnnual = plans.some((p) => p.annualPriceCents != null);

  return (
    <div>
      {anyAnnual && (
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            background: "var(--sand)",
            padding: 4,
            borderRadius: 999,
            marginTop: 10,
          }}
        >
          <button
            type="button"
            className={cadence === "monthly" ? "btn" : "btn ghost"}
            style={{ padding: "6px 16px", fontSize: 13 }}
            onClick={() => setCadence("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={cadence === "annual" ? "btn" : "btn ghost"}
            style={{ padding: "6px 16px", fontSize: 13 }}
            onClick={() => setCadence("annual")}
          >
            Annual — save 10%
          </button>
        </div>
      )}

      <div className="tiers" style={{ marginTop: 22 }}>
        {plans.map((plan) => {
          const usingAnnual = cadence === "annual" && plan.annualPriceCents != null;
          const displayedPriceCents = usingAnnual ? plan.annualPriceCents! : plan.monthlyPriceCents;
          const alaCarteCents = usingAnnual ? plan.alaCarteMonthlyCents * 12 : plan.alaCarteMonthlyCents;
          const savingsCents = alaCarteCents - displayedPriceCents;

          return (
            <div className={`tier${plan.slug === "casa-familia" ? " featured" : ""}`} key={plan.id}>
              {plan.slug === "casa-familia" && <span className="badge">Most popular</span>}
              <h3>{plan.name}</h3>
              <div className="price">
                {formatCents(displayedPriceCents)}
                <small>{usingAnnual ? "/yr" : "/mo"}</small>
              </div>
              {usingAnnual && (
                <p style={{ fontSize: 12, color: "#7a8078" }}>
                  vs {formatCents(plan.monthlyPriceCents)}/mo billed monthly
                </p>
              )}
              {cadence === "annual" && plan.annualPriceCents == null && (
                <p style={{ fontSize: 12, color: "#7a8078" }}>Annual billing isn&apos;t available for this plan yet.</p>
              )}
              {savingsCents > 0 && (
                <p style={{ fontSize: 12, color: "var(--marigold)", fontWeight: 700, marginTop: 4 }}>
                  ~{formatCents(savingsCents)}
                  {usingAnnual ? "/yr" : "/mo"} less than booking these one-off ({formatCents(alaCarteCents)}
                  {usingAnnual ? "/yr" : "/mo"})
                </p>
              )}
              <ul>
                {plan.entitlements.map((e) => (
                  <li key={e.serviceType}>
                    {e.quantity}× {SERVICE_LABELS[e.serviceType] ?? e.serviceType} — {FREQUENCY_LABELS[e.frequency]}
                  </li>
                ))}
                <li>{plan.extraServicesDiscountPct}% off all other services</li>
                {plan.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
              <p
                style={{
                  fontSize: 12,
                  color: plan.slug === "casa-familia" ? "#aebbaf" : "#7a8078",
                  fontStyle: "italic",
                  marginTop: 10,
                }}
              >
                {plan.description}
              </p>
              <p style={{ fontSize: 11, color: plan.slug === "casa-familia" ? "#aebbaf" : "#9aa49d", marginTop: 8 }}>
                Renews automatically {usingAnnual ? "every year" : "every month"} until you cancel.
                {!usingAnnual && ` ${plan.minimumTermMonths}-month minimum commitment.`}
              </p>
              <SubscribeButton planId={plan.id} cadence={usingAnnual ? "annual" : "monthly"} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
