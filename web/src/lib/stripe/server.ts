import Stripe from "stripe";

// Server-only Stripe client. Never import from client code.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
