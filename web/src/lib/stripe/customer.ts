import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "./server";

/**
 * Returns the Stripe Customer id for this user, creating one (and
 * persisting it to profiles.stripe_customer_id) on first use. Reused across
 * both membership subscriptions and one-time booking payments.
 */
export async function getOrCreateStripeCustomerId(
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string | undefined
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    metadata: { customer_id: userId },
  });

  await createServiceClient()
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  return customer.id;
}
