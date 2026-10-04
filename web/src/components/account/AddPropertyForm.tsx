"use client";

import { useActionState, useRef, useEffect } from "react";
import Link from "next/link";
import { addPropertyAction, type PropertyActionState } from "@/lib/actions/properties";
import {
  BATHROOM_OPTIONS,
  BEDROOM_OPTIONS,
  EXTRA_ROOM_OPTIONS,
  SQ_FT_OPTIONS,
  formatBathrooms,
} from "@/lib/propertyDetails";

const initialState: PropertyActionState = {};

export default function AddPropertyForm() {
  const [state, formAction, pending] = useActionState(addPropertyAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form action={formAction} ref={formRef}>
      {state.error && <p className="form-msg error">{state.error}</p>}
      {state.success && (
        <div className="form-msg success">
          <p style={{ margin: 0 }}>Property added.</p>
          {state.propertyId && (
            <Link
              className="btn"
              href={`/account/book?property=${state.propertyId}`}
              style={{ marginTop: 12, display: "inline-block" }}
            >
              Book a visit at this property
            </Link>
          )}
        </div>
      )}
      <div className="field">
        <label htmlFor="label">Label</label>
        <input id="label" name="label" type="text" placeholder="Home, Lake house, etc." />
      </div>
      <div className="field">
        <label htmlFor="address_line1">Address</label>
        <input id="address_line1" name="address_line1" type="text" autoComplete="address-line1" required />
      </div>
      <div className="field">
        <label htmlFor="address_line2">Apt / unit</label>
        <input id="address_line2" name="address_line2" type="text" autoComplete="address-line2" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr 0.7fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="city">City</label>
          <input id="city" name="city" type="text" autoComplete="address-level2" required />
        </div>
        <div className="field">
          <label htmlFor="state">State</label>
          <input id="state" name="state" type="text" defaultValue="TX" maxLength={2} required />
        </div>
        <div className="field">
          <label htmlFor="zip">ZIP</label>
          <input id="zip" name="zip" type="text" inputMode="numeric" autoComplete="postal-code" required />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="bedrooms">Bedrooms</label>
          <select id="bedrooms" name="bedrooms" required defaultValue="">
            <option value="" disabled>
              Select
            </option>
            {BEDROOM_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "bedroom" : "bedrooms"}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bathrooms">Bathrooms</label>
          <select id="bathrooms" name="bathrooms" required defaultValue="">
            <option value="" disabled>
              Select
            </option>
            {BATHROOM_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {formatBathrooms(n)} {n === 1 ? "bathroom" : "bathrooms"}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="sq_ft_min">Square footage</label>
        <select id="sq_ft_min" name="sq_ft_min" required defaultValue="">
          <option value="" disabled>
            Select
          </option>
          {SQ_FT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="field" style={{ border: "none", padding: 0, margin: "0 0 16px" }}>
        <legend
          style={{
            marginBottom: 8,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "var(--verde)",
          }}
        >
          Extra rooms{" "}
          <span style={{ textTransform: "none", fontWeight: 400, color: "#9aa49d" }}>(choose any that apply)</span>
        </legend>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {EXTRA_ROOM_OPTIONS.map((o) => (
            <div key={o.value} className="form-check" style={{ margin: 0 }}>
              <input id={`extra_room_${o.value}`} type="checkbox" name="extra_rooms" value={o.value} />
              <label htmlFor={`extra_room_${o.value}`} style={{ margin: 0 }}>
                {o.label}
              </label>
            </div>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="access_notes">
          Access notes{" "}
          <span style={{ textTransform: "none", fontWeight: 400, color: "#9aa49d" }}>
            (gate codes, pets, parking)
          </span>
        </label>
        <textarea id="access_notes" name="access_notes" rows={3}></textarea>
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add property"}
      </button>
    </form>
  );
}
