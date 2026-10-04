"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidBathrooms, isValidBedrooms, isValidExtraRoom, isValidSqFtMin } from "@/lib/propertyDetails";

export type PropertyActionState = {
  error?: string;
  success?: boolean;
  propertyId?: string;
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

  // Number("") is 0, so check for a missing value explicitly -- 0 is a
  // legitimate sq ft selection ("Under 1,000") but never a valid bedroom
  // or bathroom count.
  const bedroomsRaw = String(formData.get("bedrooms") ?? "");
  const bathroomsRaw = String(formData.get("bathrooms") ?? "");
  const sqFtRaw = String(formData.get("sq_ft_min") ?? "");
  const bedrooms = bedroomsRaw === "" ? NaN : Number(bedroomsRaw);
  const bathrooms = bathroomsRaw === "" ? NaN : Number(bathroomsRaw);
  const sqFtMin = sqFtRaw === "" ? NaN : Number(sqFtRaw);

  if (!isValidBedrooms(bedrooms)) return { error: "Choose the number of bedrooms." };
  if (!isValidBathrooms(bathrooms)) return { error: "Choose the number of bathrooms." };
  if (!isValidSqFtMin(sqFtMin)) return { error: "Choose your home's approximate square footage." };

  const extraRooms = [...new Set(formData.getAll("extra_rooms").map(String))];
  if (!extraRooms.every(isValidExtraRoom)) return { error: "One of the extra rooms isn't valid." };

  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      customer_id: user.id,
      label,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city,
      state,
      zip,
      access_notes: accessNotes,
      bedrooms,
      bathrooms,
      sq_ft_min: sqFtMin,
      extra_rooms: extraRooms,
    })
    .select("id")
    .single();

  if (error || !property) return { error: error?.message ?? "Couldn't add that property." };

  revalidatePath("/account/properties");
  revalidatePath("/account/book");
  return { success: true, propertyId: property.id };
}

export async function deletePropertyAction(propertyId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("properties").delete().eq("id", propertyId);
  if (error) throw new Error(error.message);
  revalidatePath("/account/properties");
  revalidatePath("/account/book");
}
