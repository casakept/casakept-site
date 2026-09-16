"use client";

import { useActionState, useRef, useEffect } from "react";
import { inviteStaffAction, type AdminStaffActionState } from "@/lib/actions/admin-staff";

const initialState: AdminStaffActionState = {};

export type ReferrableStaff = { id: string; full_name: string | null };

export default function InviteStaffForm({ existingStaff }: { existingStaff: ReferrableStaff[] }) {
  const [state, formAction, pending] = useActionState(inviteStaffAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form action={formAction} ref={formRef} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
      {state.error && (
        <p className="form-msg error" style={{ width: "100%" }}>
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-msg success" style={{ width: "100%" }}>
          Invite sent.
        </p>
      )}
      <div className="field" style={{ flex: "1 1 200px" }}>
        <label htmlFor="full_name">Name</label>
        <input id="full_name" name="full_name" type="text" required />
      </div>
      <div className="field" style={{ flex: "1 1 240px" }}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field" style={{ flex: "1 1 200px" }}>
        <label htmlFor="referred_by_staff_id">Referred by (optional)</label>
        <select id="referred_by_staff_id" name="referred_by_staff_id" defaultValue="">
          <option value="">None</option>
          {existingStaff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name ?? "Unnamed staff"}
            </option>
          ))}
        </select>
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Invite staff"}
      </button>
    </form>
  );
}
