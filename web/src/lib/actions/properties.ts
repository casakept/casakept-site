"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PropertyActionState = {
  error?: string;
  success?: boolean;
};

export async function addPropertyAction(
  _prevState: PropertyActionState,
  formData: FormData
): Promise<PropertyActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const label = String(formData.get("label") ?? "").trim() || null;
  const addressLine1 = String(formData.get("address_line1") ?? "").trim();
  const addressLine2 = String(formData.get("address_line2") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "TX").trim() || "TX";
  const zip = String(formData.get("zip") ?? "").trim();
  const accessNotes = String(formData.get("access_notes") ?? "").trim() || null;

  if (!addressLine1 || !city || !zip) {
    return { error: "Address, city, and ZIP are required." };
  }

  const { error } = await supabase.from("properties").insert({
    customer_id: user.id,
    label,
    address_line1: addressLine1,
    address_line2: addressLine2,
    city,
    state,
    zip,
    access_notes: accessNotes,
  });

  if (error) return { error: error.message };

  revalidatePath("/account/properties");
  revalidatePath("/account/book");
  return { success: true };
}

export async function deletePropertyAction(propertyId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("properties").delete().eq("id", propertyId);
  if (error) throw new Error(error.message);
  revalidatePath("/account/properties");
  revalidatePath("/account/book");
}
