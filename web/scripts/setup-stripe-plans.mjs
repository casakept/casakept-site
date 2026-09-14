// One-off setup script: creates a Stripe Product + recurring monthly Price
// for each membership plan that doesn't already have a stripe_price_id, and
// backfills the column. Safe to re-run — skips plans that already have one.
//
// Usage: node scripts/setup-stripe-plans.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(dir, "..", ".env.local");

for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] ??= match[2];
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: plans, error } = await supabase
  .from("membership_plans")
  .select("id, slug, name, description, monthly_price_cents, stripe_price_id")
  .order("sort_order");

if (error) throw error;

for (const plan of plans) {
  if (plan.stripe_price_id) {
    console.log(`skip ${plan.slug} — already has ${plan.stripe_price_id}`);
    continue;
  }

  const product = await stripe.products.create({
    name: plan.name,
    description: plan.description ?? undefined,
    metadata: { plan_id: plan.id, slug: plan.slug },
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: plan.monthly_price_cents,
    recurring: { interval: "month" },
    metadata: { plan_id: plan.id, slug: plan.slug },
  });

  const { error: updateError } = await supabase
    .from("membership_plans")
    .update({ stripe_price_id: price.id })
    .eq("id", plan.id);

  if (updateError) throw updateError;

  console.log(`created ${plan.slug} -> product ${product.id}, price ${price.id}`);
}

console.log("done");
