"use client";

import { useActionState, useRef, useEffect } from "react";
import { addProductAction, type AdminProductActionState } from "@/lib/actions/admin-products";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from "@/lib/productCategories";

const initialState: AdminProductActionState = {};

export default function AddProductForm() {
  const [state, formAction, pending] = useActionState(addProductAction, initialState);
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
          Product added.
        </p>
      )}
      <div className="field" style={{ flex: "1 1 200px" }}>
        <label htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue="">
          <option value="" disabled>
            Choose one
          </option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {PRODUCT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <div className="field" style={{ flex: "1 1 240px" }}>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" placeholder="Ex. Hard floor cleaner: Lavender" required />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, paddingBottom: 10 }}>
        <input type="checkbox" name="is_default" />
        Make default
      </label>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add product"}
      </button>
    </form>
  );
}
