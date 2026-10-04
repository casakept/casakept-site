// Rules for a crew-recommended deep-clean upgrade on a first standard clean.

// How long the customer has to respond once the link goes out. After this
// the crew carries on with the standard scope.
export const UPGRADE_RESPONSE_WINDOW_MINUTES = 15;

// Evidence required before a crew member can recommend an upgrade -- a
// flag with no photos is just an opinion, and customers see these photos.
export const MIN_ARRIVAL_PHOTOS = 3;

// Objective triggers, not "it feels dirty" -- these are what the crew picks
// from, and what the customer and admin see as the reason.
export const UPGRADE_REASONS = [
  { value: "kitchen_buildup", label: "Heavy grease or buildup in the kitchen" },
  { value: "bathroom_buildup", label: "Heavy soap scum or hard-water buildup in the bathrooms" },
  { value: "dust_pet_hair", label: "Heavy dust, cobwebs, or pet hair throughout" },
  { value: "floors_baseboards", label: "Floors or baseboards heavily soiled" },
  { value: "clutter", label: "Clutter that blocks cleaning surfaces" },
  { value: "other", label: "Other (explained below)" },
] as const;

export type UpgradeReason = (typeof UPGRADE_REASONS)[number]["value"];

const REASON_LABELS: Record<string, string> = Object.fromEntries(UPGRADE_REASONS.map((r) => [r.value, r.label]));

export function isUpgradeReason(value: string): value is UpgradeReason {
  return value in REASON_LABELS;
}

export function reasonLabel(value: string): string {
  return REASON_LABELS[value] ?? value;
}

export const ACTIVE_UPGRADE_STATUSES = ["flagged", "link_sent"] as const;

export const UPGRADE_STATUS_LABELS: Record<string, string> = {
  flagged: "Contact the customer",
  link_sent: "Waiting for the customer",
  approved: "Approved",
  declined: "Declined",
  expired: "No response",
  cancelled: "Cancelled",
};
