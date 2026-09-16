"use client";

import { useActionState } from "react";
import { submitCsatResponseAction, type CsatActionState } from "@/lib/actions/csat";

const RATINGS = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Good" },
  { value: 4, label: "Great" },
  { value: 5, label: "Excellent" },
] as const;

const initialState: CsatActionState = {};

export default function CsatForm({ token }: { token: string }) {
  const action = submitCsatResponseAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.message) {
    return <p className="form-msg success">{state.message}</p>;
  }

  return (
    <form action={formAction}>
      {state.error && <p className="form-msg error">{state.error}</p>}
      <fieldset className="field" style={{ border: "none", padding: 0, margin: "0 0 16px" }}>
        <legend style={{ marginBottom: 10, fontWeight: 700, color: "var(--verde)" }}>
          How would you rate this visit?
        </legend>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {RATINGS.map((r) => (
            <label
              key={r.value}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                border: "2px solid var(--line)",
                borderRadius: 10,
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <input type="radio" name="rating" value={r.value} required style={{ width: 18, height: 18 }} />
              {r.value} · {r.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="comment">Anything you&apos;d like to add? (optional)</label>
        <textarea id="comment" name="comment" rows={3} maxLength={1000} />
      </div>
      <button className="btn" type="submit" disabled={pending} style={{ width: "100%" }}>
        {pending ? "Sending…" : "Submit rating"}
      </button>
    </form>
  );
}
