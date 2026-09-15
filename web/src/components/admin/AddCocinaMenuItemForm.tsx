"use client";

import { useActionState, useRef, useEffect } from "react";
import { createMenuItemAction, type AdminCocinaActionState } from "@/lib/actions/admin-cocina";

const initialState: AdminCocinaActionState = {};

export default function AddCocinaMenuItemForm() {
  const [state, formAction, pending] = useActionState(createMenuItemAction, initialState);
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
          Dish added.
        </p>
      )}
      <div className="field" style={{ flex: "1 1 200px" }}>
        <label htmlFor="dish_name">Dish name</label>
        <input id="dish_name" name="dish_name" type="text" required />
      </div>
      <div className="field" style={{ flex: "2 1 280px" }}>
        <label htmlFor="description">Description</label>
        <input id="description" name="description" type="text" required />
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add dish"}
      </button>
    </form>
  );
}
