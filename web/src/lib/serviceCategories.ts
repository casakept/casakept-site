import type { Database } from "@/lib/supabase/database.types";

type ServiceType = Database["public"]["Enums"]["service_type"];

// Groups the flat services catalog into the same sections used on the
// /services guide, in the order the business wants customers to see them
// in the booking wizard: Home Cleaning first, then Specialty Cleaning,
// Laundry, Home Organization -- Groceries/Fridge and Errands follow since
// they weren't called out as needing to lead, but still need a home.
export const SERVICE_CATEGORIES: { label: string; types: ServiceType[] }[] = [
  { label: "Home Cleaning", types: ["standard_clean", "deep_clean"] },
  { label: "Specialty Cleaning", types: ["move_out_clean", "carpet_cleaning", "window_cleaning"] },
  { label: "Laundry Services", types: ["laundry", "laundry_rush"] },
  { label: "Home Organization", types: ["organization"] },
  { label: "Groceries & Fridge Care", types: ["grocery", "fridge_restock"] },
  { label: "Errands", types: ["errand"] },
];

export function categoryFor(serviceType: string): string {
  return SERVICE_CATEGORIES.find((c) => (c.types as string[]).includes(serviceType))?.label ?? "Other";
}
