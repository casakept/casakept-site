import type { Database } from "@/lib/supabase/database.types";

export type ProductCategory = Database["public"]["Enums"]["cleaning_product_category"];
type ServiceType = Database["public"]["Enums"]["service_type"];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "all_purpose_cleaner",
  "hard_floor_cleaner",
  "carpet_cleaner",
  "glass_cleaner",
  "laundry_detergent",
  "fabric_softener",
];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  all_purpose_cleaner: "All-purpose cleaner",
  hard_floor_cleaner: "Hard floor cleaner",
  carpet_cleaner: "Carpet cleaner",
  glass_cleaner: "Glass cleaner",
  laundry_detergent: "Laundry detergent",
  fabric_softener: "Fabric softener",
};

// Which product categories a customer can pick a scent for, per service
// type -- e.g. laundry only offers detergent/softener, carpet cleaning only
// offers carpet cleaner. A service type left out of this map (groceries,
// errands, organization) never shows a products step in the booking wizard.
export const PRODUCT_CATEGORIES_BY_SERVICE: Partial<Record<ServiceType, ProductCategory[]>> = {
  standard_clean: ["all_purpose_cleaner", "hard_floor_cleaner", "carpet_cleaner", "glass_cleaner"],
  deep_clean: ["all_purpose_cleaner", "hard_floor_cleaner", "carpet_cleaner", "glass_cleaner"],
  move_out_clean: ["all_purpose_cleaner", "hard_floor_cleaner", "carpet_cleaner", "glass_cleaner"],
  carpet_cleaning: ["carpet_cleaner"],
  window_cleaning: ["glass_cleaner"],
  laundry: ["laundry_detergent", "fabric_softener"],
  laundry_rush: ["laundry_detergent", "fabric_softener"],
};
