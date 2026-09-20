import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import AddProductForm from "@/components/admin/AddProductForm";
import ProductRow, { type AdminProduct } from "@/components/admin/ProductRow";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from "@/lib/productCategories";

export const metadata: Metadata = {
  title: "Admin · Products",
};

export default async function AdminProductsPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("cleaning_products")
    .select("id, category, name, is_default, active")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  const byCategory = PRODUCT_CATEGORIES.map((category) => ({
    category,
    products: (products ?? []).filter((p) => p.category === category) as AdminProduct[],
  }));

  return (
    <div>
      <h3>Add a product</h3>
      <p style={{ marginTop: 6, marginBottom: 16, color: "#6a746c" }}>
        Customers pick one of these per category when booking a cleaning, carpet, window, or laundry visit.
      </p>
      <div className="card">
        <AddProductForm />
      </div>

      {byCategory.map(({ category, products: categoryProducts }) => (
        <div key={category} style={{ marginTop: 40 }}>
          <h3>{PRODUCT_CATEGORY_LABELS[category]}</h3>
          {categoryProducts.length === 0 ? (
            <p style={{ marginTop: 10, color: "#6a746c" }}>No products in this category yet.</p>
          ) : (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {categoryProducts.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
