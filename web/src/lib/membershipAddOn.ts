import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  annualFactorFor,
  homeAddOnForCadence,
  homeSizeFromProperty,
  monthlyHomeAddOnCents,
  type MembershipCadence,
} from "@/lib/homePricing";

type Client = SupabaseClient<Database>;

// A fixed id so the Stripe product can be fetched or created on demand
// without storing the id anywhere.
export const HOME_ADDON_PRODUCT_ID = "casakept_home_size_addon";

export async function ensureHomeAddOnProduct(stripe: Stripe): Promise<string> {
  try {
    await stripe.products.retrieve(HOME_ADDON_PRODUCT_ID);
  } catch (err) {
    if ((err as { code?: string }).code !== "resource_missing") throw err;
    await stripe.products.create({
      id: HOME_ADDON_PRODUCT_ID,
      name: "Home size add-on",
      description: "Added to your membership for homes larger than the plan's included size.",
    });
  }
  return HOME_ADDON_PRODUCT_ID;
}

export type HomeAddOn = {
  monthlyCents: number;
  // Per billing period: monthly for monthly members, yearly for annual.
  periodCents: number;
  homeLabel: string;
};

// What a membership's home-size add-on is for this plan, billing cadence,
// and home -- priced from the saved property and live rates, so it's the
// single source for both signup and later re-pricing.
export async function computeHomeAddOn(params: {
  supabase: Client;
  customerId: string;
  planId: string;
  propertyId: string;
  cadence: MembershipCadence;
}): Promise<{ error: string } | HomeAddOn> {
  const { supabase, customerId, planId, propertyId, cadence } = params;

  const [{ data: plan }, { data: entitlements }, { data: rates }, { data: property }] = await Promise.all([
    supabase.from("membership_plans").select("monthly_price_cents, annual_price_cents").eq("id", planId).maybeSingle(),
    supabase.from("plan_entitlements").select("service_type, quantity, frequency").eq("plan_id", planId),
    supabase
      .from("service_size_rates")
      .select("service_type, included_bedrooms, included_bathrooms, extra_bedroom_cents, extra_half_bath_cents, extra_room_cents"),
    supabase
      .from("properties")
      .select("id, label, address_line1, bedrooms, bathrooms, extra_rooms")
      .eq("id", propertyId)
      .eq("customer_id", customerId)
      .maybeSingle(),
  ]);

  if (!plan) return { error: "That plan isn't available right now." };
  if (!property) return { error: "Choose one of your properties for this membership." };
  const home = homeSizeFromProperty(property);
  if (!home) {
    return { error: "Add your home's bedroom and bathroom details on the Properties page before joining." };
  }

  const monthlyCents = monthlyHomeAddOnCents(entitlements ?? [], rates ?? [], home);
  return {
    monthlyCents,
    periodCents: homeAddOnForCadence(monthlyCents, cadence, annualFactorFor(plan)),
    homeLabel: property.label || property.address_line1,
  };
}

// The recurring amount of the add-on line on a Stripe subscription (0 if it
// has none).
export function addOnCentsFromItems(sub: Stripe.Subscription): number {
  return sub.items.data
    .filter((item) => {
      const product = item.price.product;
      return (typeof product === "string" ? product : product.id) === HOME_ADDON_PRODUCT_ID;
    })
    .reduce((sum, item) => sum + (item.price.unit_amount ?? 0) * (item.quantity ?? 1), 0);
}

// Re-prices an active membership's add-on from its home's current details
// and updates the Stripe subscription. No proration: the new amount simply
// applies from the next renewal, so a change never creates a surprise
// mid-period charge or credit.
export async function syncMembershipHomeAddOn(
  supabase: Client,
  stripe: Stripe,
  subscriptionId: string
): Promise<{ error: string } | { addOnCents: number }> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, customer_id, plan_id, property_id, billing_cadence, stripe_subscription_id")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!sub?.property_id || !sub.stripe_subscription_id) return { error: "Membership has no home to price." };

  const cadence: MembershipCadence = sub.billing_cadence === "annual" ? "annual" : "monthly";
  const addOn = await computeHomeAddOn({
    supabase,
    customerId: sub.customer_id,
    planId: sub.plan_id,
    propertyId: sub.property_id,
    cadence,
  });
  if ("error" in addOn) return addOn;

  const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
  const existing = stripeSub.items.data.find((item) => {
    const product = item.price.product;
    return (typeof product === "string" ? product : product.id) === HOME_ADDON_PRODUCT_ID;
  });

  if (!existing && addOn.periodCents > 0) {
    const product = await ensureHomeAddOnProduct(stripe);
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [
        {
          price_data: {
            currency: "usd",
            product,
            unit_amount: addOn.periodCents,
            recurring: { interval: cadence === "annual" ? "year" : "month" },
          },
        },
      ],
      proration_behavior: "none",
    });
  } else if (existing && addOn.periodCents === 0) {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{ id: existing.id, deleted: true }],
      proration_behavior: "none",
    });
  } else if (existing && existing.price.unit_amount !== addOn.periodCents) {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [
        {
          id: existing.id,
          price_data: {
            currency: "usd",
            product: HOME_ADDON_PRODUCT_ID,
            unit_amount: addOn.periodCents,
            recurring: { interval: cadence === "annual" ? "year" : "month" },
          },
        },
      ],
      proration_behavior: "none",
    });
  }

  await supabase.from("subscriptions").update({ home_size_addon_cents: addOn.periodCents }).eq("id", sub.id);
  return { addOnCents: addOn.periodCents };
}
