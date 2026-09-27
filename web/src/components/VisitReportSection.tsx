"use client";

import { useActionState, useState } from "react";
import { submitVisitReportAction, type VisitReportActionState } from "@/lib/actions/redo-requests";

type ChecklistItem = { id: string; name: string };
type ExistingRequestByKind = Record<string, { status: string }>;

const initialState: VisitReportActionState = {};

// Lives inline on the same /survey/[token] page as the star rating (see
// the page's report-window check) -- one intake surface, reached the same
// two ways (the CSAT email, or "Rate this visit" on Past visits), not a
// separate report-an-issue flow.
export default function VisitReportSection({
  token,
  checklistItems,
  existingRequestByKind,
}: {
  token: string;
  checklistItems: ChecklistItem[];
  existingRequestByKind: ExistingRequestByKind;
}) {
  const action = submitVisitReportAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [choice, setChoice] = useState<"none" | "redo" | "damage" | null>(null);

  const redoAlready = existingRequestByKind.redo;
  const damageAlready = existingRequestByKind.damage;
  // A missed item and separate damage aren't mutually exclusive, so each
  // kind is gated independently -- one already-filed report doesn't block
  // the other.
  const bothAlreadyFiled = !!redoAlready && !!damageAlready;

  // Only reachable right after this component's own form submits (state
  // starts empty and only useActionState can set it), so there's no stale-
  // message-after-refresh case to guard against.
  if (state.message) {
    return (
      <p className="form-msg success" style={{ margin: 0 }}>
        {state.message}
      </p>
    );
  }

  if (bothAlreadyFiled) {
    return (
      <p className="form-msg" style={{ margin: 0 }}>
        Re-do request ({redoAlready.status}) and damage report ({damageAlready.status}) submitted for this
        visit. We&apos;ll be in touch.
      </p>
    );
  }

  if (choice === null) {
    return (
      <div>
        <p style={{ fontWeight: 700, color: "var(--verde)", marginBottom: 10 }}>
          Anything we should flag about this visit?
        </p>
        {(redoAlready || damageAlready) && (
          <p style={{ fontSize: 13, color: "#6a746c", marginBottom: 10 }}>
            {redoAlready && <>Re-do request submitted — status: {redoAlready.status}. </>}
            {damageAlready && <>Damage report submitted — status: {damageAlready.status}. </>}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn ghost" type="button" onClick={() => setChoice("none")}>
            No, everything was great
          </button>
          {!redoAlready && (
            <button className="btn ghost" type="button" onClick={() => setChoice("redo")}>
              Something was missed
            </button>
          )}
          {!damageAlready && (
            <button className="btn ghost" type="button" onClick={() => setChoice("damage")}>
              Something was damaged
            </button>
          )}
        </div>
      </div>
    );
  }

  if (choice === "none") {
    return (
      <p className="form-msg" style={{ margin: 0 }}>
        Thanks for letting us know!
      </p>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="kind" value={choice} />
      {state.error && <p className="form-msg error">{state.error}</p>}

      {choice === "redo" && (
        <fieldset className="field" style={{ border: "none", padding: 0, margin: "0 0 16px" }}>
          <legend style={{ marginBottom: 10, fontWeight: 700, color: "var(--verde)" }}>
            What was missed? (choose all that apply)
          </legend>
          {checklistItems.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6a746c" }}>
              This visit didn&apos;t have a checklist we can match against — describe it below instead.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {checklistItems.map((item) => (
                <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <input type="checkbox" name="checklist_item_ids" value={item.id} style={{ width: 16, height: 16 }} />
                  {item.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}

      <div className="field">
        <label htmlFor="description">{choice === "redo" ? "Tell us what happened" : "Describe the damage"}</label>
        <textarea id="description" name="description" rows={3} required maxLength={1000} />
      </div>

      <div className="field">
        <label htmlFor="photo">Photo {choice === "redo" ? "(required)" : "(optional)"}</label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          capture="environment"
          required={choice === "redo"}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Sending…" : choice === "redo" ? "Request a re-do" : "Report damage"}
        </button>
        <button className="btn ghost" type="button" onClick={() => setChoice(null)} disabled={pending}>
          Back
        </button>
      </div>
    </form>
  );
}
