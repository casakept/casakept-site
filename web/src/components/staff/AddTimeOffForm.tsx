"use client";

import { useActionState, useRef, useEffect } from "react";
import type { AvailabilityActionState } from "@/lib/actions/staff-availability";

const initialState: AvailabilityActionState = {};

export default function AddTimeOffForm({
  action,
}: {
  action: (prevState: AvailabilityActionState, formData: FormData) => Promise<AvailabilityActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form action={formAction} ref={formRef}>
      {state.error && <p className="form-msg error">{state.error}</p>}
      {state.success && <p className="form-msg success">Time off added.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="start_date">Start date</label>
          <input id="start_date" name="start_date" type="date" required />
        </div>
        <div className="field">
          <label htmlFor="end_date">End date</label>
          <input id="end_date" name="end_date" type="date" required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="reason">
          Reason <span style={{ textTransform: "none", fontWeight: 400, color: "#9aa49d" }}>(optional)</span>
        </label>
        <input id="reason" name="reason" type="text" />
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add time off"}
      </button>
    </form>
  );
}
