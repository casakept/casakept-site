"use client";

import { useState } from "react";
import Link from "next/link";
import SubscribeButton from "./SubscribeButton";
import { SERVICE_LABELS, FREQUENCY_LABELS } from "@/lib/serviceLabels";
import type { BillingCadence } from "@/lib/actions/membership";
import {
  annualFactorFor,
  formatDollars,
  homeAddOnForCadence,
  homeSizeFromProperty,
  monthlyHomeAddOnCents,
  type SizeRate,
} from "@/lib/homePricing";
import { describeProperty } from "@/lib/propertyDetails";
import type { Database } from "@/lib/supabase/database.types";

// Floor rather than round, matching the public pricing page's display.
function formatCents(cents: number): string {
  return `$${Math.floor(cents / 100).toLocaleString("en-US")}`;
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

export type PickerProperty = {
  id: string;
  label: string | null;
  address_line1: string;
  city: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sq_ft_min: number | null;
  extra_rooms: string[];
};

export default function MembershipPlansPicker({
  plans,
  properties,
  sizeRates,
}: {
  plans: PickerPlan[];
  properties: PickerProperty[];
  sizeRates: SizeRate[];
}) {
  const [cadence, setCadence] = useState<BillingCadence>("monthly");
  const [propertyId, setPropertyId] = useState(properties.length === 1 ? properties[0].id : "");
  const anyAnnual = plans.some((p) => p.annualPriceCents != null);

  // A membership covers one home, and a home larger than the plan's
  // included size adds a recurring home-size amount -- so the price shown
  // depends on which home is chosen.
  const selectedProperty = properties.find((p) => p.id === propertyId) ?? null;
  const selectedHome = homeSizeFromProperty(selectedProperty);
  const homeName = selectedProperty ? selectedProperty.label || selectedProperty.address_line1 : "";

  if (properties.length === 0) {
    return (
      <div className="card" style={{ marginTop: 18, maxWidth: 520 }}>
        <p>
          A membership covers one home. Add your home first so we can price your membership for its size.
        </p>
        <Link className="btn" href="/account/properties" style={{ marginTop: 14, display: "inline-block" }}>
          Add a home
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="field" style={{ marginTop: 14, maxWidth: 420 }}>
        <label htmlFor="membership_home">Which home is this membership for?</label>
        <select id="membership_home" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          {properties.length > 1 && <option value="">Choose a home</option>}
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label || p.address_line1} — {p.city}
            </option>
          ))}
        </select>
        <p style={{ fontSize: 12, color: "#9aa49d", marginTop: 4 }}>
          Included visits apply to this home only. Another home needs its own membership.
        </p>
        {selectedProperty && describeProperty(selectedProperty) && (
          <p style={{ fontSize: 12, color: "#6a746c", marginTop: 4 }}>{describeProperty(selectedProperty)}</p>
        )}
        {selectedProperty && !selectedHome && (
          <p className="form-msg error" style={{ marginTop: 8 }}>
            This home needs its bedroom and bathroom details before we can price a membership.{" "}
            <Link href="/account/properties">Add them on your Properties page</Link>.
          </p>
        )}
      </div>

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
          const homeAddOnCents = selectedHome
            ? homeAddOnForCadence(
                monthlyHomeAddOnCents(
                  plan.entitlements.map((e) => ({
                    service_type: e.serviceType,
                    quantity: e.quantity,
                    frequency: e.frequency,
                  })),
                  sizeRates,
                  selectedHome
                ),
                usingAnnual ? "annual" : "monthly",
                annualFactorFor({ monthly_price_cents: plan.monthlyPriceCents, annual_price_cents: plan.annualPriceCents })
              )
            : 0;
          const per = usingAnnual ? "/yr" : "/mo";

          // Booking the same visits one-off at this home would carry the same
          // home-size amount, so it belongs on both sides of the comparison.
          const alaCarteCents = (usingAnnual ? plan.alaCarteMonthlyCents * 12 : plan.alaCarteMonthlyCents) + homeAddOnCents;
          const savingsCents = alaCarteCents - (displayedPriceCents + homeAddOnCents);

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
              {homeAddOnCents > 0 && (
                <p style={{ fontSize: 13, marginTop: 6 }}>
                  + {formatDollars(homeAddOnCents)}
                  {per} home size for {homeName}
                  <br />
                  <b>
                    {formatDollars(displayedPriceCents + homeAddOnCents)}
                    {per} total
                  </b>
                </p>
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
              {selectedHome ? (
                <SubscribeButton
                  planId={plan.id}
                  cadence={usingAnnual ? "annual" : "monthly"}
                  propertyId={propertyId}
                />
              ) : (
                <button className="btn" type="button" disabled>
                  {selectedProperty ? "Add home details first" : "Choose a home first"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
