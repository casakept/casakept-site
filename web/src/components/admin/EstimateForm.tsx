"use client";

import { useActionState } from "react";
import { createEstimateAction, type EstimateActionState } from "@/lib/actions/admin-estimates";
import {
  ACK_TERMS,
  CONDITION_CATEGORIES,
  PREFERRED_DAYS,
  PREFERRED_WINDOWS,
  PRODUCT_PREFERENCES,
  QTY_SERVICE_TYPES,
  formatCents,
} from "@/lib/estimateForm";
import SignaturePad from "./SignaturePad";
import type { Database } from "@/lib/supabase/database.types";

type MembershipPlan = {
  id: string;
  name: string;
  monthly_price_cents: number;
  description: string | null;
};

type ServiceCatalogItem = {
  id: string;
  service_type: Database["public"]["Enums"]["service_type"];
  name: string;
  base_price_cents: number;
};

const initialState: EstimateActionState = {};

export default function EstimateForm({
  plans,
  services,
}: {
  plans: MembershipPlan[];
  services: ServiceCatalogItem[];
}) {
  const [state, formAction, pending] = useActionState(createEstimateAction, initialState);

  return (
    <form action={formAction}>
      {state.error && <p className="form-msg error">{state.error}</p>}

      {/* 1 -- home & contact */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3>1 — Home &amp; contact</h3>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
          <div className="field" style={{ flex: "1 1 220px" }}>
            <label htmlFor="contact_name">Name</label>
            <input id="contact_name" name="contact_name" type="text" required />
          </div>
          <div className="field" style={{ flex: "1 1 180px" }}>
            <label htmlFor="contact_phone">Phone / text</label>
            <input id="contact_phone" name="contact_phone" type="tel" />
          </div>
          <div className="field" style={{ flex: "1 1 220px" }}>
            <label htmlFor="contact_email">Email</label>
            <input id="contact_email" name="contact_email" type="email" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div className="field" style={{ flex: "2 1 260px" }}>
            <label htmlFor="address_line1">Address</label>
            <input id="address_line1" name="address_line1" type="text" required />
          </div>
          <div className="field" style={{ flex: "1 1 140px" }}>
            <label htmlFor="city">City</label>
            <input id="city" name="city" type="text" required />
          </div>
          <div className="field" style={{ flex: "1 1 100px" }}>
            <label htmlFor="zip">Zip</label>
            <input id="zip" name="zip" type="text" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div className="field" style={{ flex: "1 1 140px" }}>
            <label htmlFor="approx_sq_ft">Approx. sq ft</label>
            <input id="approx_sq_ft" name="approx_sq_ft" type="number" min={0} />
          </div>
          <div className="field" style={{ flex: "1 1 100px" }}>
            <label htmlFor="bedrooms">Beds</label>
            <input id="bedrooms" name="bedrooms" type="number" min={0} />
          </div>
          <div className="field" style={{ flex: "1 1 100px" }}>
            <label htmlFor="bathrooms">Baths</label>
            <input id="bathrooms" name="bathrooms" type="number" min={0} step={0.5} />
          </div>
          <div className="field" style={{ flex: "1 1 100px" }}>
            <label htmlFor="stories">Stories</label>
            <input id="stories" name="stories" type="number" min={1} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6 }}>
          <label className="form-check" style={{ margin: 0 }}>
            <input type="checkbox" name="has_pets" /> Pets
          </label>
          <label className="form-check" style={{ margin: 0 }}>
            <input type="checkbox" name="has_alarm" /> Alarm system
          </label>
          <label className="form-check" style={{ margin: 0 }}>
            <input type="checkbox" name="gate_code_needed" /> Gate/lockbox code needed
          </label>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
          <div className="field" style={{ flex: "1 1 220px" }}>
            <label htmlFor="pets_notes">Pet notes (type / #)</label>
            <input id="pets_notes" name="pets_notes" type="text" />
          </div>
          <div className="field" style={{ flex: "1 1 180px" }}>
            <label htmlFor="preferred_entry">Preferred entry</label>
            <input id="preferred_entry" name="preferred_entry" type="text" />
          </div>
          <div className="field" style={{ flex: "1 1 180px" }}>
            <label htmlFor="product_preference">Products</label>
            <select id="product_preference" name="product_preference" defaultValue="standard">
              {PRODUCT_PREFERENCES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2 -- condition at walkthrough */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3>2 — Condition at walkthrough</h3>
        <p style={{ fontSize: 12, color: "#6a746c", marginTop: 4 }}>1 = needs deep reset · 5 = well maintained</p>
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          {CONDITION_CATEGORIES.map((cat) => (
            <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, width: 220 }}>{cat.label}</span>
              <div style={{ display: "flex", gap: 10 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 3 }}>
                    <input type="radio" name={cat.key} value={n} /> {n}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="condition_notes">Notes / problem areas / off-limits rooms</label>
          <textarea id="condition_notes" name="condition_notes" rows={2} />
        </div>
      </div>

      {/* 3 -- estimate worksheet */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3>3 — Estimate worksheet</h3>

        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--verde)", marginTop: 16 }}>
          Membership
        </p>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {plans.map((plan) => (
            <label key={plan.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <input type="radio" name="plan_id" value={plan.id} />
              <strong>{plan.name}</strong>
              <span style={{ color: "#6a746c" }}>{plan.description}</span>
              <span style={{ marginLeft: "auto", fontWeight: 700 }}>{formatCents(plan.monthly_price_cents)}/mo</span>
            </label>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <input type="radio" name="plan_id" value="" defaultChecked /> No membership (one-time services only)
          </label>
        </div>
        <label className="form-check" style={{ marginTop: 12 }}>
          <input type="checkbox" name="onboarding_deep_clean" /> Onboarding deep clean (50% off with membership)
        </label>
        <p style={{ fontSize: 11, color: "#9aa49d" }}>
          Size adjustment over 2,500 sq ft (+$30/500 sq ft) is added automatically based on section 1.
        </p>

        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--verde)", marginTop: 22 }}>
          One-time / add-ons
        </p>
        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
          {services.map((svc) => (
            <div key={svc.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 260px" }}>
                <input type="checkbox" name={`svc_${svc.id}`} /> {svc.name}
              </label>
              {QTY_SERVICE_TYPES.has(svc.service_type) && (
                <label style={{ fontSize: 11, color: "#6a746c" }}>
                  Qty{" "}
                  <input
                    type="number"
                    name={`qty_${svc.id}`}
                    min={1}
                    defaultValue={1}
                    style={{ width: 60, display: "inline-block" }}
                  />
                </label>
              )}
              <label style={{ fontSize: 11, color: "#6a746c" }}>
                Unit price{" "}
                <input
                  type="number"
                  name={`price_${svc.id}`}
                  min={0}
                  step={1}
                  defaultValue={svc.base_price_cents}
                  style={{ width: 90, display: "inline-block" }}
                />{" "}
                ¢
              </label>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--verde)" }}>
            Preferred schedule
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
            {PREFERRED_DAYS.map((d) => (
              <label key={d.value} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <input type="checkbox" name="preferred_days" value={d.value} /> {d.label}
              </label>
            ))}
            {PREFERRED_WINDOWS.map((w) => (
              <label key={w.value} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <input type="radio" name="preferred_window" value={w.value} /> {w.label}
              </label>
            ))}
            <label style={{ fontSize: 12 }}>
              Target start{" "}
              <input type="date" name="target_start_date" style={{ display: "inline-block" }} />
            </label>
          </div>
        </div>
      </div>

      {/* 4 -- scope acknowledgment */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3>4 — Scope acknowledgment</h3>
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {ACK_TERMS.map((term) => (
            <label key={term.key} className="form-check" style={{ margin: 0 }}>
              <input type="checkbox" name={term.key} />
              <span>{term.text}</span>
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 30, flexWrap: "wrap", marginTop: 20 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--verde)", marginBottom: 6 }}>
              Customer signature
            </p>
            <SignaturePad name="customer_signature" />
          </div>
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="notes">Internal notes</label>
          <textarea id="notes" name="notes" rows={2} />
        </div>
      </div>

      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save estimate"}
      </button>
    </form>
  );
}
