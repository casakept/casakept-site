"use client";

import { useActionState, useRef, useEffect } from "react";
import { addPropertyAction, type PropertyActionState } from "@/lib/actions/properties";

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
      {state.success && <p className="form-msg success">Property added.</p>}
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
