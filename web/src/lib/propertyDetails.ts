export const BEDROOM_OPTIONS: number[] = Array.from({ length: 10 }, (_, i) => i + 1);

// 1 to 10 in half steps (a half bath is a 0.5 step).
export const BATHROOM_OPTIONS: number[] = Array.from({ length: 19 }, (_, i) => 1 + i * 0.5);

export const EXTRA_ROOM_OPTIONS = [
  { value: "office", label: "Office" },
  { value: "den", label: "Den" },
  { value: "extra_living_room", label: "Extra living room" },
  { value: "media_room", label: "Media room" },
] as const;

const EXTRA_ROOM_LABELS: Record<string, string> = Object.fromEntries(
  EXTRA_ROOM_OPTIONS.map((o) => [o.value, o.label])
);

// sq_ft_min is the lower bound of the chosen range: 0 = "Under 1,000",
// 1000-9500 = that value through +499, 10000 = "10,000+".
export const SQ_FT_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Under 1,000 sq ft" },
  ...Array.from({ length: 18 }, (_, i) => {
    const min = 1000 + i * 500;
    return { value: min, label: `${min.toLocaleString("en-US")} – ${(min + 499).toLocaleString("en-US")} sq ft` };
  }),
  { value: 10000, label: "10,000+ sq ft" },
];

export function formatBathrooms(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function isValidBedrooms(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 10;
}

export function isValidBathrooms(n: number): boolean {
  return Number.isFinite(n) && n >= 1 && n <= 10 && (n * 2) % 1 === 0;
}

export function isValidSqFtMin(n: number): boolean {
  return SQ_FT_OPTIONS.some((o) => o.value === n);
}

export function isValidExtraRoom(value: string): boolean {
  return value in EXTRA_ROOM_LABELS;
}

export type PropertyDetails = {
  bedrooms: number | null;
  bathrooms: number | null;
  sq_ft_min: number | null;
  extra_rooms: string[];
};

// "3 bed · 2.5 bath · 2,500 – 2,999 sq ft · Office, Den". Null for a
// property with no size details (created outside the self-serve form).
export function describeProperty(p: PropertyDetails): string | null {
  const parts: string[] = [];
  if (p.bedrooms != null) parts.push(`${p.bedrooms} bed`);
  if (p.bathrooms != null) parts.push(`${formatBathrooms(p.bathrooms)} bath`);
  if (p.sq_ft_min != null) {
    parts.push(SQ_FT_OPTIONS.find((o) => o.value === p.sq_ft_min)?.label ?? `${p.sq_ft_min}+ sq ft`);
  }
  if (p.extra_rooms.length > 0) {
    parts.push(p.extra_rooms.map((r) => EXTRA_ROOM_LABELS[r] ?? r).join(", "));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export type HomeDetailsInput = {
  bedrooms: number;
  bathrooms: number;
  sq_ft_min: number;
  extra_rooms: string[];
};

// Number("") is 0, so a missing value is checked explicitly -- 0 is a
// legitimate sq ft selection ("Under 1,000") but never a valid bedroom or
// bathroom count.
function numberOrNaN(raw: FormDataEntryValue | null): number {
  const s = String(raw ?? "");
  return s === "" ? NaN : Number(s);
}

// Shared by adding a property and editing a home's details, so the same
// required fields and ranges apply to both.
export function parseHomeDetailsForm(formData: FormData): { error: string } | { value: HomeDetailsInput } {
  const bedrooms = numberOrNaN(formData.get("bedrooms"));
  const bathrooms = numberOrNaN(formData.get("bathrooms"));
  const sqFtMin = numberOrNaN(formData.get("sq_ft_min"));

  if (!isValidBedrooms(bedrooms)) return { error: "Choose the number of bedrooms." };
  if (!isValidBathrooms(bathrooms)) return { error: "Choose the number of bathrooms." };
  if (!isValidSqFtMin(sqFtMin)) return { error: "Choose your home's approximate square footage." };

  const extraRooms = [...new Set(formData.getAll("extra_rooms").map(String))];
  if (!extraRooms.every(isValidExtraRoom)) return { error: "One of the extra rooms isn't valid." };

  return { value: { bedrooms, bathrooms, sq_ft_min: sqFtMin, extra_rooms: extraRooms } };
}
