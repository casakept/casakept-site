"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdminCocinaActionState = {
  error?: string;
  success?: boolean;
};

// No explicit role check here -- the cocina_menu_items_write_admin /
// _update_admin RLS policies are the real gate, same pattern as
// updateBookingAction. A non-admin session hitting these would just no-op
// or get rejected by RLS.
export async function createMenuItemAction(
  _prevState: AdminCocinaActionState,
  formData: FormData
): Promise<AdminCocinaActionState> {
  const dishName = String(formData.get("dish_name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!dishName || !description) return { error: "Dish name and description are required." };

  const supabase = await createClient();

  const { data: maxRow } = await supabase
    .from("cocina_menu_items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { error } = await supabase
    .from("cocina_menu_items")
    .insert({ dish_name: dishName, description, sort_order: nextSortOrder });
  if (error) return { error: error.message };

  revalidatePath("/admin/cocina");
  revalidatePath("/cocina");
  return { success: true };
}

export async function updateMenuItemAction(
  itemId: string,
  _prevState: AdminCocinaActionState,
  formData: FormData
): Promise<AdminCocinaActionState> {
  const dishName = String(formData.get("dish_name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!dishName || !description) return { error: "Dish name and description are required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("cocina_menu_items")
    .update({ dish_name: dishName, description })
    .eq("id", itemId);
  if (error) return { error: error.message };

  revalidatePath("/admin/cocina");
  revalidatePath("/cocina");
  return { success: true };
}

export async function setMenuItemActiveAction(itemId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("cocina_menu_items").update({ active }).eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/cocina");
  revalidatePath("/cocina");
}

export async function deleteMenuItemAction(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cocina_menu_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/cocina");
  revalidatePath("/cocina");
}

// Swaps this item's sort_order with its neighbor in the given direction.
// Simple pairwise swap rather than a full renumber -- fine for a list this
// small, and matches the "no premature abstraction" approach used elsewhere.
export async function moveMenuItemAction(itemId: string, direction: "up" | "down") {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("cocina_menu_items")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });
  if (!items) return;

  const index = items.findIndex((i) => i.id === itemId);
  if (index === -1) return;

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= items.length) return;

  const current = items[index];
  const neighbor = items[neighborIndex];

  await supabase.from("cocina_menu_items").update({ sort_order: neighbor.sort_order }).eq("id", current.id);
  await supabase.from("cocina_menu_items").update({ sort_order: current.sort_order }).eq("id", neighbor.id);

  revalidatePath("/admin/cocina");
  revalidatePath("/cocina");
}
