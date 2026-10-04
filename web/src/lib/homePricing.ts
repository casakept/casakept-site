import { EXTRA_ROOM_OPTIONS, formatBathrooms } from "./propertyDetails";

// One row of service_size_rates.
export type SizeRate = {
  service_type: string;
  included_bedrooms: number;
  included_bathrooms: number;
  extra_bedroom_cents: number;
  extra_half_bath_cents: number;
  extra_room_cents: number;
};

export type HomeSize = {
  bedrooms: number;
  bathrooms: number;
  extraRooms: string[];
};

export type PriceLine = { label: string; cents: number };

type PropertySizeFields = {
  bedrooms: number | null;
  bathrooms: number | null;
  extra_rooms: string[];
};

// A property created before home details were collected has nulls; those
// can't be priced and need the customer to fill them in first.
export function homeSizeFromProperty(p: PropertySizeFields | null | undefined): HomeSize | null {
  if (!p || p.bedrooms == null || p.bathrooms == null) return null;
  return { bedrooms: p.bedrooms, bathrooms: p.bathrooms, extraRooms: p.extra_rooms ?? [] };
}

const EXTRA_ROOM_LABELS: Record<string, string> = Object.fromEntries(
  EXTRA_ROOM_OPTIONS.map((o) => [o.value, o.label])
);

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm;
}

// Line items for everything a home adds on top of the service's base price.
// Homes smaller than the included scope pay the base price, not less.
export function sizeSurchargeLines(rate: SizeRate, home: HomeSize): PriceLine[] {
  const lines: PriceLine[] = [];

  const extraBedrooms = Math.max(0, home.bedrooms - rate.included_bedrooms);
  if (extraBedrooms > 0) {
    lines.push({
      label: `${extraBedrooms} extra ${plural(extraBedrooms, "bedroom", "bedrooms")}`,
      cents: extraBedrooms * rate.extra_bedroom_cents,
    });
  }

  // Bathrooms come in half steps; each half step over the included count
  // is charged, so a full extra bathroom is two steps.
  const extraHalfSteps = Math.max(0, Math.round((home.bathrooms - rate.included_bathrooms) * 2));
  if (extraHalfSteps > 0) {
    const extraBaths = extraHalfSteps / 2;
    lines.push({
      label:
        extraBaths === 0.5
          ? "1 extra half bath"
          : `${formatBathrooms(extraBaths)} extra ${plural(extraBaths, "bathroom", "bathrooms")}`,
      cents: extraHalfSteps * rate.extra_half_bath_cents,
    });
  }

  if (home.extraRooms.length > 0) {
    lines.push({
      label: `Extra ${plural(home.extraRooms.length, "room", "rooms")}: ${home.extraRooms
        .map((r) => EXTRA_ROOM_LABELS[r] ?? r)
        .join(", ")}`,
      cents: home.extraRooms.length * rate.extra_room_cents,
    });
  }

  return lines;
}

export function sizeSurchargeCents(rate: SizeRate, home: HomeSize): number {
  return sizeSurchargeLines(rate, home).reduce((sum, l) => sum + l.cents, 0);
}

export type Quote = {
  baseCents: number;
  surchargeLines: PriceLine[];
  surchargeCents: number;
  subtotalCents: number;
  discountPct: number;
  totalCents: number;
};

// The member discount applies to the whole subtotal (base + home size),
// matching how createBookingAction has always applied it to the price.
export function buildQuote(params: {
  baseCents: number;
  rate: SizeRate | null;
  home: HomeSize | null;
  discountPct: number;
}): Quote {
  const surchargeLines = params.rate && params.home ? sizeSurchargeLines(params.rate, params.home) : [];
  const surchargeCents = surchargeLines.reduce((sum, l) => sum + l.cents, 0);
  const subtotalCents = params.baseCents + surchargeCents;
  return {
    baseCents: params.baseCents,
    surchargeLines,
    surchargeCents,
    subtotalCents,
    discountPct: params.discountPct,
    totalCents: Math.round(subtotalCents * (1 - params.discountPct / 100)),
  };
}

// Whole dollars when exact ($199), cents otherwise ($179.10), with
// thousands separators ($1,855.67).
export function formatDollars(cents: number): string {
  const whole = cents % 100 === 0;
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

const dollars = formatDollars;

// Customer-facing sentence for /pricing and /services, generated from the
// live rates so changing a rate in the database changes the copy too.
export function describeSizePricing(
  rates: SizeRate[],
  labelFor: (serviceType: string) => string
): string | null {
  if (rates.length === 0) return null;
  const first = rates[0];
  const clauses = rates.map((r) => {
    const bedRoom =
      r.extra_bedroom_cents === r.extra_room_cents
        ? `${dollars(r.extra_bedroom_cents)} per extra bedroom or room`
        : `${dollars(r.extra_bedroom_cents)} per extra bedroom and ${dollars(r.extra_room_cents)} per extra room`;
    return `${labelFor(r.service_type)} adds ${bedRoom} and ${dollars(r.extra_half_bath_cents * 2)} per extra bathroom (${dollars(
      r.extra_half_bath_cents
    )} per half bath)`;
  });
  return `Cleaning prices cover up to ${first.included_bedrooms} bedrooms and ${formatBathrooms(
    first.included_bathrooms
  )} bathrooms. For larger homes: ${clauses.join("; ")}.`;
}

// ---- Memberships -------------------------------------------------------
// A membership's included visits are free at the plan price, so a larger
// home is charged as a recurring "home size" add-on instead of per visit:
// each included whole-home cleaning x that service's per-visit home-size
// amount. plan_entitlements quantities are per calendar month, except
// quarterly ones (per quarter), which are spread back down to monthly.

export type PlanEntitlementLite = { service_type: string; quantity: number; frequency: string };

export function monthlyHomeAddOnCents(
  entitlements: PlanEntitlementLite[],
  rates: SizeRate[],
  home: HomeSize
): number {
  let total = 0;
  for (const e of entitlements) {
    const rate = rates.find((r) => r.service_type === e.service_type);
    if (!rate) continue;
    const perMonth = e.frequency === "quarterly" ? e.quantity / 3 : e.quantity;
    total += sizeSurchargeCents(rate, home) * perMonth;
  }
  return Math.round(total);
}

// Annual plans are priced at monthly x 12 less a discount (10% today); the
// add-on gets the same treatment so annual members aren't charged more for
// their home than the plan itself is discounted.
export function annualFactorFor(plan: { monthly_price_cents: number; annual_price_cents: number | null }): number {
  if (plan.annual_price_cents == null || plan.monthly_price_cents <= 0) return 1;
  return plan.annual_price_cents / (plan.monthly_price_cents * 12);
}

export type MembershipCadence = "monthly" | "annual";

// The add-on as billed per period: monthly for monthly members, yearly
// for annual ones.
export function homeAddOnForCadence(monthlyCents: number, cadence: MembershipCadence, annualFactor: number): number {
  return cadence === "annual" ? Math.round(monthlyCents * 12 * annualFactor) : monthlyCents;
}

// The most a standard-to-deep upgrade could add at this home: the deep
// clean's price minus the standard clean's, with the deep clean's member
// discount applied to the difference. Shown to the customer up front so the
// on-arrival upgrade offer never contains a number they haven't seen.
export function upgradeDifferenceCents(standard: Quote, deep: Quote): number {
  const diff = Math.max(0, deep.subtotalCents - standard.subtotalCents);
  return Math.round(diff * (1 - deep.discountPct / 100));
}
