import type { Database } from "@/lib/supabase/database.types";

export const SERVICE_LABELS: Record<Database["public"]["Enums"]["service_type"], string> = {
  standard_clean: "Standard clean",
  deep_clean: "Deep clean",
  move_out_clean: "Move-in / move-out clean",
  carpet_cleaning: "Carpet cleaning",
  window_cleaning: "Window cleaning",
  organization: "Home organization",
  laundry: "Laundry",
  laundry_rush: "Laundry (rush)",
  grocery: "Grocery pickup + delivery",
  fridge_restock: "Fridge cleanout + restock",
  cocina_meal: "Cocina meal drop",
  errand: "Errand",
};

export const WINDOW_LABELS: Record<Database["public"]["Enums"]["schedule_window"], string> = {
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
};
