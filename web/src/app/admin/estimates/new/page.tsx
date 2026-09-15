import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EstimateForm from "@/components/admin/EstimateForm";

export const metadata: Metadata = {
  title: "Admin · New Estimate",
};

export default async function NewEstimatePage() {
  const supabase = await createClient();

  const [{ data: plans }, { data: services }] = await Promise.all([
    supabase
      .from("membership_plans")
      .select("id, name, monthly_price_cents, description")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("services")
      .select("id, service_type, name, base_price_cents")
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  return (
    <div>
      <Link href="/admin/estimates" style={{ fontSize: 13, color: "#6a746c" }}>
        ← All estimates
      </Link>
      <h3 style={{ marginTop: 16, marginBottom: 20 }}>Walkthrough &amp; estimate</h3>
      <EstimateForm plans={plans ?? []} services={services ?? []} />
    </div>
  );
}
