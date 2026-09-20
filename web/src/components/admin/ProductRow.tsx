"use client";

import { setDefaultProductAction, setProductActiveAction } from "@/lib/actions/admin-products";
import type { ProductCategory } from "@/lib/productCategories";

export type AdminProduct = {
  id: string;
  category: ProductCategory;
  name: string;
  is_default: boolean;
  active: boolean;
};

export default function ProductRow({ product }: { product: AdminProduct }) {
  const toggleAction = setProductActiveAction.bind(null, product.id, !product.active);
  const defaultAction = setDefaultProductAction.bind(null, product.id, product.category);

  return (
    <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
      <div>
        <strong style={{ color: "var(--verde)" }}>{product.name}</strong>{" "}
        <span className={`status-badge ${product.active ? "confirmed" : "cancelled"}`}>
          {product.active ? "Active" : "Inactive"}
        </span>{" "}
        {product.is_default && <span className="status-badge founding">Default</span>}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {!product.is_default && (
          <form action={defaultAction}>
            <button type="submit" className="btn ghost" style={{ padding: "6px 16px", fontSize: 13 }}>
              Set as default
            </button>
          </form>
        )}
        <form
          action={toggleAction}
          onSubmit={(e) => {
            if (product.active && !confirm(`Deactivate "${product.name}"?`)) {
              e.preventDefault();
            }
          }}
        >
          <button type="submit" className="btn ghost" style={{ padding: "6px 16px", fontSize: 13 }}>
            {product.active ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </div>
    </div>
  );
}
