import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { computeAllBonuses } from "@/lib/computeBonuses";
import { businessDateAnchor } from "@/lib/businessTime";

export const runtime = "nodejs";

// Triggered daily by Vercel Cron (see vercel.json). See computeBonuses.ts
// for the actual bonus logic -- this route is just the auth check + HTTP
// wrapper around it.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await computeAllBonuses(createServiceClient(), businessDateAnchor());
  return NextResponse.json(results);
}
