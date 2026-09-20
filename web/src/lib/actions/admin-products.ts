"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProductCategory } from "@/lib/productCategories";

export type AdminProductActionState = {
  error?: string;
  success?: boolean;
};

// cleaning_products_select_all/write_admin/update_admin RLS is the real
// gate here (mirrors the rest of this app's RLS-as-gate pattern) -- a
// non-admin's insert/update just gets rejected by Postgres.
export async function addProductAction(
  _prevState: AdminProductActionState,
  formData: FormData
): Promise<AdminProductActionState> {
  const supabase = await createClient();

  const category = String(formData.get("category") ?? "") as ProductCategory;
  const name = String(formData.get("name") ?? "").trim();
  const makeDefault = formData.get("is_default") === "on";

  if (!category || !name) {
    return { error: "Category and name are required." };
  }

  if (makeDefault) {
    // Clear the existing default in this category first -- the
    // cleaning_products_one_default_per_category unique index would
    // otherwise reject the insert below.
    const { error: clearErr } = await supabase
      .from("cleaning_products")
      .update({ is_default: false })
      .eq("category", category)
      .eq("is_default", true);
    if (clearErr) return { error: clearErr.message };
  }

  const { error } = await supabase.from("cleaning_products").insert({
    category,
    name,
    is_default: makeDefault,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  return { success: true };
}

export async function setProductActiveAction(productId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("cleaning_products").update({ active }).eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
}

export async function setDefaultProductAction(productId: string, category: ProductCategory) {
  const supabase = await createClient();

  const { error: clearErr } = await supabase
    .from("cleaning_products")
    .update({ is_default: false })
    .eq("category", category)
    .eq("is_default", true);
  if (clearErr) throw new Error(clearErr.message);

  const { error } = await supabase.from("cleaning_products").update({ is_default: true }).eq("id", productId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
}
