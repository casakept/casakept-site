"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { createBookingAction, type BookingActionState } from "@/lib/actions/bookings";
import { StripePaymentForm } from "@/components/stripe/PaymentForm";
import ServiceDetailModal from "@/components/account/ServiceDetailModal";
import { SERVICE_CATEGORIES } from "@/lib/serviceCategories";

type Property = { id: string; label: string | null; address_line1: string; city: string };
type Service = {
  id: string;
  service_type: string;
  name: string;
  description: string | null;
  base_price_cents: number;
  member_discount_pct: number;
};
type Entitlement = { service_type: string; quantity: number };
type Usage = { service_type: string; used_count: number; included_count: number };
type StaffMember = { id: string; full_name: string | null };

const CLEANING_SERVICE_TYPES = new Set(["standard_clean", "deep_clean"]);
const WINDOW_LABELS: Record<string, string> = {
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
};

const initialState: BookingActionState = {};

export default function BookingWizard({
  properties,
  services,
  hasSubscription,
  extraServicesDiscountPct,
  entitlements,
  usage,
  staff,
}: {
  properties: Property[];
  services: Service[];
  hasSubscription: boolean;
  extraServicesDiscountPct: number;
  entitlements: Entitlement[];
  usage: Usage[];
  staff: StaffMember[];
}) {
  const [state, formAction, pending] = useActionState(createBookingAction, initialState);
  const [paid, setPaid] = useState(false);

  const [step, setStep] = useState(1);
  const [propertyId, setPropertyId] = useState(properties.length === 1 ? properties[0].id : "");
  const [serviceId, setServiceId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [timeWindow, setTimeWindow] = useState("");
  const [preferredStaffId, setPreferredStaffId] = useState("");
  const [notes, setNotes] = useState("");
  const [detailService, setDetailService] = useState<Service | null>(null);

  const servicesByCategory = useMemo(() => {
    return SERVICE_CATEGORIES.map((category) => ({
      label: category.label,
      services: services.filter((s) => (category.types as string[]).includes(s.service_type)),
    })).filter((group) => group.services.length > 0);
  }, [services]);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const isCleaning = selectedService ? CLEANING_SERVICE_TYPES.has(selectedService.service_type) : false;

  const coverage = useMemo(() => {
    if (!hasSubscription || !selectedService) return null;
    const included = entitlements
      .filter((e) => e.service_type === selectedService.service_type)
      .reduce((sum, e) => sum + e.quantity, 0);
    if (included === 0) return null;
    const used = usage.find((u) => u.service_type === selectedService.service_type)?.used_count ?? 0;
    return { included, used, remaining: Math.max(included - used, 0) };
  }, [hasSubscription, selectedService, entitlements, usage]);

  const priceCents = useMemo(() => {
    if (!selectedService) return 0;
    if (coverage && coverage.remaining > 0) return 0;
    if (hasSubscription) {
      // Mirrors createBookingAction: some services carry their own member
      // rate that's more generous than the plan's blanket discount.
      const discountPct = Math.max(extraServicesDiscountPct, selectedService.member_discount_pct);
      return Math.round(selectedService.base_price_cents * (1 - discountPct / 100));
    }
    return selectedService.base_price_cents;
  }, [selectedService, coverage, hasSubscription, extraServicesDiscountPct]);

  const today = new Date().toISOString().slice(0, 10);

  const stepValid = {
    1: !!propertyId,
    2: !!serviceId,
    3: !!scheduledDate && !!timeWindow,
    4: true,
  } as const;

  const totalSteps = isCleaning ? 4 : 3;
  const confirmStep = totalSteps + 1;

  if (state.success || paid) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <strong style={{ color: "var(--verde)" }}>Visit booked.</strong>
        <p style={{ marginTop: 8 }}>
          We&apos;ll see you {scheduledDate} in the {WINDOW_LABELS[timeWindow]?.toLowerCase()}.
        </p>
        <Link className="btn" href="/account" style={{ marginTop: 16, display: "inline-block" }}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (state.clientSecret) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <strong>Pay to confirm your visit</strong>
        <p style={{ marginTop: 8 }}>
          ${(priceCents / 100).toFixed(0)} for {selectedService?.name} on{" "}
          {scheduledDate}, {WINDOW_LABELS[timeWindow]?.toLowerCase()}.
        </p>
        <StripePaymentForm
          clientSecret={state.clientSecret}
          onSuccess={() => setPaid(true)}
          submitLabel={`Pay $${(priceCents / 100).toFixed(0)}`}
        />
      </div>
    );
  }

  return (
    <>
    <form action={formAction}>
      <input type="hidden" name="property_id" value={propertyId} />
      <input type="hidden" name="service_id" value={serviceId} />
      <input type="hidden" name="scheduled_date" value={scheduledDate} />
      <input type="hidden" name="time_window" value={timeWindow} />
      <input type="hidden" name="preferred_staff_id" value={preferredStaffId} />
      <input type="hidden" name="notes" value={notes} />

      <div className="wizard-steps">
        <span className={step === 1 ? "active" : step > 1 ? "done" : ""}>1. Property</span>
        <span className={step === 2 ? "active" : step > 2 ? "done" : ""}>2. Service</span>
        <span className={step === 3 ? "active" : step > 3 ? "done" : ""}>3. Date &amp; time</span>
        {isCleaning && (
          <span className={step === 4 ? "active" : step > 4 ? "done" : ""}>4. Cleaner</span>
        )}
        <span className={step === confirmStep ? "active" : ""}>{confirmStep}. Confirm</span>
      </div>

      {state.error && <p className="form-msg error">{state.error}</p>}

      {step === 1 && (
        <div className="option-grid">
          {properties.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`option-card${propertyId === p.id ? " selected" : ""}`}
              onClick={() => setPropertyId(p.id)}
            >
              <div className="t">{p.label || p.address_line1}</div>
              <div className="d">
                {p.address_line1}, {p.city}
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div style={{ marginTop: 8 }}>
          {servicesByCategory.map((group) => (
            <div key={group.label} style={{ marginBottom: 24 }}>
              <p className="room">{group.label}</p>
              <div className="option-grid">
                {group.services.map((s) => (
                  <div key={s.id} className="option-card-wrap">
                    <button
                      type="button"
                      className={`option-card${serviceId === s.id ? " selected" : ""}`}
                      onClick={() => setServiceId(s.id)}
                    >
                      <div className="t">{s.name}</div>
                      {s.description && <div className="d">{s.description}</div>}
                      <div className="p">${(s.base_price_cents / 100).toFixed(0)}</div>
                    </button>
                    <button
                      type="button"
                      className="option-details-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailService(s);
                      }}
                    >
                      See full details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "grid", gap: 12, maxWidth: 360, marginTop: 18 }}>
          <div className="field">
            <label htmlFor="scheduled_date">Date</label>
            <input
              id="scheduled_date"
              type="date"
              min={today}
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="time_window">Time window</label>
            <select
              id="time_window"
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
            >
              <option value="">Choose one</option>
              {Object.entries(WINDOW_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {step === 4 && isCleaning && (
        <div className="option-grid">
          <button
            type="button"
            className={`option-card${preferredStaffId === "" ? " selected" : ""}`}
            onClick={() => setPreferredStaffId("")}
          >
            <div className="t">No preference</div>
            <div className="d">Next available crew member.</div>
          </button>
          {staff.map((member) => (
            <button
              key={member.id}
              type="button"
              className={`option-card${preferredStaffId === member.id ? " selected" : ""}`}
              onClick={() => setPreferredStaffId(member.id)}
            >
              <div className="t">{member.full_name || "Crew member"}</div>
            </button>
          ))}
        </div>
      )}

      {step === confirmStep && (
        <div style={{ marginTop: 18 }}>
          <div className="card" style={{ maxWidth: 420 }}>
            <p>
              <b>{selectedService?.name}</b> at{" "}
              {properties.find((p) => p.id === propertyId)?.label ||
                properties.find((p) => p.id === propertyId)?.address_line1}
            </p>
            <p style={{ marginTop: 6 }}>
              {scheduledDate}, {WINDOW_LABELS[timeWindow]}
            </p>
            {isCleaning && (
              <p style={{ marginTop: 6 }}>
                Preferred cleaner:{" "}
                {staff.find((m) => m.id === preferredStaffId)?.full_name || "No preference"}
              </p>
            )}
            <p className="price-line" style={{ marginTop: 10 }}>
              {priceCents === 0 ? "Covered by membership" : `$${(priceCents / 100).toFixed(0)}`}
            </p>
          </div>

          <div className="field" style={{ maxWidth: 420, marginTop: 14 }}>
            <label htmlFor="notes">Notes for the crew (optional)</label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
            <button className="btn" type="submit" disabled={pending}>
              {pending ? "Booking…" : "Confirm booking"}
            </button>
          </div>
        </div>
      )}

      {step !== confirmStep && (
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          {step > 1 && (
            <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <button
            type="button"
            className="btn"
            disabled={!stepValid[step as 1 | 2 | 3 | 4]}
            onClick={() => setStep(isCleaning || step < 3 ? step + 1 : confirmStep)}
          >
            Continue
          </button>
        </div>
      )}
    </form>
    {detailService && <ServiceDetailModal service={detailService} onClose={() => setDetailService(null)} />}
    </>
  );
}
