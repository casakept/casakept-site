"use client";

import { useActionState, useState } from "react";
import { updatePropertyDetailsAction, type PropertyActionState } from "@/lib/actions/properties";
import HomeDetailsFields from "./HomeDetailsFields";

const initialState: PropertyActionState = {};

export default function EditHomeDetails({
  propertyId,
  details,
  startOpen,
}: {
  propertyId: string;
  details: { bedrooms: number | null; bathrooms: number | null; sq_ft_min: number | null; extra_rooms: string[] };
  startOpen: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [state, formAction, pending] = useActionState(
    async (prev: PropertyActionState, formData: FormData) => {
      const result = await updatePropertyDetailsAction(propertyId, prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    initialState
  );

  if (!open) {
    return (
      <button
        className="btn ghost"
        type="button"
        onClick={() => setOpen(true)}
        style={{ padding: "6px 16px", fontSize: 13, marginTop: 10 }}
      >
        {details.bedrooms == null ? "Add home details" : "Edit home details"}
      </button>
    );
  }

  return (
    <form action={formAction} style={{ marginTop: 14, maxWidth: 480 }}>
      {state.error && <p className="form-msg error">{state.error}</p>}
      <HomeDetailsFields idPrefix={`${propertyId}-`} defaults={details} />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="submit" disabled={pending} style={{ padding: "8px 20px", fontSize: 14 }}>
          {pending ? "Saving…" : "Save details"}
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          style={{ padding: "8px 20px", fontSize: 14 }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
