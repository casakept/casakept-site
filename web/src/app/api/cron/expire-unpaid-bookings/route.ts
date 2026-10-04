import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe/server";
import { expireUnpaidBookings } from "@/lib/expireUnpaidBookings";

export const runtime = "nodejs";

const ABANDONED_AFTER_MS = 60 * 60 * 1000;

// Triggered daily by Vercel Cron (see vercel.json) -- clears out checkouts
// the customer started but never paid for. Runs as a system job with no
// user session, so it uses the service-role client.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await expireUnpaidBookings(createServiceClient(), stripe, ABANDONED_AFTER_MS);
    return NextResponse.json(result);
  } catch (err) {
    console.error("expire-unpaid-bookings failed:", err);
    return NextResponse.json({ error: "Failed to expire unpaid bookings" }, { status: 500 });
  }
}
