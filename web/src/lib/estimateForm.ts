import type { Database } from "@/lib/supabase/database.types";

export const CONDITION_CATEGORIES = [
  { key: "condition_kitchen", label: "Kitchen" },
  { key: "condition_bathrooms", label: "Bathrooms" },
  { key: "condition_floors", label: "Floors & carpet" },
  { key: "condition_dust", label: "Dust level (fans/blinds/base)" },
  { key: "condition_clutter", label: "Clutter / organization" },
  { key: "condition_windows", label: "Windows" },
] as const;

export type ConditionCategoryKey = (typeof CONDITION_CATEGORIES)[number]["key"];

export const PRODUCT_PREFERENCES: {
  value: Database["public"]["Enums"]["product_preference"];
  label: string;
}[] = [
  { value: "standard", label: "Standard" },
  { value: "hypoallergenic", label: "Hypoallergenic" },
  { value: "pet_safe", label: "Pet-safe" },
];

export const PREFERRED_DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
] as const;

// Only the two windows the paper form offers for a walkthrough booking
// preference -- the full schedule_window enum (used elsewhere for actual
// bookings) also has "midday".
export const PREFERRED_WINDOWS: { value: Database["public"]["Enums"]["schedule_window"]; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
];

export const ACK_TERMS = [
  {
    key: "ack_services_guide",
    text: "Customer received the Services Guide showing exactly what's included in each service, and this estimate reflects the services checked above.",
  },
  {
    key: "ack_membership_terms",
    text: "Memberships require a three-month minimum, month-to-month after; the founding rate is locked as long as they remain a member.",
  },
  {
    key: "ack_guarantee",
    text: "24-hour guarantee: anything missed from the checklist is re-done free within 24 hours of being reported.",
  },
  {
    key: "ack_carpet_access",
    text: "For full wall-to-wall carpet cleaning, large furniture must be moved out of the room beforehand.",
  },
  {
    key: "ack_estimate_validity",
    text: "Estimate valid 14 days. Final pricing confirmed in writing before first service; no charges beyond this sheet without written OK.",
  },
] as const;

export type AckTermKey = (typeof ACK_TERMS)[number]["key"];

// Service types where the worksheet quantity means something other than
// "how many of this fixed-price item" (rooms, bags, hours) -- shown with a
// qty input; everything else defaults to qty 1.
export const QTY_SERVICE_TYPES = new Set<Database["public"]["Enums"]["service_type"]>([
  "carpet_cleaning",
  "laundry",
  "laundry_rush",
  "organization",
]);

export const SIZE_ADJUSTMENT_THRESHOLD_SQFT = 2500;
export const SIZE_ADJUSTMENT_CENTS_PER_500_SQFT = 3000;

export function sizeAdjustmentCents(approxSqFt: number | null): number {
  if (!approxSqFt || approxSqFt <= SIZE_ADJUSTMENT_THRESHOLD_SQFT) return 0;
  const over = approxSqFt - SIZE_ADJUSTMENT_THRESHOLD_SQFT;
  return Math.ceil(over / 500) * SIZE_ADJUSTMENT_CENTS_PER_500_SQFT;
}

export type EstimateServiceLine = {
  service_id: string;
  service_type: Database["public"]["Enums"]["service_type"];
  name: string;
  qty: number;
  unit_price_cents: number;
  total_cents: number;
};

export const ESTIMATE_STATUS_LABELS: Record<Database["public"]["Enums"]["estimate_status"], string> = {
  draft: "Draft",
  sent: "Sent",
  converted: "Converted",
  declined: "Declined",
};

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
